const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const Review = require('../models/Review');
const Certificate = require('../models/Certificate');
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const { authenticate, requireSuperAdmin } = require('../middleware/rbac');

// Platform dashboard statistics
router.get('/dashboard', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalInstructors = await User.countDocuments({ role: 'instructor' });
        const pendingInstructors = await User.countDocuments({ role: 'instructor', isInstructorApproved: false });

        const totalCourses = await Course.countDocuments();
        const publishedCourses = await Course.countDocuments({ isPublished: true, approvalStatus: 'approved' });
        const pendingCourses = await Course.countDocuments({ approvalStatus: 'pending' });
        const draftCourses = await Course.countDocuments({ approvalStatus: 'draft' });

        const totalEnrollments = await Enrollment.countDocuments();
        const activeEnrollments = await Enrollment.countDocuments({ isCompleted: false });
        const completedEnrollments = await Enrollment.countDocuments({ isCompleted: true });

        // Optimize Revenue Calculation using Aggregation
        const revenueStats = await Payment.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$amount' },
                    platformEarnings: { $sum: '$platformFee' },
                    instructorEarnings: { $sum: '$instructorEarning' }
                }
            }
        ]);

        const financialData = revenueStats[0] || { totalRevenue: 0, platformEarnings: 0, instructorEarnings: 0 };

        // Get growth data (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const newUsersLast30Days = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
        const newCoursesLast30Days = await Course.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
        const newEnrollmentsLast30Days = await Enrollment.countDocuments({ enrolledAt: { $gte: thirtyDaysAgo } });

        // Recent activity
        const recentUsers = await User.find()
            .select('name email role createdAt avatar')
            .sort({ createdAt: -1 })
            .limit(10);

        const recentCourses = await Course.find()
            .populate('instructorId', 'name')
            .sort({ createdAt: -1 })
            .limit(10);

        const recentPayments = await Payment.find({ status: 'completed' })
            .populate('studentId', 'name')
            .populate('courseId', 'title')
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            statistics: {
                users: {
                    total: totalUsers,
                    students: totalStudents,
                    instructors: totalInstructors,
                    pendingInstructors,
                    newLast30Days: newUsersLast30Days
                },
                courses: {
                    total: totalCourses,
                    published: publishedCourses,
                    pending: pendingCourses,
                    draft: draftCourses,
                    newLast30Days: newCoursesLast30Days
                },
                enrollments: {
                    total: totalEnrollments,
                    active: activeEnrollments,
                    completed: completedEnrollments,
                    newLast30Days: newEnrollmentsLast30Days
                },
                revenue: {
                    total: financialData.totalRevenue,
                    platformEarnings: financialData.platformEarnings,
                    instructorEarnings: financialData.instructorEarnings
                }
            },
            recentActivity: {
                users: recentUsers,
                courses: recentCourses,
                payments: recentPayments
            }
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error); // Add logging
        res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
    }
});

// User Management
router.get('/users', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const { role, search, page = 1, limit = 20, isBanned } = req.query;

        let query = {};
        if (role) query.role = role;
        if (isBanned !== undefined) query.isBanned = isBanned === 'true';
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await User.countDocuments(query);

        res.json({
            users,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
});

router.get('/users/:id', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get additional stats
        let stats = {};

        if (user.role === 'instructor') {
            const courses = await Course.find({ instructorId: user._id });
            const earnings = await Payment.find({ instructorId: user._id, status: 'completed' });
            const totalEarnings = earnings.reduce((sum, p) => sum + p.instructorEarning, 0);

            stats = {
                totalCourses: courses.length,
                totalEarnings,
                students: user.instructorProfile.totalStudents
            };
        } else if (user.role === 'student') {
            const enrollments = await Enrollment.find({ studentId: user._id });
            const completedCourses = enrollments.filter(e => e.isCompleted).length;

            stats = {
                totalEnrollments: enrollments.length,
                completedCourses,
                certificates: user.certificates.length
            };
        }

        res.json({ user, stats });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user', error: error.message });
    }
});

router.put('/users/:id/role', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const { role } = req.body;

        if (!['student', 'instructor', 'superadmin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select('-password');

        await Notification.create({
            userId: user._id,
            type: 'system_announcement',
            title: 'Role Updated',
            message: `Your account role has been changed to ${role}`,
            priority: 'high'
        });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating role', error: error.message });
    }
});

router.put('/users/:id/ban', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const { isBanned, banReason } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isBanned, banReason: isBanned ? banReason : '' },
            { new: true }
        ).select('-password');

        if (isBanned) {
            await Notification.create({
                userId: user._id,
                type: 'system_announcement',
                title: 'Account Suspended',
                message: `Your account has been suspended. Reason: ${banReason}`,
                priority: 'high'
            });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating ban status', error: error.message });
    }
});

router.delete('/users/:id', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
});

// Course Management
router.get('/courses', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const { approvalStatus, search, page = 1, limit = 20 } = req.query;

        let query = {};
        if (approvalStatus) query.approvalStatus = approvalStatus;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const courses = await Course.find(query)
            .populate('instructorId', 'name email')
            .populate('videos')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Course.countDocuments(query);

        res.json({
            courses,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching courses', error: error.message });
    }
});

