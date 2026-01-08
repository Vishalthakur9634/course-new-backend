const express = require('express');
const router = express.Router();
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const Certificate = require('../models/Certificate');
const { authenticate, requireStudent, requireCourseAccess } = require('../middleware/rbac');

// Enroll in a course (Bulletproof Version)
router.post('/enroll', authenticate, async (req, res) => {
    try {
        const { courseId, paymentId, type, force } = req.body;
        const studentId = req.user._id;

        // 0. Validate Inputs
        if (!courseId) return res.status(400).json({ message: 'Course ID is required' });

        // 1. Check if ALREADY Enrolled (Idempotency)
        const existingEnrollment = await Enrollment.findOne({ studentId, courseId });
        if (existingEnrollment) {
            return res.json({
                success: true,
                message: 'Already enrolled',
                enrollment: existingEnrollment
            });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // 2. Logic Check (Permission)
        // [SECURITY] Allow direct enrollment if: Free, Admin, Trial, OR FORCE
        const isFree = !course.price || course.price === 0;
        const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
        const isTrial = type === 'trial';
        const isForce = force === true;

        if (!isFree && !isAdmin && !isTrial && !isForce && !paymentId) {
            return res.status(400).json({ message: 'Payment required.' });
        }

        // 3. Prepare Data (with Defauls)
        // Fallback for missing instructorId to prevent crashes
        const instructorId = course.instructorId || studentId;

        // 4. Create Enrollment
        const enrollment = new Enrollment({
            studentId,
            courseId,
            instructorId: instructorId,
            enrollmentType: type === 'trial' ? 'trial' : 'full',
            progress: 0,
            enrolledAt: new Date(),
            completedVideos: [],
            notes: []
        });

        // 5. Save with Duplicate Handling
        try {
            await enrollment.save();
        } catch (saveError) {
            // If duplicate key error (race condition), just find and return existing
            if (saveError.code === 11000) {
                const found = await Enrollment.findOne({ studentId, courseId });
                return res.json(found);
            }
            throw saveError;
        }

        // 6. Update Stats (Async/Non-blocking - don't fail request if these fail)
        try {
            // Update Course
            await Course.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });

            // Update User
            await User.findByIdAndUpdate(studentId, {
                $addToSet: { // Use addToSet to prevent duplicates in array
                    enrolledCourses: {
                        courseId,
                        enrolledAt: new Date(),
                        progress: 0,
                        type: type === 'trial' ? 'trial' : 'full'
                    }
                }
            });

            // Update Instructor
            if (instructorId.toString() !== studentId.toString()) {
                await User.findByIdAndUpdate(instructorId, {
                    $inc: { 'instructorProfile.totalStudents': 1 }
                });
            }
        } catch (statsError) {
            console.error('Stats update error (ignoring):', statsError);
        }

        res.status(201).json(enrollment);

    } catch (error) {
        console.error('❌ ENROLLMENT CRITICAL ERROR:', error);
        res.status(500).json({ message: 'Error enrolling', error: error.message });
    }
});

// Get student's enrolled courses
router.get('/my-courses', authenticate, requireStudent, async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ studentId: req.user._id })
            .populate({
                path: 'courseId',
                populate: {
                    path: 'instructorId',
                    select: 'name instructorProfile.headline avatar'
                }
            })
            .populate('lastAccessedVideo', 'title')
            .sort({ lastAccessedAt: -1 });

        // Merge with User model data to catch any out-of-sync enrollments
        const userCourses = req.user.enrolledCourses || [];
        const result = [...enrollments];

        for (const uc of userCourses) {
            if (!result.some(e => e.courseId?._id?.toString() === uc.courseId?.toString())) {
                // Fetch course details if missing from Enrollment collection
                const course = await Course.findById(uc.courseId).populate('instructorId', 'name instructorProfile.headline avatar');
                if (course) {
                    result.push({
                        courseId: course,
                        progress: uc.progress || 0,
                        enrolledAt: uc.enrolledAt,
                        isFromUserModel: true // Flag for debugging
                    });
                }
            }
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching enrolled courses', error: error.message });
    }
});

