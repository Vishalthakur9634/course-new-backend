const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const User = require('../models/User');
const Video = require('../models/Video');
const Enrollment = require('../models/Enrollment');
const Payment = require('../models/Payment');
const { authenticate, requireInstructor, requireCourseOwnership } = require('../middleware/rbac');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processVideo } = require('../utils/videoProcessor');
const mongoose = require('mongoose');

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/temp';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/webp',
            'video/mp4', 'video/webm', 'video/ogg',
            'application/pdf'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, MP4, WEBM, OGG and PDF are allowed.'));
        }
    }
});

// Get instructor dashboard stats
router.get('/dashboard', authenticate, requireInstructor, async (req, res) => {
    try {
        const instructorId = req.user._id;

        // Get all courses by instructor
        const courses = await Course.find({ instructorId }).populate('videos');

        // Get enrollments
        const enrollments = await Enrollment.find({ instructorId });
        const totalStudents = enrollments.length;
        const uniqueStudents = [...new Set(enrollments.map(e => e.studentId.toString()))].length;

        // Get payments
        const payments = await Payment.find({ instructorId, status: 'completed' });
        const totalRevenue = payments.reduce((sum, p) => sum + p.instructorEarning, 0);
        const pendingPayout = payments
            .filter(p => p.payoutStatus === 'pending')
            .reduce((sum, p) => sum + p.instructorEarning, 0);

        // Recent enrollments (last 10)
        const recentEnrollments = await Enrollment.find({ instructorId })
            .sort({ enrolledAt: -1 })
            .limit(10)
            .populate('studentId', 'name email avatar')
            .populate('courseId', 'title thumbnail');

        // Course stats
        const courseStats = courses.map(course => ({
            _id: course._id,
            title: course.title,
            thumbnail: course.thumbnail,
            enrollmentCount: course.enrollmentCount,
            revenue: course.totalRevenue,
            rating: course.rating,
            approvalStatus: course.approvalStatus,
            isPublished: course.isPublished,
            videoCount: course.videos.length
        }));

        res.json({
            totalCourses: courses.length,
            publishedCourses: courses.filter(c => c.isPublished).length,
            pendingCourses: courses.filter(c => c.approvalStatus === 'pending').length,
            totalStudents: uniqueStudents,
            totalEnrollments: totalStudents,
            totalRevenue,
            pendingPayout,
            courses: courseStats,
            recentEnrollments: recentEnrollments.map(e => ({
                ...e.toObject(),
                userId: e.studentId // Alias for frontend compatibility
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard', error: error.message });
    }
});

// Get instructor's courses
router.get('/courses', authenticate, requireInstructor, async (req, res) => {
    try {
        const courses = await Course.find({ instructorId: req.user._id })
            .populate('videos')
            .sort({ createdAt: -1 });
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching courses', error: error.message });
    }
});

// Create new course
router.post('/courses', authenticate, requireInstructor, upload.single('thumbnail'), async (req, res) => {
    try {
        let thumbnail = '';
        if (req.file) {
            // Move thumbnail to permanent location
            const courseId = new mongoose.Types.ObjectId();
            const courseDir = path.join('uploads', 'courses', courseId.toString());
            if (!fs.existsSync(courseDir)) fs.mkdirSync(courseDir, { recursive: true });

            const ext = path.extname(req.file.originalname);
            const newPath = path.join(courseDir, `thumbnail${ext}`);
            fs.copyFileSync(req.file.path, newPath);
            fs.unlinkSync(req.file.path);

            thumbnail = `/uploads/courses/${courseId}/${path.basename(newPath)}`;

            // We need to use this ID for the new course
            req.body._id = courseId;
        }

        const courseData = {
            ...req.body,
            thumbnail, // Use the processed thumbnail path
            instructorId: req.user._id,
            approvalStatus: 'draft',
            isPublished: false
        };

        // If we generated an ID, use it
        const course = new Course(courseData);
        await course.save();

        // Update instructor stats
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { 'instructorProfile.totalCourses': 1 }
        });

        res.status(201).json(course);
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ message: 'Error creating course', error: error.message });
    }
});

// Update course
router.put('/courses/:id', authenticate, requireInstructor, requireCourseOwnership, async (req, res) => {
    try {
        const { title, subtitle, description, price, discountPrice, category, subcategory,
            level, language, tags, requirements, learningObjectives, targetAudience,
            thumbnail, previewVideo, allowComments, allowReviews, certificateEnabled } = req.body;

        const course = await Course.findByIdAndUpdate(
            req.params.id,
            {
                title, subtitle, description, price, discountPrice, category, subcategory,
                level, language, tags, requirements, learningObjectives, targetAudience,
                thumbnail, previewVideo, allowComments, allowReviews, certificateEnabled
            },
            { new: true }
        );

        res.json(course);
    } catch (error) {
        res.status(500).json({ message: 'Error updating course', error: error.message });
    }
});

// Submit course for approval
router.post('/courses/:id/submit', authenticate, requireInstructor, requireCourseOwnership, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id).populate('videos');

        if (course.videos.length === 0) {
            return res.status(400).json({ message: 'Cannot submit course without videos' });
        }

        course.approvalStatus = 'pending';
        await course.save();

        // Create notification for super admin
        const Notification = require('../models/Notification');
        const superAdmins = await User.find({ role: 'superadmin' });

        for (const admin of superAdmins) {
            await Notification.create({
                userId: admin._id,
                type: 'course_published',
                title: 'New Course Pending Approval',
                message: `${req.user.name} submitted "${course.title}" for approval`,
                link: `/admin/courses/${course._id}`,
                priority: 'high'
            });
        }

        res.json({ message: 'Course submitted for approval', course });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting course', error: error.message });
    }
});

