const express = require('express');
const router = express.Router();
const License = require('../models/License');
const { authenticate } = require('../middleware/rbac');

// Get all licenses for an instructor
router.get('/my-licenses', authenticate, async (req, res) => {
    try {
        const licenses = await License.find({ instructorId: req.user.id })
            .populate('courseId', 'title');
        res.json(licenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin: Get all licenses
router.get('/all', authenticate, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        const licenses = await License.find()
            .populate('courseId', 'title')
            .populate('instructorId', 'name');
        res.json(licenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a license
router.post('/', authenticate, async (req, res) => {
    try {
        const license = new License({
            ...req.body,
            instructorId: req.user.id
        });
        await license.save();
        res.status(201).json(license);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
