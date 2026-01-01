const express = require('express');
const router = express.Router();
const Discussion = require('../models/Discussion');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { authenticate, requireCourseAccess } = require('../middleware/rbac');

// Get discussions for a course
router.get('/course/:courseId', authenticate, requireCourseAccess, async (req, res) => {
    try {
        const { courseId } = req.params;
        const { videoId, type, page = 1, limit = 20 } = req.query;

        let query = { courseId };
        if (videoId) query.videoId = videoId;
        if (type) query.type = type;

        const discussions = await Discussion.find(query)
            .populate('userId', 'name avatar')
            .populate('replies.userId', 'name avatar')
            .sort({ isPinned: -1, createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Discussion.countDocuments(query);

        res.json({
            discussions,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching discussions', error: error.message });
    }
});

// Create a discussion/question
router.post('/', authenticate, requireCourseAccess, async (req, res) => {
    try {
        const { courseId, videoId, title, content, type, timestamp } = req.body;

        const discussion = await Discussion.create({
            courseId,
            videoId,
            userId: req.user._id,
            title,
            content,
            type: type || 'discussion',
            timestamp: timestamp || 0
        });

        await discussion.populate('userId', 'name avatar');

        res.status(201).json(discussion);
    } catch (error) {
        res.status(500).json({ message: 'Error creating discussion', error: error.message });
    }
});

// Reply to a discussion
router.post('/:id/reply', authenticate, requireCourseAccess, async (req, res) => {
    try {
        const { content } = req.body;
        const discussionId = req.params.id;

        const discussion = await Discussion.findById(discussionId);

        if (!discussion) {
            return res.status(404).json({ message: 'Discussion not found' });
        }

        // Check if user is the course instructor
        const course = await Course.findById(discussion.courseId);
        const isInstructorReply = course.instructorId.toString() === req.user._id.toString();

        discussion.replies.push({
            userId: req.user._id,
            content,
            createdAt: new Date(),
            likes: [],
            isInstructorReply
        });

        await discussion.save();
        await discussion.populate('replies.userId', 'name avatar');

        res.status(201).json(discussion);
    } catch (error) {
        res.status(500).json({ message: 'Error adding reply', error: error.message });
    }
});

// Like a discussion
router.post('/:id/like', authenticate, requireCourseAccess, async (req, res) => {
    try {
        const discussion = await Discussion.findById(req.params.id);

        if (!discussion) {
            return res.status(404).json({ message: 'Discussion not found' });
        }

        const likeIndex = discussion.likes.findIndex(
            id => id.toString() === req.user._id.toString()
        );

        if (likeIndex === -1) {
            discussion.likes.push(req.user._id);
        } else {
            discussion.likes.splice(likeIndex, 1);
        }

        await discussion.save();

        res.json({ likes: discussion.likes.length });
    } catch (error) {
        res.status(500).json({ message: 'Error liking discussion', error: error.message });
    }
});

// Like a reply
router.post('/:id/reply/:replyIndex/like', authenticate, requireCourseAccess, async (req, res) => {
    try {
        const { id, replyIndex } = req.params;

        const discussion = await Discussion.findById(id);

        if (!discussion || !discussion.replies[replyIndex]) {
            return res.status(404).json({ message: 'Discussion or reply not found' });
        }

        const reply = discussion.replies[replyIndex];
        const likeIndex = reply.likes.findIndex(
            id => id.toString() === req.user._id.toString()
        );

        if (likeIndex === -1) {
            reply.likes.push(req.user._id);
        } else {
            reply.likes.splice(likeIndex, 1);
        }

        await discussion.save();

        res.json({ likes: reply.likes.length });
    } catch (error) {
        res.status(500).json({ message: 'Error liking reply', error: error.message });
    }
});

// Mark discussion as solved
router.post('/:id/solve', authenticate, requireCourseAccess, async (req, res) => {
    try {
        const discussion = await Discussion.findById(req.params.id);

        if (!discussion) {
            return res.status(404).json({ message: 'Discussion not found' });
        }

        // Only discussion creator or instructor can mark as solved
        const course = await Course.findById(discussion.courseId);
        const isAuthor = discussion.userId.toString() === req.user._id.toString();
        const isInstructor = course.instructorId.toString() === req.user._id.toString();

        if (!isAuthor && !isInstructor) {
            return res.status(403).json({ message: 'Only the author or instructor can mark as solved' });
        }

        discussion.isSolved = !discussion.isSolved;
        discussion.solvedBy = discussion.isSolved ? req.user._id : null;

        await discussion.save();

        res.json(discussion);
    } catch (error) {
        res.status(500).json({ message: 'Error marking as solved', error: error.message });
    }
});

// Pin/Unpin discussion (instructor only)
router.post('/:id/pin', authenticate, async (req, res) => {
    try {
        const discussion = await Discussion.findById(req.params.id);

        if (!discussion) {
            return res.status(404).json({ message: 'Discussion not found' });
        }

        // Verify instructor ownership
        const course = await Course.findById(discussion.courseId);
        if (course.instructorId.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Only the instructor can pin discussions' });
        }

        discussion.isPinned = !discussion.isPinned;
        await discussion.save();

        res.json(discussion);
    } catch (error) {
        res.status(500).json({ message: 'Error pinning discussion', error: error.message });
    }
});

// Delete discussion
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const discussion = await Discussion.findById(req.params.id);

        if (!discussion) {
            return res.status(404).json({ message: 'Discussion not found' });
        }

        // Only author, instructor, or super admin can delete
        const course = await Course.findById(discussion.courseId);
        const isAuthor = discussion.userId.toString() === req.user._id.toString();
        const isInstructor = course.instructorId.toString() === req.user._id.toString();
        const isSuperAdmin = req.user.role === 'superadmin';

        if (!isAuthor && !isInstructor && !isSuperAdmin) {
            return res.status(403).json({ message: 'You cannot delete this discussion' });
        }

        await Discussion.findByIdAndDelete(req.params.id);

        res.json({ message: 'Discussion deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting discussion', error: error.message });
    }
});

module.exports = router;