// Publish/Unpublish course
router.patch('/courses/:id/publish', authenticate, requireInstructor, requireCourseOwnership, async (req, res) => {
    try {
        const course = req.course;

        if (course.approvalStatus !== 'approved') {
            return res.status(400).json({ message: 'Course must be approved before publishing' });
        }

        course.isPublished = !course.isPublished;
        if (course.isPublished && !course.publishedAt) {
            course.publishedAt = new Date();
        }
        await course.save();

        res.json({ message: course.isPublished ? 'Course published' : 'Course unpublished', course });
    } catch (error) {
        res.status(500).json({ message: 'Error toggling publish status', error: error.message });
    }
});

// Delete course
router.delete('/courses/:id', authenticate, requireInstructor, requireCourseOwnership, async (req, res) => {
    try {
        // Delete all videos
        const course = await Course.findById(req.params.id).populate('videos');
        for (const video of course.videos) {
            await Video.findByIdAndDelete(video._id);
            // Delete video files
            const videoDir = path.join(__dirname, '../uploads/courses', req.params.id, video._id.toString());
            if (fs.existsSync(videoDir)) {
                fs.rmSync(videoDir, { recursive: true, force: true });
            }
        }

        await Course.findByIdAndDelete(req.params.id);

        // Update instructor stats
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { 'instructorProfile.totalCourses': -1 }
        });

        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting course', error: error.message });
    }
});

// Upload video to course
router.post('/courses/:courseId/videos', authenticate, requireInstructor, requireCourseOwnership, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'notePdf', maxCount: 1 }]), async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, description, summary } = req.body;

        const videoFile = req.files['video'] ? req.files['video'][0] : null;
        const notePdfFile = req.files['notePdf'] ? req.files['notePdf'][0] : null;

        if (!videoFile) return res.status(400).json({ message: 'No video file uploaded' });

        const videoId = new mongoose.Types.ObjectId();
        const outputDir = path.join('uploads', 'courses', courseId, videoId.toString());

        // Process video (HLS)
        const masterPlaylistPath = await processVideo(videoFile.path, outputDir, videoId);
        const videoUrl = `/uploads/courses/${courseId}/${videoId}/master.m3u8`;

        let notePdfUrl = '';
        if (notePdfFile) {
            // Move PDF to the same directory
            const pdfDest = path.join(outputDir, 'notes.pdf');
            fs.copyFileSync(notePdfFile.path, pdfDest);
            fs.unlinkSync(notePdfFile.path); // Remove temp file
            notePdfUrl = `/uploads/courses/${courseId}/${videoId}/notes.pdf`;
        }

        const video = new Video({
            _id: videoId,
            title,
            description,
            summary,
            videoUrl,
            notePdf: notePdfUrl,
            courseId,
            qualities: ['1080p', '720p', '480p', '360p', '144p']
        });

        await video.save();
        await Course.findByIdAndUpdate(courseId, {
            $push: { videos: video._id }
        });

        // Cleanup temp video file
        if (fs.existsSync(videoFile.path)) {
            fs.unlinkSync(videoFile.path);
        }

        res.status(201).json(video);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error uploading video', error: error.message });
    }
});

// Delete video
router.delete('/courses/:courseId/videos/:videoId', authenticate, requireInstructor, requireCourseOwnership, async (req, res) => {
    try {
        const { courseId, videoId } = req.params;

        await Course.findByIdAndUpdate(courseId, {
            $pull: { videos: videoId }
        });

        await Video.findByIdAndDelete(videoId);

        const videoDir = path.join(__dirname, '../uploads/courses', courseId, videoId);
        if (fs.existsSync(videoDir)) {
            fs.rmSync(videoDir, { recursive: true, force: true });
        }

        res.json({ message: 'Video deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting video', error: error.message });
    }
});

