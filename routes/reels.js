const express = require('express');
const router = express.Router();
const Reel = require('../models/Reel');
const { authenticate: auth, requireInstructor: isInstructor } = require('../middleware/rbac');

// @access  Authenticated (Student or Instructor)
router.post('/upload', auth, async (req, res) => {
    try {
        const { title, videoUrl, thumbnailUrl, category, tags, duration } = req.body;

        const reel = new Reel({
            title,
            videoUrl,
            thumbnailUrl,
            category: category || 'General',
            tags: tags || [],
            duration: duration || 0,
            instructorId: req.user._id
        });

        await reel.save();
        res.status(201).json(reel);
    } catch (error) {
        console.error('Error uploading reel:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   GET /api/reels/feed
// @desc    Get reels feed
// @access  Public (or Private)
router.get('/feed', async (req, res) => {
    try {
        const { category, instructorId, page = 1, limit = 10 } = req.query;
        const query = {};

        if (category && category !== 'All') {
            query.category = category;
        }

        if (instructorId) {
            query.instructorId = instructorId;
        }

        const reels = await Reel.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('instructorId', 'name avatar instructorProfile'); // Populate instructor details

        res.json(reels);
    } catch (error) {
        console.error('Error fetching reels feed:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/reels/categories
// @desc    Get distinct reel categories
// @access  Public
router.get('/categories', async (req, res) => {
    try {
        const categories = await Reel.distinct('category');
        res.json(categories.filter(c => c)); // Remove null/empty if any
    } catch (error) {
        console.error('Error fetching reel categories:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/reels/:id/like
// @desc    Like/Unlike a reel
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.id);
        if (!reel) {
            return res.status(404).json({ message: 'Reel not found' });
        }

        // Check if already liked
        if (reel.likes.includes(req.user._id)) {
            // Unlike
            reel.likes = reel.likes.filter(id => id.toString() !== req.user._id.toString());
        } else {
            // Like
            reel.likes.push(req.user._id);
        }

        await reel.save();
        res.json(reel.likes);
    } catch (error) {
        console.error('Error liking reel:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/reels/:id/view
// @desc    Increment view count
// @access  Public
router.post('/:id/view', async (req, res) => {
    try {
        await Reel.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error incrementing view:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/reels/my-reels
// @desc    Get logged in instructor's reels
// @access  Instructor
router.get('/my-reels', [auth, isInstructor], async (req, res) => {
    try {
        const reels = await Reel.find({ instructorId: req.user._id }).sort({ createdAt: -1 });
        res.json(reels);
    } catch (error) {
        console.error('Error fetching my reels:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   DELETE /api/reels/:id
// @desc    Delete a reel
// @access  Instructor
router.delete('/:id', [auth, isInstructor], async (req, res) => {
    try {
        await Reel.deleteOne({ _id: req.params.id });
        res.json({ message: 'Reel removed' });
    } catch (error) {
        console.error('Error deleting reel:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   POST /api/reels/:id/comment
// @desc    Add a comment to a reel
// @access  Private
router.post('/:id/comment', auth, async (req, res) => {
    try {
        const { text } = req.body;
        const reel = await Reel.findById(req.params.id);
        if (!reel) return res.status(404).json({ message: 'Reel not found' });

        reel.comments.push({
            user: req.user._id,
            text
        });

        await reel.save();

        // Return populated comments
        const updatedReel = await Reel.findById(req.params.id)
            .populate('comments.user', 'name avatar');

        res.json(updatedReel.comments);
    } catch (error) {
        console.error('Error commenting:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/reels/:id/comments
// @desc    Get comments for a reel
// @access  Public
router.get('/:id/comments', async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.id)
            .populate('comments.user', 'name avatar');
        if (!reel) return res.status(404).json({ message: 'Reel not found' });
        res.json(reel.comments);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
