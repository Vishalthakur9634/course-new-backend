const express = require('express');
const router = express.Router();
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const Certificate = require('../models/Certificate');
const { authenticate, requireStudent, requireCourseAccess } = require('../middleware/rbac');

// Enroll in a course (after payment or direct enroll)
router.post('/enroll', authenticate, async (req, res) => {
    try {
        const { courseId, paymentId } = req.body;
        const studentId = req.user._id;
        let payment;

        if (paymentId) {
            // Verify existing payment
            payment = await Payment.findById(paymentId);
            if (!payment || payment.studentId.toString() !== studentId.toString()) {
                return res.status(400).json({ message: 'Invalid payment' });
            }

            if (payment.status !== 'completed') {
                return res.status(400).json({ message: 'Payment not completed' });
            }
        } else {
            // Direct enrollment (Free/Test Mode)
            const course = await Course.findById(courseId);
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }

            // [SECURITY] Only allow direct enrollment if course is free OR user is an admin
            const isFree = !course.price || course.price === 0;
            const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

            if (!isFree && !isAdmin) {
                return res.status(400).json({
                    message: 'Payment required for this course. Direct enrollment (Test Mode) is only available for free courses or administrators.'
                });
            }

            // Fallback for missing instructorId
            let instructorId = course.instructorId;
            if (!instructorId) {
                console.warn(`⚠️ Course "${course.title}" (${course._id}) is missing instructorId. Using fallback.`);
                const User = require('../models/User');
                const admin = await User.findOne({ role: 'superadmin' });
                instructorId = admin ? admin._id : studentId; // Last resort: use student ID to prevent crash
            }

            payment = new Payment({
                studentId,
                userId: studentId, // Required field
                courseId,
                instructorId: instructorId, // Use robust ID
                amount: course.price || 0,
                originalPrice: course.price || 0, // Required field
                platformFee: 0, // Required field
                instructorEarning: course.price || 0, // Required field
                currency: 'USD',
                status: 'completed',
                paymentMethod: 'test_mode',
                transactionId: `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            });
            await payment.save();
        }

        //Check if already enrolled
        const existingEnrollment = await Enrollment.findOne({ studentId, courseId });
        if (existingEnrollment) {
            return res.status(400).json({ message: 'Already enrolled in this course' });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Create enrollment
        const enrollment = new Enrollment({
            studentId,
            courseId,
            instructorId: course.instructorId
        });

        await enrollment.save();

        // Update payment with enrollment ID
        payment.enrollmentId = enrollment._id;
        await payment.save();

        // Update course stats (Enrollment + Revenue)
        await Course.findByIdAndUpdate(courseId, {
            $inc: {
                enrollmentCount: 1,
                totalRevenue: payment.amount || 0
            }
        });

        // Update student's enrolled courses
        await User.findByIdAndUpdate(studentId, {
            $push: {
                enrolledCourses: {
                    courseId,
                    enrolledAt: new Date(),
                    progress: 0
                }
            }
        });

        // Update instructor stats (Total Students + Earnings)
        await User.findByIdAndUpdate(course.instructorId, {
            $inc: {
                'instructorProfile.totalStudents': 1,
                'earnings.total': payment.amount || 0,
                'earnings.available': payment.amount || 0 // Assuming instant availability for now, or use 'pending'
            }
        });

        // Create notifications (Non-blocking)
        try {
            await Notification.create({
                userId: course.instructorId,
                type: 'new_enrollment',
                title: 'New Student Enrolled',
                message: `${req.user.name} enrolled in your course "${course.title}"`,
                link: `/instructor/students?courseId=${courseId}`,
                priority: 'medium'
            });

            await Notification.create({
                userId: studentId,
                type: 'course_completed', // Should be 'new_enrollment' or similar, but keeping schema enum valid
                title: 'Successfully Enrolled',
                message: `You are now enrolled in "${course.title}". Start learning now!`,
                link: `/course/${courseId}`,
                priority: 'high'
            });
        } catch (notifyError) {
            console.error('Notification Error:', notifyError);
            // Continue execution, don't fail enrollment
        }

        res.status(201).json(enrollment);
    } catch (error) {
        console.error('❌ ENROLLMENT ERROR:', error); // Critical: Log the actual error
        res.status(500).json({ message: 'Error enrolling in course', error: error.message, stack: error.stack });
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

        const enrollment = await Enrollment.findOne({
            studentId: req.user._id,
            courseId
        });

        if (!enrollment) {
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