// Check course access
router.get('/:courseId/access', authenticate, async (req, res) => {
    try {
        const { courseId } = req.params;

        // Super admin and admin can access
        if (['superadmin', 'admin'].includes(req.user.role)) {
            return res.json({ hasAccess: true, reason: 'admin_bypass' });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        if (req.user.role === 'instructor' && course.instructorId.toString() === req.user._id.toString()) {
            return res.json({ hasAccess: true, reason: 'course_owner' });
        }

        // Check enrollment (with fallback to User model)
        const enrollment = await Enrollment.findOne({
            studentId: req.user._id,
            courseId
        });

        if (enrollment) {
            return res.json({ hasAccess: true, reason: 'enrolled', enrollment });
        }

        // Fallback: Check user's own enrolledCourses array
        const userEnrollment = req.user.enrolledCourses?.find(c =>
            c.courseId && c.courseId.toString() === courseId
        );

        if (userEnrollment) {
            return res.json({ hasAccess: true, reason: 'user_model_sync', enrollment: userEnrollment });
        }

        res.json({ hasAccess: false });
    } catch (error) {
        res.status(500).json({ message: 'Error checking access', error: error.message });
    }
});

// Update video progress
router.put('/:courseId/progress', authenticate, requireCourseAccess, async (req, res) => {
    try {
        const { courseId } = req.params;
        const { videoId, progress, timeSpent, completed } = req.body;

        console.log(`[Progress Update] Updating for Course: ${courseId}, User: ${req.user._id}`);
        console.log(`[Progress Update] Video: ${videoId}, Completed: ${completed}`);

        const enrollment = await Enrollment.findOne({
            studentId: req.user._id,
            courseId
        });

        if (!enrollment) {
            console.error(`[Progress Update] Enrollment NOT FOUND for User ${req.user._id} and Course ${courseId}`);
            return res.status(404).json({ message: 'Enrollment not found' });
        }

        // Update last accessed
        enrollment.lastAccessedAt = new Date();
        enrollment.lastAccessedVideo = videoId;

        // Update total time spent
        if (timeSpent) {
            enrollment.totalTimeSpent += timeSpent;
        }

        // Update completed videos
        const videoIndex = enrollment.completedVideos.findIndex(
            cv => cv.videoId.toString() === videoId
        );

        if (completed && videoIndex === -1) {
            enrollment.completedVideos.push({
                videoId,
                completedAt: new Date(),
                timeSpent: timeSpent || 0
            });
        } else if (videoIndex !== -1) {
            enrollment.completedVideos[videoIndex].timeSpent += timeSpent || 0;
        }

        // Calculate overall progress
        const course = await Course.findById(courseId).populate('videos');
        const totalVideos = course.videos.length;
        const completedCount = new Set(enrollment.completedVideos.map(v => v.videoId.toString())).size;
        enrollment.progress = totalVideos > 0 ? Math.min(100, (completedCount / totalVideos) * 100) : 0;

        await enrollment.save();

        // Update user's watch history
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { watchHistory: { videoId, courseId } }
        });

        await User.findByIdAndUpdate(req.user._id, {
            $push: {
                watchHistory: {
                    videoId,
                    courseId,
                    progress: progress || 0,
                    completed,
                    lastWatched: new Date()
                }
            }
        });

        res.json(enrollment);
    } catch (error) {
        res.status(500).json({ message: 'Error updating progress', error: error.message });
    }
});

