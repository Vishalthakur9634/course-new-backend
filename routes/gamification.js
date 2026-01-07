const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/rbac');

// Dummy data for initial implementation
router.get('/xp', authenticate, async (req, res) => {
    try {
        res.json({
            xp: 2450,
            tier: 'Nebula Sage',
            streak: 7,
            nextTierXp: 5000
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/leaderboard', async (req, res) => {
    try {
        res.json([
            { id: 1, name: 'Alex Rivera', xp: 12500, tier: 'Supernova' },
            { id: 2, name: 'Sarah Chen', xp: 11200, tier: 'Supernova' },
            { id: 3, name: 'Marcus Bell', xp: 9800, tier: 'Nova' }
        ]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
