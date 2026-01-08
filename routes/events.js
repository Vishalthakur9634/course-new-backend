const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { authenticate } = require('../middleware/rbac');

// Get all events
router.get('/', async (req, res) => {
    try {
        const events = await Event.find()
            .populate('organizer', 'name avatar')
            .sort({ date: 1 });

        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create an event
router.post('/', authenticate, async (req, res) => {
    try {
        if (!['instructor', 'superadmin', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Only instructors and admins can create events' });
        }
        const newEvent = new Event({
            ...req.body,
            organizer: req.user.id
        });
        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// RSVP to an event
router.post('/:id/rsvp', authenticate, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const userId = req.user.id;
        const isAttending = event.attendees.includes(userId);

        if (isAttending) {
            // Un-RSVP
            event.attendees = event.attendees.filter(id => id.toString() !== userId);
        } else {
            // RSVP
            event.attendees.push(userId);
        }

        await event.save();
        res.json({
            message: isAttending ? 'RSVP Cancelled' : 'RSVP Confirmed',
            attending: !isAttending
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete an event
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Check if user is the organizer or admin
        if (event.organizer.toString() !== req.user.id && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await event.deleteOne();
        res.json({ message: 'Event removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