router.put('/courses/:id/approve', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { approvalStatus: 'approved', rejectionReason: '' },
            { new: true }
        ).populate('instructorId', 'name email');

        // Notify instructor
        await Notification.create({
            userId: course.instructorId._id,
            type: 'course_approved',
            title: 'Course Approved!',
            message: `Your course "${course.title}" has been approved and can now be published`,
            link: `/instructor/courses/${course._id}`,
            priority: 'high'
        });

        res.json(course);
    } catch (error) {
        res.status(500).json({ message: 'Error approving course', error: error.message });
    }
});

router.put('/courses/:id/reject', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const { rejectionReason } = req.body;

        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { approvalStatus: 'rejected', rejectionReason },
            { new: true }
        ).populate('instructorId', 'name email');

        // Notify instructor
        await Notification.create({
            userId: course.instructorId._id,
            type: 'course_rejected',
            title: 'Course Needs Revision',
            message: `Your course "${course.title}" requires changes. Reason: ${rejectionReason}`,
            link: `/instructor/courses/${course._id}`,
            priority: 'high'
        });

        res.json(course);
    } catch (error) {
        res.status(500).json({ message: 'Error rejecting course', error: error.message });
    }
});

router.put('/courses/:id/feature', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const { isFeatured, featuredOrder } = req.body;

        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { isFeatured, featuredOrder: isFeatured ? featuredOrder : 0 },
            { new: true }
        );

        res.json(course);
    } catch (error) {
        res.status(500).json({ message: 'Error updating featured status', error: error.message });
    }
});

router.delete('/courses/:id', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Delete all videos
        const Video = require('../models/Video');
        const fs = require('fs');
        const path = require('path');

        for (const videoId of course.videos) {
            await Video.findByIdAndDelete(videoId);
        }

        // Delete course from database
        await Course.findByIdAndDelete(req.params.id);

        // Delete course directory
        const courseDir = path.join(__dirname, '../uploads/courses', req.params.id);
        if (fs.existsSync(courseDir)) {
            fs.rmSync(courseDir, { recursive: true, force: true });
        }

        res.json({ message: 'Course and all associated files deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting course', error: error.message });
    }
});

// Instructor Management
router.get('/instructors/pending', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const pendingInstructors = await User.find({
            role: 'instructor',
            isInstructorApproved: false
        })
            .select('-password')
            .sort({ instructorApplicationDate: -1 });

        res.json(pendingInstructors);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pending instructors', error: error.message });
    }
});

router.put('/instructors/:id/approve', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isInstructorApproved: true },
            { new: true }
        ).select('-password');

        await Notification.create({
            userId: user._id,
            type: 'instructor_approved',
            title: 'Instructor Application Approved!',
            message: 'Congratulations! You can now create and publish courses.',
            link: '/instructor/dashboard',
            priority: 'high'
        });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error approving instructor', error: error.message });
    }
});

router.put('/instructors/:id/reject', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const { reason } = req.body;

        // Change role back to student or keep as instructor but unapproved
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role: 'student' }, // Or keep as instructor with isInstructorApproved: false
            { new: true }
        ).select('-password');

        await Notification.create({
            userId: user._id,
            type: 'system_announcement',
            title: 'Instructor Application Update',
            message: `Your instructor application was not approved. ${reason || ''}`,
            priority: 'medium'
        });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error rejecting instructor', error: error.message });
    }
});

// Payment Management
router.get('/payments', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const { status, payoutStatus, page = 1, limit = 50 } = req.query;

        let query = {};
        if (status) query.status = status;
        if (payoutStatus) query.payoutStatus = payoutStatus;

        const payments = await Payment.find(query)
            .populate('studentId', 'name email')
            .populate('instructorId', 'name email')
            .populate('courseId', 'title')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Payment.countDocuments(query);

        res.json({
            payments,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payments', error: error.message });
    }
});

router.put('/payments/:id/payout', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const { payoutStatus, payoutTransactionId } = req.body;

        const payment = await Payment.findByIdAndUpdate(
            req.params.id,
            {
                payoutStatus,
                payoutDate: payoutStatus === 'completed' ? new Date() : undefined,
                payoutTransactionId
            },
            { new: true }
        ).populate('instructorId');

        if (payoutStatus === 'completed') {
            // Update instructor earnings
            await User.findByIdAndUpdate(payment.instructorId._id, {
                $inc: {
                    'earnings.withdrawn': payment.instructorEarning,
                    'earnings.pending': -payment.instructorEarning
                }
            });

            await Notification.create({
                userId: payment.instructorId._id,
                type: 'payout_processed',
                title: 'Payout Processed',
                message: `Your payout of $${payment.instructorEarning} has been processed`,
                link: '/instructor/earnings',
                priority: 'high'
            });
        }

        res.json(payment);
    } catch (error) {
        res.status(500).json({ message: 'Error processing payout', error: error.message });
    }
});

// Platform Settings
router.get('/settings', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        // Return platform configuration (could be stored in DB or config file)
        res.json({
            platformFeePercentage: 20,
            paymentMethods: ['card', 'upi', 'paypal'],
            autoApproveInstructors: false,
            autoApproveCourses: false
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching settings', error: error.message });
    }
});

module.exports = router;
