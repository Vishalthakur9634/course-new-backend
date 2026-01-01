const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const Course = require('../models/Course');
const crypto = require('crypto');

// Generate Certificate
router.post('/generate', async (req, res) => {
    try {
        const { userId, courseId } = req.body;

        // Check if certificate already exists
        const existing = await Certificate.findOne({ userId, courseId });
        if (existing) {
            return res.status(400).json({ message: 'Certificate already generated' });
        }

        // Generate unique code
        const certificateCode = crypto.randomBytes(16).toString('hex').toUpperCase();

        const certificate = new Certificate({
            userId,
            courseId,
            certificateCode
        });

        await certificate.save();
        await certificate.populate('userId courseId');

        res.status(201).json(certificate);
    } catch (error) {
        res.status(500).json({ message: 'Error generating certificate', error: error.message });
    }
});

// Get User Certificates
router.get('/user/:userId', async (req, res) => {
    try {
        const certificates = await Certificate.find({ userId: req.params.userId })
            .populate('courseId', 'title thumbnail')
            .sort({ createdAt: -1 });
        res.json(certificates);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching certificates', error: error.message });
    }
});

// Verify Certificate
router.get('/verify/:code', async (req, res) => {
    try {
        const certificate = await Certificate.findOne({ certificateCode: req.params.code })
            .populate('userId', 'name email')
            .populate('courseId', 'title');

        if (!certificate) {
            return res.status(404).json({ message: 'Certificate not found' });
        }

        res.json(certificate);
    } catch (error) {
        res.status(500).json({ message: 'Error verifying certificate', error: error.message });
    }
});

module.exports = router;
