const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Add to Wishlist
router.post('/add', async (req, res) => {
    try {
        const { userId, courseId } = req.body;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.wishlist.includes(courseId)) {
            return res.status(400).json({ message: 'Course already in wishlist' });
        }

        user.wishlist.push(courseId);
        await user.save();

        res.json({ message: 'Added to wishlist', wishlist: user.wishlist });
    } catch (error) {
        res.status(500).json({ message: 'Error adding to wishlist', error: error.message });
    }
});

// Remove from Wishlist
router.post('/remove', async (req, res) => {
    try {
        const { userId, courseId } = req.body;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ message: 'User not found' });

        user.wishlist = user.wishlist.filter(id => id.toString() !== courseId);
        await user.save();

        res.json({ message: 'Removed from wishlist', wishlist: user.wishlist });
    } catch (error) {
        res.status(500).json({ message: 'Error removing from wishlist', error: error.message });
    }
});

// Get User Wishlist
router.get('/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate('wishlist');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.wishlist);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching wishlist', error: error.message });
    }
});

module.exports = router;
