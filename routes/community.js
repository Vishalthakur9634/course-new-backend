const express = require('express');
const router = express.Router();
const { Community, Post } = require('../models/Community');
const { authenticate } = require('../middleware/rbac');

// Get all communities or filter by category
router.get('/communities', async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = {};

        if (category && category !== 'all') {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const communities = await Community.find(query)
            .populate('creatorId', 'name avatar')
            .sort({ isOfficial: -1, memberCount: -1, createdAt: -1 })
            .lean();

        res.json(communities);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching communities', error: error.message });
    }
});

// Get communities for enrolled instructors
router.get('/communities/enrolled', authenticate, async (req, res) => {
    try {
        const User = require('../models/User'); // specific import to avoid circle if any (though usually fine)
        const Course = require('../models/Course'); // Ensure Course model is available

        // 1. Get student's enrolled courses to find instructors
        const user = await User.findById(req.user._id).populate({
            path: 'enrolledCourses.courseId',
            select: 'instructorId'
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        // 2. Extract unique instructor IDs
        const instructorIds = new Set();
        user.enrolledCourses.forEach(enrollment => {
            if (enrollment.courseId && enrollment.courseId.instructorId) {
                instructorIds.add(enrollment.courseId.instructorId.toString());
            }
        });

        // 3. Find communities created by these instructors
        const communities = await Community.find({
            creatorId: { $in: Array.from(instructorIds) }
        })
            .populate('creatorId', 'name avatar')
            .sort({ memberCount: -1 });

        res.json(communities);
    } catch (error) {
        console.error('Error fetching enrolled communities:', error);
        res.status(500).json({ message: 'Error fetching communities', error: error.message });
    }
});

// Create a community (instructors only)
router.post('/communities', authenticate, async (req, res) => {
    try {
        // Only allow instructors and admins to create communities
        if (!['instructor', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Only instructors can create communities' });
        }

        const { name, description, category, color, isPrivate } = req.body;

        const community = await Community.create({
            name,
            description,
            category: category || 'custom',
            creatorId: req.user._id,
            moderators: [req.user._id],
            members: [req.user._id],
            memberCount: 1,
            color: color || '#6366f1',
            isPrivate: isPrivate || false,
            isOfficial: req.user.role === 'superadmin'
        });

        await community.populate('creatorId', 'name avatar');

        res.status(201).json(community);
    } catch (error) {
        res.status(500).json({ message: 'Error creating community', error: error.message });
    }
});

// Join/Leave community
router.post('/communities/:id/join', authenticate, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);

        if (!community) {
            return res.status(404).json({ message: 'Community not found' });
        }

        const isMember = community.members.includes(req.user._id);

        if (isMember) {
            // Leave community
            community.members = community.members.filter(m => m.toString() !== req.user._id.toString());
            community.memberCount = Math.max(0, community.memberCount - 1);
        } else {
            // Join community
            community.members.push(req.user._id);
            community.memberCount += 1;
        }

        await community.save();

        res.json({
            joined: !isMember,
            memberCount: community.memberCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Error toggling membership', error: error.message });
    }
});

// Get posts for a community or all posts
router.get('/posts', async (req, res) => {
    try {
        const { communityId, type, sort = 'recent', page = 1, limit = 20 } = req.query;

        let query = {};
        if (communityId) query.communityId = communityId;
        if (type) query.type = type;

        let sortQuery = {};
        switch (sort) {
            case 'popular':
                sortQuery = { viewCount: -1, likes: -1 };
                break;
            case 'trending':
                // Sort by recent activity (likes + comments in last 7 days)
                sortQuery = { createdAt: -1 };
                break;
            default:
                sortQuery = { isPinned: -1, createdAt: -1 };
        }

        const posts = await Post.find(query)
            .populate('authorId', 'name avatar role')
            .populate('communityId', 'name category color moderators')
            .populate('comments.authorId', 'name avatar')
            .sort(sortQuery)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();

        // Add computed fields
        const postsWithStats = posts.map(post => ({
            ...post,
            likeCount: post.likes?.length || 0,
            commentCount: post.comments?.length || 0
        }));

        const total = await Post.countDocuments(query);

        res.json({
            posts: postsWithStats,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching posts', error: error.message });
    }
});

// Create a post
router.post('/posts', authenticate, async (req, res) => {
    try {
        const { communityId, title, content, type, tags, media } = req.body;
        let targetCommunityId = communityId;

        // Default to Global Feed if missing
        if (!targetCommunityId) {
            const globalFeed = await Community.findOne({ name: 'Global Feed' });
            if (globalFeed) targetCommunityId = globalFeed._id;
        }

        if (!targetCommunityId) {
            return res.status(400).json({ message: 'Community ID required or Global Feed not found.' });
        }

        const post = await Post.create({
            communityId: targetCommunityId,
            authorId: req.user._id,
            title,
            content,
            type: type || 'discussion',
            tags: tags || [],
            media: media || [],
            thumbnailUrl: req.body.thumbnailUrl || ''
        });

        await post.populate([
            { path: 'authorId', select: 'name avatar role' },
            { path: 'communityId', select: 'name category color' }
        ]);

        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ message: 'Error creating post', error: error.message });
    }
});

// Get single post with full details
router.get('/posts/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('authorId', 'name avatar role')
            .populate('communityId', 'name category color')
            .populate('comments.authorId', 'name avatar');

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Increment view count
        post.viewCount += 1;
        await post.save();

        res.json(post);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching post', error: error.message });
    }
});