// Mark course as complete
router.post('/:courseId/complete', authenticate, requireCourseAccess, async (req, res) => {
    try {
        const { courseId } = req.params;

        const enrollment = await Enrollment.findOne({
            studentId: req.user._id,
            courseId
        }).populate('courseId');

        if (!enrollment) {
            return res.status(404).json({ message: 'Enrollment not found' });
        }

        if (enrollment.isCompleted) {
            return res.status(400).json({ message: 'Course already completed' });
        }

        // Mark as completed
        enrollment.isCompleted = true;
        enrollment.completedAt = new Date();
        enrollment.progress = 100;

        // Generate certificate if enabled
        if (enrollment.courseId.certificateEnabled) {
            const certificate = await Certificate.create({
                userId: req.user._id,
                courseId,
                instructorId: enrollment.courseId.instructorId,
                certificateNumber: `CERT-${Date.now()}-${req.user._id.toString().slice(-6)}`,
                issueDate: new Date()
            });

            enrollment.certificateIssued = true;
            enrollment.certificateId = certificate._id;

            // Add to user's certificates
            await User.findByIdAndUpdate(req.user._id, {
                $push: { certificates: certificate._id }
            });

            await Notification.create({
                userId: req.user._id,
                type: 'certificate_issued',
                title: 'Certificate Issued!',
                message: `Congratulations! Your certificate for "${enrollment.courseId.title}" is ready`,
                link: `/certificates/${certificate._id}`,
                priority: 'high'
            });
        }

        await enrollment.save();

        // Notify instructor
        await Notification.create({
            userId: enrollment.courseId.instructorId,
            type: 'course_completed',
            title: 'Student Completed Course',
            message: `${req.user.name} completed your course "${enrollment.courseId.title}"`,
            link: `/instructor/students`,
            priority: 'low'
        });

        res.json({ message: 'Course completed', enrollment });
    } catch (error) {
        res.status(500).json({ message: 'Error completing course', error: error.message });
    }
});

// Get enrollment details
router.get('/:courseId/details', authenticate, requireCourseAccess, async (req, res) => {
    try {
        const enrollment = await Enrollment.findOne({
            studentId: req.user._id,
            courseId: req.params.courseId
        })
            .populate('courseId')
            .populate('lastAccessedVideo')
            .populate('certificateId');

        if (!enrollment) {
            return res.status(404).json({ message: 'Enrollment not found' });
        }

        res.json(enrollment);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching enrollment details', error: error.message });
    }
});

// Add note to video
router.post('/:courseId/notes', authenticate, requireCourseAccess, async (req, res) => {
    try {
        const { videoId, timestamp, content } = req.body;

        const enrollment = await Enrollment.findOne({
            studentId: req.user._id,
            courseId: req.params.courseId
        });

        if (!enrollment) {
            return res.status(404).json({ message: 'Enrollment not found' });
        }

        enrollment.notes.push({
            videoId,
            timestamp,
            content,
            createdAt: new Date()
        });

        await enrollment.save();

        res.status(201).json({ message: 'Note added', note: enrollment.notes[enrollment.notes.length - 1] });
    } catch (error) {
        res.status(500).json({ message: 'Error adding note', error: error.message });
    }
});

// Get notes for a course
router.get('/:courseId/notes', authenticate, requireCourseAccess, async (req, res) => {
    try {
        const enrollment = await Enrollment.findOne({
            studentId: req.user._id,
            courseId: req.params.courseId
        }).populate('notes.videoId', 'title');

        if (!enrollment) {
            return res.status(404).json({ message: 'Enrollment not found' });
        }

        res.json(enrollment.notes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notes', error: error.message });
    }
});

// Get leaderboard - top students by enrollment and completion
router.get('/leaderboard', async (req, res) => {
    try {
        const enrollments = await Enrollment.aggregate([
            {
                $match: {
                    studentId: { $ne: null }
                }
            },
            {
                $group: {
                    _id: '$studentId',
                    coursesEnrolled: { $sum: 1 },
                    coursesCompleted: {
                        $sum: {
                            $cond: [{ $gte: ['$progress', 100] }, 1, 0]
                        }
                    },
                    totalProgress: { $avg: '$progress' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            {
                $unwind: '$student'
            },
            {
                $project: {
                    _id: 1,
                    userId: {
                        _id: '$student._id',
                        name: '$student.name',
                        avatar: '$student.avatar'
                    },
                    coursesEnrolled: 1,
                    coursesCompleted: 1,
                    points: { $multiply: ['$coursesCompleted', 100] }
                }
            },
            {
                $sort: { points: -1, coursesCompleted: -1 }
            },
            {
                $limit: 50
            }
        ]);

        res.json(enrollments);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Error fetching leaderboard', error: error.message });
    }
});

module.exports = router;
