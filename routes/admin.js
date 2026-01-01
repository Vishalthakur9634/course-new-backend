const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const Video = require('../models/Video');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Get admin statistics
router.get('/stats', async (req, res) => {
    try {
        const totalCourses = await Course.countDocuments();
        const totalVideos = await Video.countDocuments();
        const totalUsers = await User.countDocuments();

        // Detailed Statuses
        const activeCourses = await Course.countDocuments({ approvalStatus: 'approved' });
        const pendingCourses = await Course.countDocuments({ approvalStatus: 'pending' });
        const draftCourses = await Course.countDocuments({ approvalStatus: 'draft' });

        // User Distribution
        const students = await User.countDocuments({ role: 'student' });
        const instructors = await User.countDocuments({ role: 'instructor' });
        const admins = await User.countDocuments({ role: { $in: ['admin', 'superadmin'] } });

        // Calculate total storage (approximate)
        const uploadsDir = path.join(__dirname, '../uploads/courses');
        let totalSize = 0;

        try {
            if (fs.existsSync(uploadsDir)) {
                const calculateDirSize = (dirPath) => {
                    let size = 0;
                    try {
                        const files = fs.readdirSync(dirPath);
                        files.forEach(file => {
                            try {
                                const filePath = path.join(dirPath, file);
                                const stats = fs.statSync(filePath);
                                if (stats.isDirectory()) {
                                    size += calculateDirSize(filePath);
                                } else {
                                    size += stats.size;
                                }
                            } catch (fileError) {
                                console.warn('Could not access file:', file);
                            }
                        });
                    } catch (dirError) {
                        console.warn('Could not read directory:', dirPath);
                    }
                    return size;
                };
                totalSize = calculateDirSize(uploadsDir);
            }
        } catch (storageError) {
            console.error('Error calculating storage:', storageError.message);
        }

        const totalStorageGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);

        // Trend Data (Last 6 Months)
        const Enrollment = require('../models/Enrollment');
        const Payment = require('../models/Payment');
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const enrollmentTrend = await Enrollment.aggregate([
            { $match: { enrolledAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$enrolledAt' },
                        month: { $month: '$enrolledAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const revenueTrend = await Payment.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo }, status: 'completed' } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    revenue: { $sum: '$amount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        res.json({
            totalCourses,
            totalVideos,
            totalUsers,
            totalStorageGB,
            activeCourses,
            pendingCourses,
            draftCourses,
            usersByRole: {
                student: students,
                instructor: instructors,
                admin: admins
            },
            enrollmentTrend,
            revenueTrend
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
});

// Get all users (admin only in production, but open for setup)
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
});

// Make user admin
router.post('/make-admin/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.role = 'admin';
        await user.save();

        res.json({ message: 'User is now admin', user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
});

// Delete user
router.delete('/users/:userId', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
});

// Delete course
router.delete('/courses/:courseId', async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Delete all videos associated with this course
        const videos = await Video.find({ courseId: course._id });

        for (const video of videos) {
            // Delete video files from disk
            const videoPath = video.videoUrl.replace('/uploads/', '');
            const fullPath = path.join(__dirname, '../uploads', videoPath);
            const videoDir = path.dirname(fullPath);

            if (fs.existsSync(videoDir)) {
                fs.rmSync(videoDir, { recursive: true, force: true });
            }

            // Delete video from database
            await Video.findByIdAndDelete(video._id);
        }

        // Delete course from database
        await Course.findByIdAndDelete(course._id);

        // Delete course directory
        const courseDir = path.join(__dirname, '../uploads/courses', req.params.courseId);
        if (fs.existsSync(courseDir)) {
            fs.rmSync(courseDir, { recursive: true, force: true });
        }

        res.json({ message: 'Course and all associated videos deleted successfully' });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({ message: 'Error deleting course', error: error.message });
    }
});

// Delete video
router.delete('/courses/:courseId/videos/:videoId', async (req, res) => {
    try {
        const { courseId, videoId } = req.params;

        // Find the video
        const video = await Video.findById(videoId);
        if (!video) return res.status(404).json({ message: 'Video not found' });

        // Delete video files from disk
        const videoPath = video.videoUrl.replace('/uploads/', '');
        const fullPath = path.join(__dirname, '../uploads', videoPath);
        const videoDir = path.dirname(fullPath);

        console.log('Deleting video directory:', videoDir);

        if (fs.existsSync(videoDir)) {
            fs.rmSync(videoDir, { recursive: true, force: true });
            console.log('Video files deleted successfully');
        }

        // Remove video reference from course
        await Course.findByIdAndUpdate(courseId, {
            $pull: { videos: videoId }
        });

        // Delete video from database
        await Video.findByIdAndDelete(videoId);

        res.json({ message: 'Video deleted successfully' });
    } catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).json({ message: 'Error deleting video', error: error.message });
    }
});

// Get Payment History
router.get('/payments', async (req, res) => {
    try {
        const Payment = require('../models/Payment');
        const payments = await Payment.find()
            .populate('userId', 'name email')
            .populate('courseId', 'title')
            .sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payments', error: error.message });
    }
});

// Get all reviews
router.get('/reviews', async (req, res) => {
    try {
        const Review = require('../models/Review');
        const reviews = await Review.find()
            .populate('user', 'name email')
            .populate('course', 'title')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ message: 'Error fetching reviews', error: error.message });
    }
});

