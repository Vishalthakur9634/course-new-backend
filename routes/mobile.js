const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const { authenticate } = require('../middleware/rbac');

// Get all devices for the current user
router.get('/', authenticate, async (req, res) => {
    try {
        const devices = await Device.find({ userId: req.user.id });
        res.json(devices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Record/Sync a device
router.post('/sync', authenticate, async (req, res) => {
    const { deviceName, pushToken, metadata } = req.body;
    try {
        const device = await Device.findOneAndUpdate(
            { userId: req.user.id, deviceName },
            {
                lastActive: new Date(),
                status: 'online',
                pushToken,
                metadata
            },
            { upsert: true, new: true }
        );
        res.json(device);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Remove a device
router.delete('/:id', authenticate, async (req, res) => {
    try {
        await Device.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        res.json({ message: 'Device removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
