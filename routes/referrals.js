const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/rbac');

// Get Referral Stats & Link
router.get('/stats', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('referralCode referralStats earnings');

        res.json({
            referralCode: user.referralCode,
            link: `${process.env.CLIENT_URL || 'http://localhost:5173'}/register?ref=${user.referralCode}`,
            stats: user.referralStats,
            earnings: user.earnings
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching referral stats', error: error.message });
    }
});

// Get Referred Users
router.get('/network', authenticate, async (req, res) => {
    try {
        const referrals = await User.find({ referredBy: req.user._id })
            .select('name email avatar createdAt')
            .sort({ createdAt: -1 });

        res.json(referrals);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching network', error: error.message });
    }
});

module.exports = router;
