const express = require('express');
const Comment = require('../models/Comment');
const router = express.Router();

// Get Comments for a Video
router.get('/:videoId', async (req, res) => {
    try {
        const comments = await Comment.find({ video: req.params.videoId })
            .populate('user', 'name avatar')
            .populate('replies.user', 'name avatar')
            .sort({ createdAt: -1 });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching comments', error: error.message });
    }
});

// Add a Comment
router.post('/', async (req, res) => {
    try {
        const { userId, videoId, text } = req.body;

        const comment = new Comment({
            user: userId,
            video: videoId,
            text
        });

        await comment.save();
        await comment.populate('user', 'name avatar');

        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ message: 'Error adding comment', error: error.message });
    }
});

// Add a Reply
router.post('/:commentId/reply', async (req, res) => {
    try {
        const { userId, text } = req.body;
        const comment = await Comment.findById(req.params.commentId);

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        comment.replies.push({ user: userId, text });
        await comment.save();

        const populated = await Comment.findById(comment._id)
            .populate('user', 'name avatar')
            .populate('replies.user', 'name avatar');

        res.json(populated);
    } catch (error) {
        res.status(500).json({ message: 'Error adding reply', error: error.message });
    }
});

// Toggle Like
router.put('/:commentId/like', async (req, res) => {
    try {
        const { userId } = req.body;
        const comment = await Comment.findById(req.params.commentId);

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        const index = comment.likes.indexOf(userId);
        if (index === -1) {
            comment.likes.push(userId); // Like
        } else {
            comment.likes.splice(index, 1); // Unlike
        }

        await comment.save();
        res.json(comment);
    } catch (error) {
        res.status(500).json({ message: 'Error toggling like', error: error.message });
    }
});

module.exports = router;