// Delete review
router.delete('/reviews/:reviewId', async (req, res) => {
    try {
        const Review = require('../models/Review');
        const review = await Review.findByIdAndDelete(req.params.reviewId);
        if (!review) return res.status(404).json({ message: 'Review not found' });
        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ message: 'Error deleting review', error: error.message });
    }
});

// Get all announcements
router.get('/announcements', async (req, res) => {
    try {
        const Announcement = require('../models/Announcement');
        const announcements = await Announcement.find()
            .populate('courseId', 'title')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        res.json(announcements);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ message: 'Error fetching announcements', error: error.message });
    }
});

// Create announcement
router.post('/announcements', async (req, res) => {
    try {
        const Announcement = require('../models/Announcement');
        const { courseId, title, message, priority } = req.body;

        const announcement = new Announcement({
            courseId,
            title,
            message,
            priority: priority || 'medium',
            createdBy: req.user?.id // If auth is implemented
        });

        await announcement.save();

        // Populate for return
        const populated = await Announcement.findById(announcement._id)
            .populate('courseId', 'title')
            .populate('createdBy', 'name email');

        res.status(201).json(populated);
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ message: 'Error creating announcement', error: error.message });
    }
});

// Delete announcement
router.delete('/announcements/:announcementId', async (req, res) => {
    try {
        const Announcement = require('../models/Announcement');
        const announcement = await Announcement.findByIdAndDelete(req.params.announcementId);
        if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
        res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ message: 'Error deleting announcement', error: error.message });
    }
});

// Get all certificates
router.get('/certificates', async (req, res) => {
    try {
        const Certificate = require('../models/Certificate');
        const certificates = await Certificate.find()
            .populate('userId', 'name email')
            .populate('courseId', 'title')
            .sort({ issueDate: -1 });
        res.json(certificates);
    } catch (error) {
        console.error('Error fetching certificates:', error);
        res.status(500).json({ message: 'Error fetching certificates', error: error.message });
    }
});

// Course Sponsorship Management

// Update sponsorship status (Approve/Reject)
router.put('/courses/:id/sponsor-status', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const { status, sponsorshipType, sponsorshipDiscount, sponsorshipStartDate, sponsorshipEndDate } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        course.sponsorship.requestStatus = status;

        if (status === 'approved') {
            course.sponsorship.isSponsored = true;
            course.sponsorship.sponsoredBy = req.user?.id;
            course.sponsorship.sponsorshipType = sponsorshipType || 'discounted';
            course.sponsorship.sponsorshipDiscount = sponsorshipDiscount || 0;
            course.sponsorship.sponsorshipStartDate = sponsorshipStartDate || new Date();
            course.sponsorship.sponsorshipEndDate = sponsorshipEndDate;
        } else {
            // If rejected, ensure it's not marked as sponsored
            course.sponsorship.isSponsored = false;
        }

        await course.save();

        res.json({ message: `Sponsorship ${status} successfully`, course });
    } catch (error) {
        console.error('Error updating sponsorship status:', error);
        res.status(500).json({ message: 'Error updating sponsorship status', error: error.message });
    }
});

// Sponsor a course (Directly)
router.post('/courses/:id/sponsor', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const { sponsorshipType, sponsorshipDiscount, sponsorshipStartDate, sponsorshipEndDate, sponsorshipReason } = req.body;

        if (!course.sponsorship) {
            course.sponsorship = {};
        }

        course.sponsorship.isSponsored = true;
        course.sponsorship.requestStatus = 'approved'; // Auto-approve direct sponsorship
        course.sponsorship.sponsoredBy = req.user?.id; // Admin user ID
        course.sponsorship.sponsorshipType = sponsorshipType || 'discounted';
        course.sponsorship.sponsorshipDiscount = sponsorshipDiscount || 100; // Default to 100% (free)
        course.sponsorship.sponsorshipStartDate = sponsorshipStartDate || new Date();
        course.sponsorship.sponsorshipEndDate = sponsorshipEndDate;
        course.sponsorship.sponsorshipReason = sponsorshipReason || '';

        await course.save();

        const populated = await Course.findById(course._id)
            .populate('instructorId', 'name email')
            .populate('sponsorship.sponsoredBy', 'name email');

        res.json({ message: 'Course sponsored successfully', course: populated });
    } catch (error) {
        console.error('Error sponsoring course:', error);
        res.status(500).json({ message: 'Error sponsoring course', error: error.message });
    }
});

