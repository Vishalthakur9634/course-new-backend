const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { authenticate } = require('../middleware/rbac');

// Get Announcements for Course
router.get('/course/:courseId', async (req, res) => {
    try {
        const announcements = await Announcement.find({ courseId: req.params.courseId })
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching announcements', error: error.message });
    }
});

// Get Instructor's Announcements (Created by them)
router.get('/instructor', authenticate, async (req, res) => {
    try {
        const announcements = await Announcement.find({ createdBy: req.user._id })
            .populate('courseId', 'title')
            .sort({ createdAt: -1 });
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching instructor announcements', error: error.message });
    }
});

// Get Student's Announcements (From enrolled courses)
router.get('/student', authenticate, async (req, res) => {
    try {
        const Enrollment = require('../models/Enrollment');

        // Find all courses the student is enrolled in
        const enrollments = await Enrollment.find({ studentId: req.user._id });
        const courseIds = enrollments.map(e => e.courseId);

        const announcements = await Announcement.find({ courseId: { $in: courseIds } })
            .populate('courseId', 'title')
            .populate('createdBy', 'name avatar') // Get instructor details
            .sort({ createdAt: -1 });

        res.json(announcements);
    } catch (error) {
        console.error('Error fetching student announcements:', error);
        res.status(500).json({ message: 'Error fetching student announcements', error: error.message });
    }
});

// Create Announcement (Instructor/Admin)
router.post('/', async (req, res) => {
    try {
        const { courseId, title, message, priority, createdBy } = req.body;
        const announcement = new Announcement({
            courseId,
            title,
            message,
            priority: priority || 'medium',
            createdBy
        });
        await announcement.save();
        await announcement.populate('createdBy', 'name');

        // Notify all enrolled students
        const Enrollment = require('../models/Enrollment');
        const Notification = require('../models/Notification');
        const Course = require('../models/Course');

        const course = await Course.findById(courseId);
        const enrollments = await Enrollment.find({ courseId });

        // Create notifications in parallel
        const notifications = enrollments.map(enrollment => ({
            userId: enrollment.studentId,
            type: 'course_update', // or 'announcement'
            title: `New Announcement: ${course.title}`,
            message: `Instructor posted: "${title}"`,
            link: `/course/${courseId}`, // Link to course (maybe add anchor to announcements tab)
            priority: 'medium',
            createdAt: new Date()
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        res.status(201).json(announcement);
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ message: 'Error creating announcement', error: error.message });
    }
});

// Delete Announcement (Admin)
router.delete('/:id', async (req, res) => {
    try {
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Announcement deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting announcement', error: error.message });
    }
});

module.exports = router;