// Get enrolled students
router.get('/students', authenticate, requireInstructor, async (req, res) => {
    try {
        const { courseId } = req.query;

        let query = { instructorId: req.user._id };
        if (courseId) query.courseId = courseId;

        const enrollments = await Enrollment.find(query)
            .populate('studentId', 'name email avatar')
            .populate('courseId', 'title thumbnail')
            .sort({ enrolledAt: -1 });

        res.json(enrollments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students', error: error.message });
    }
});

// Get earnings
router.get('/earnings', authenticate, requireInstructor, async (req, res) => {
    try {
        const payments = await Payment.find({ instructorId: req.user._id })
            .populate('courseId', 'title')
            .populate('studentId', 'name email')
            .sort({ createdAt: -1 });

        const total = payments
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + p.instructorEarning, 0);

        const pending = payments
            .filter(p => p.status === 'completed' && p.payoutStatus === 'pending')
            .reduce((sum, p) => sum + p.instructorEarning, 0);

        const withdrawn = payments
            .filter(p => p.payoutStatus === 'completed')
            .reduce((sum, p) => sum + p.instructorEarning, 0);

        res.json({
            summary: { total, pending, withdrawn },
            payments: payments.map(p => ({
                _id: p._id,
                course: p.courseId?.title || 'Unknown',
                student: p.studentId?.name || 'Unknown',
                amount: p.amount,
                instructorEarning: p.instructorEarning,
                platformFee: p.platformFee,
                status: p.status,
                payoutStatus: p.payoutStatus,
                createdAt: p.createdAt
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching earnings', error: error.message });
    }
});

// Update instructor profile
router.put('/profile', authenticate, requireInstructor, async (req, res) => {
    try {
        const { headline, expertise, experience, socialLinks, bio, phone, payoutDetails } = req.body;

        const updateData = {};
        if (headline !== undefined) updateData['instructorProfile.headline'] = headline;
        if (expertise !== undefined) updateData['instructorProfile.expertise'] = expertise;
        if (experience !== undefined) updateData['instructorProfile.experience'] = experience;
        if (socialLinks !== undefined) updateData['instructorProfile.socialLinks'] = socialLinks;
        if (bio !== undefined) updateData.bio = bio;
        if (phone !== undefined) updateData.phone = phone;
        if (payoutDetails !== undefined) updateData.payoutDetails = payoutDetails;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
});

// Get generic analytics for all instructor courses
router.get('/analytics', authenticate, requireInstructor, async (req, res) => {
    try {
        const instructorId = req.user._id;
        const courses = await Course.find({ instructorId });
        const courseIds = courses.map(c => c._id);

        const enrollments = await Enrollment.find({ courseId: { $in: courseIds } });

        // Enrollment trend (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const enrollmentTrend = enrollments
            .filter(e => e.enrolledAt >= thirtyDaysAgo)
            .reduce((acc, e) => {
                const date = e.enrolledAt.toISOString().split('T')[0];
                acc[date] = (acc[date] || 0) + 1;
                return acc;
            }, {});

        // Revenue trend (last 30 days)
        const payments = await Payment.find({
            instructorId,
            status: 'completed',
            createdAt: { $gte: thirtyDaysAgo }
        });

        const revenueTrend = payments.reduce((acc, p) => {
            const date = p.createdAt.toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + p.instructorEarning;
            return acc;
        }, {});

        // Helper to sort object by keys (dates)
        const sortTrend = (obj) => Object.entries(obj)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, value]) => ({ month, [Object.keys(obj)[0] === 'enrollmentTrend' ? 'enrollments' : (typeof value === 'number' ? 'revenue' : 'enrollments')]: value }));

        // Refined trend calculation for better consistency
        const sortedEnrollments = Object.entries(enrollmentTrend)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, count]) => ({ month, enrollments: count }));

        const sortedRevenue = Object.entries(revenueTrend)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, revenue]) => ({ month, revenue }));

        res.json({
            enrollmentTrend: sortedEnrollments,
            revenueTrend: sortedRevenue,
            topCourses: courses
                .sort((a, b) => b.enrollmentCount - a.enrollmentCount)
                .slice(0, 5)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching analytics', error: error.message });
    }
});

// Get detailed analytics for a course
router.get('/analytics/:courseId', authenticate, requireInstructor, requireCourseOwnership, async (req, res) => {
    try {
        const { courseId } = req.params;

        const enrollments = await Enrollment.find({ courseId });
        const payments = await Payment.find({ courseId, status: 'completed' });
        const course = await Course.findById(courseId).populate('videos');

        // Video completion stats
        const videoStats = course.videos.map(video => {
            const completedCount = enrollments.filter(e =>
                e.completedVideos.some(cv => cv.videoId.toString() === video._id.toString())
            ).length;

            return {
                videoId: video._id,
                title: video.title,
                completedCount,
                completionRate: enrollments.length > 0 ? (completedCount / enrollments.length) * 100 : 0
            };
        });

        // Enrollment trend (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const enrollmentTrend = enrollments
            .filter(e => e.enrolledAt >= thirtyDaysAgo)
            .reduce((acc, e) => {
                const date = e.enrolledAt.toISOString().split('T')[0];
                acc[date] = (acc[date] || 0) + 1;
                return acc;
            }, {});

        res.json({
            course: {
                title: course.title,
                enrollmentCount: course.enrollmentCount,
                rating: course.rating,
                totalRevenue: course.totalRevenue
            },
            videoStats,
            enrollmentTrend,
            completionRate: enrollments.filter(e => e.isCompleted).length / (enrollments.length || 1) * 100,
            averageProgress: enrollments.reduce((sum, e) => sum + e.progress, 0) / (enrollments.length || 1)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching analytics', error: error.message });
    }
});

module.exports = router;
