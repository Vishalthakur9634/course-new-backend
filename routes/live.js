const express = require('express');
const router = express.Router();
const LiveSession = require('../models/LiveSession');
const { authenticate, requireInstructor } = require('../middleware/rbac');

// Get all public or user-relevant sessions
router.get('/', authenticate, async (req, res) => {
    try {
        const { courseId } = req.query;
        let query = { status: { $ne: 'cancelled' } };

        if (courseId) {
            query.courseId = courseId;
        } else {
            // If no course specified, get public OR enrolled course sessions (simplified for now: get all public + instructor specific)
            // Ideally: find sessions for courses user is enrolled in.
            // For MVP: Get sessions where isPublic is true OR created by instructors
            query.$or = [{ isPublic: true }];
        }

        const sessions = await LiveSession.find(query)
            .populate('instructorId', 'name avatar')
            .populate('courseId', 'title')
            .sort({ scheduledAt: 1 });

        res.json(sessions);
    } catch (error) {
        console.error('Error fetching live sessions:', error);
        res.status(500).json({ message: 'Error fetching live sessions', error: error.message });
    }
});

// Create a session (Instructor only)
router.post('/', authenticate, requireInstructor, async (req, res) => {
    try {
        const { title, description, scheduledAt, duration, meetingLink, courseId, isPublic } = req.body;

        const session = new LiveSession({
            title,
            description,
            instructorId: req.user._id,
            scheduledAt,
            duration,
            meetingLink,
            courseId: courseId || null,
            isPublic
        });

        await session.save();
        res.status(201).json(session);
    } catch (error) {
        console.error('Error creating live session:', error);
        res.status(500).json({ message: 'Error creating session', error: error.message });
    }
});

// Update session
router.put('/:id', authenticate, requireInstructor, async (req, res) => {
    try {
        const session = await LiveSession.findOne({ _id: req.params.id, instructorId: req.user._id });
        if (!session) return res.status(404).json({ message: 'Session not found or unauthorized' });

        Object.assign(session, req.body);
        await session.save();
        res.json(session);
    } catch (error) {
        res.status(500).json({ message: 'Error updating session', error: error.message });
    }
});

// Delete session
router.delete('/:id', authenticate, requireInstructor, async (req, res) => {
    try {
        const session = await LiveSession.findOneAndDelete({ _id: req.params.id, instructorId: req.user._id });
        if (!session) return res.status(404).json({ message: 'Session not found or unauthorized' });
        res.json({ message: 'Session deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting session', error: error.message });
    }
});

module.exports = router;
