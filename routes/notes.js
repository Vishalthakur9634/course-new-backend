const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const { authenticate } = require('../middleware/rbac');

// Apply authentication to all routes
router.use(authenticate);

// Get all notes for a video (user-specific)
router.get('/video/:videoId', async (req, res) => {
    try {
        const notes = await Note.find({
            userId: req.user.id,
            videoId: req.params.videoId
        }).sort({ timestamp: 1 });

        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get ALL notes for the authenticated user (for My Notes page)
router.get('/', async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.user.id })
            .populate('videoId', 'title duration')
            .populate('courseId', 'title thumbnail')
            .sort({ createdAt: -1 });
        res.json(notes);
    } catch (error) {
        console.error('Error fetching all notes:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Multer setup for note attachments
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/notes';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

// Apply authentication to all routes (already done at top)

// Get all notes for a video (user-specific)
// ... already defined above ...

// Create a new note
router.post('/', upload.single('attachment'), async (req, res) => {
    try {
        const { videoId, courseId, content, timestamp } = req.body;

        const attachments = [];
        if (req.file) {
            attachments.push({
                filename: req.file.originalname,
                url: `/uploads/notes/${req.file.filename}`,
                fileType: req.file.mimetype
            });
        }

        const note = new Note({
            userId: req.user.id,
            videoId,
            courseId,
            content,
            timestamp: timestamp || 0,
            attachments
        });

        await note.save();
        res.status(201).json(note);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update a note
router.put('/:id', async (req, res) => {
    try {
        const note = await Note.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        const { content, timestamp, attachments } = req.body;

        if (content !== undefined) note.content = content;
        if (timestamp !== undefined) note.timestamp = timestamp;
        if (attachments !== undefined) note.attachments = attachments;

        await note.save();
        res.json(note);
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a note
router.delete('/:id', async (req, res) => {
    try {
        const note = await Note.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all notes for a course (user-specific)
router.get('/course/:courseId', async (req, res) => {
    try {
        const notes = await Note.find({
            userId: req.user.id,
            courseId: req.params.courseId
        })
            .populate('videoId', 'title')
            .sort({ createdAt: -1 });

        res.json(notes);
    } catch (error) {
        console.error('Error fetching course notes:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
