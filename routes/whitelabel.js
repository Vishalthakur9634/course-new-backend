const express = require('express');
const router = express.Router();
const WhiteLabelConfig = require('../models/WhiteLabelConfig');
const { authenticate } = require('../middleware/rbac');

// Get config for a user
router.get('/', authenticate, async (req, res) => {
    try {
        let config = await WhiteLabelConfig.findOne({ userId: req.user.id });
        if (!config) {
            config = new WhiteLabelConfig({ userId: req.user.id });
            await config.save();
        }
        res.json(config);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update config
router.put('/', authenticate, async (req, res) => {
    try {
        const config = await WhiteLabelConfig.findOneAndUpdate(
            { userId: req.user.id },
            { ...req.body, userId: req.user.id },
            { new: true, upsert: true }
        );
        res.json(config);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
