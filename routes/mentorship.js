const express = require('express');
const router = express.Router();
const MentorshipSession = require('../models/MentorshipSession');
const User = require('../models/User');
const { authenticate } = require('../middleware/rbac');

// Get all mentorship sessions (Student or Mentor view)
router.get('/sessions', authenticate, async (req, res) => {
    try {
        const query = req.user.role === 'instructor'
            ? { mentorId: req.user.id }
            : { studentId: req.user.id };

        const sessions = await MentorshipSession.find(query)
            .populate('mentorId', 'name avatar')
            .populate('studentId', 'name avatar')
            .sort({ createdAt: -1 });

        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Book a session
router.post('/book', authenticate, async (req, res) => {
    try {
        const { mentorId, topic, scheduledDate, price } = req.body;

        const mentor = await User.findById(mentorId);
        if (!mentor || mentor.role !== 'instructor') {
            return res.status(404).json({ message: 'Mentor not found' });
        }

        const newSession = new MentorshipSession({
            studentId: req.user.id,
            mentorId,
            topic,
            scheduledDate,
            price
        });

        await newSession.save();
        res.status(201).json(newSession);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