// Like/Unlike a post
router.post('/posts/:id/like', authenticate, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const likeIndex = post.likes.findIndex(id => id.toString() === req.user._id.toString());

        if (likeIndex === -1) {
            post.likes.push(req.user._id);
        } else {
            post.likes.splice(likeIndex, 1);
        }

        await post.save();

        res.json({
            liked: likeIndex === -1,
            likeCount: post.likes.length
        });
    } catch (error) {
        res.status(500).json({ message: 'Error liking post', error: error.message });
    }
});

// Add comment to post
router.post('/posts/:id/comment', authenticate, async (req, res) => {
    try {
        const { content } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        post.comments.push({
            authorId: req.user._id,
            content,
            likes: [],
            createdAt: new Date()
        });

        await post.save();
        await post.populate('comments.authorId', 'name avatar');

        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ message: 'Error adding comment', error: error.message });
    }
});

// Like a comment
router.post('/posts/:postId/comment/:commentIndex/like', authenticate, async (req, res) => {
    try {
        const { postId, commentIndex } = req.params;
        const post = await Post.findById(postId);

        if (!post || !post.comments[commentIndex]) {
            return res.status(404).json({ message: 'Post or comment not found' });
        }

        const comment = post.comments[commentIndex];
        const likeIndex = comment.likes.findIndex(id => id.toString() === req.user._id.toString());

        if (likeIndex === -1) {
            comment.likes.push(req.user._id);
        } else {
            comment.likes.splice(likeIndex, 1);
        }

        await post.save();

        res.json({
            liked: likeIndex === -1,
            likeCount: comment.likes.length
        });
    } catch (error) {
        res.status(500).json({ message: 'Error liking comment', error: error.message });
    }
});

// Delete post (author or admin)
router.delete('/posts/:id', authenticate, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const isAuthor = post.authorId.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'superadmin';

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await Post.findByIdAndDelete(req.params.id);

        res.json({ message: 'Post deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting post', error: error.message });
    }
});

// Pin/Unpin post (moderators only)
router.post('/posts/:id/pin', authenticate, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate('communityId');

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const isModerator = post.communityId.moderators.some(
            m => m.toString() === req.user._id.toString()
        );
        const isAdmin = req.user.role === 'superadmin';

        if (!isModerator && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        post.isPinned = !post.isPinned;
        await post.save();

        res.json({ isPinned: post.isPinned });
    } catch (error) {
        res.status(500).json({ message: 'Error pinning post', error: error.message });
    }
});

// Get trending posts (across all communities)
router.get('/trending', async (req, res) => {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const trending = await Post.find({
            createdAt: { $gte: sevenDaysAgo }
        })
            .populate('authorId', 'name avatar')
            .populate('communityId', 'name category color')
            .sort({ viewCount: -1, likes: -1 })
            .limit(10)
            .lean();

        res.json(trending);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching trending posts', error: error.message });
    }
});

// Vote on a poll
router.post('/posts/:id/vote', authenticate, async (req, res) => {
    try {
        const { optionIndex } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post || !post.poll) {
            return res.status(404).json({ message: 'Poll not found' });
        }

        // Remove previous vote if exists
        post.poll.options.forEach(opt => {
            opt.votes = opt.votes.filter(v => v.toString() !== req.user._id.toString());
        });

        // Add new vote
        if (post.poll.options[optionIndex]) {
            post.poll.options[optionIndex].votes.push(req.user._id);
            await post.save();
            res.json(post.poll);
        } else {
            res.status(400).json({ message: 'Invalid option' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error voting', error: error.message });
    }
});

module.exports = router;