// Remove sponsorship from a course
router.delete('/courses/:id/sponsor', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        if (!course.sponsorship) {
            course.sponsorship = {};
        }

        course.sponsorship.isSponsored = false;
        course.sponsorship.sponsoredBy = null;
        course.sponsorship.sponsorshipType = 'discounted';
        course.sponsorship.sponsorshipDiscount = 0;
        course.sponsorship.sponsorshipStartDate = null;
        course.sponsorship.sponsorshipEndDate = null;
        course.sponsorship.sponsorshipReason = '';

        await course.save();

        res.json({ message: 'Sponsorship removed successfully', course });
    } catch (error) {
        console.error('Error removing sponsorship:', error);
        res.status(500).json({ message: 'Error removing sponsorship', error: error.message });
    }
});

// Get all sponsored courses
router.get('/sponsored-courses', async (req, res) => {
    try {
        const sponsoredCourses = await Course.find({ 'sponsorship.isSponsored': true })
            .populate('instructorId', 'name email')
            .populate('sponsorship.sponsoredBy', 'name email')
            .sort({ 'sponsorship.sponsorshipStartDate': -1 });

        res.json(sponsoredCourses);
    } catch (error) {
        console.error('Error fetching sponsored courses:', error);
        res.status(500).json({ message: 'Error fetching sponsored courses', error: error.message });
    }
});

// Update course approval status
router.put('/courses/:id/approve', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const { approvalStatus, rejectionReason } = req.body;

        course.approvalStatus = approvalStatus;
        if (rejectionReason) course.rejectionReason = rejectionReason;

        if (approvalStatus === 'approved') {
            course.isPublished = true;
            course.publishedAt = new Date();
        }

        await course.save();

        res.json({ message: 'Course status updated successfully', course });
    } catch (error) {
        console.error('Error updating course approval:', error);
        res.status(500).json({ message: 'Error updating course approval', error: error.message });
    }
});

// Ban/Unban user
router.put('/users/:id/ban', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { isBanned, banReason } = req.body;

        user.isBanned = isBanned;
        user.banReason = banReason || '';

        await user.save();

        res.json({ message: `User ${isBanned ? 'banned' : 'unbanned'} successfully`, user });
    } catch (error) {
        console.error('Error updating user ban status:', error);
        res.status(500).json({ message: 'Error updating user ban status', error: error.message });
    }
});

// Update user role
router.put('/users/:id/role', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { role } = req.body;

        if (!['student', 'instructor', 'superadmin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Enforce Super Admin Exclusivity
        if (role === 'superadmin' && user.email !== 'vishalthakur732007@gmail.com') {
            return res.status(403).json({ message: 'Only vishalthakur732007@gmail.com can be Super Admin.' });
        }

        user.role = role;

        if (role === 'instructor') {
            user.isInstructorApproved = true;
        }

        await user.save();

        res.json({ message: 'User role updated successfully', user });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ message: 'Error updating user role', error: error.message });
    }
});

// ===== ANNOUNCEMENT MANAGEMENT =====

// Get all announcements
router.get('/announcements', async (req, res) => {
    try {
        const Announcement = require('../models/Announcement');
        const announcements = await Announcement.find()
            .populate('courseId', 'title')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        res.json(announcements);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create announcement
router.post('/announcements', async (req, res) => {
    try {
        const Announcement = require('../models/Announcement');
        const announcement = new Announcement({
            ...req.body,
            createdBy: req.user.id
        });
        await announcement.save();
        const populated = await Announcement.findById(announcement._id)
            .populate('courseId', 'title')
            .populate('createdBy', 'name email');
        res.status(201).json(populated);
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete announcement
router.delete('/announcements/:id', async (req, res) => {
    try {
        const Announcement = require('../models/Announcement');
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== PAYMENT MANAGEMENT =====

// Get all payments
router.get('/payments', async (req, res) => {
    try {
        const Payment = require('../models/Payment');
        const payments = await Payment.find()
            .populate('userId', 'name email')
            .populate('courseId', 'title price')
            .sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== ANALYTICS =====

// Get detailed analytics
router.get('/analytics', async (req, res) => {
    try {
        const Enrollment = require('../models/Enrollment');
        const Payment = require('../models/Payment');

        // Get enrollments by month (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const enrollmentTrend = await Enrollment.aggregate([
            { $match: { enrolledAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$enrolledAt' },
                        month: { $month: '$enrolledAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Get revenue by month
        const revenueTrend = await Payment.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo }, status: 'completed' } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    revenue: { $sum: '$amount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Get user growth
        const userGrowth = await User.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        res.json({
            enrollmentTrend,
            revenueTrend,
            userGrowth
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
