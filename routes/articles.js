const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const { authenticate, requireInstructor } = require('../middleware/rbac');

// Get all published articles (with optional filtering)
router.get('/', async (req, res) => {
    try {
        const query = {};
        if (req.query.authorId) {
            query.authorId = req.query.authorId;
        } else {
            query.isPublished = true;
        }
        if (req.query.category) query.category = req.query.category;

        const articles = await Article.find(query)
            .populate('authorId', 'name avatar')
            .sort({ createdAt: -1 });
        res.json(articles);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching articles', error: error.message });
    }
});

// Get single article by slug
router.get('/:slug', async (req, res) => {
    try {
        const article = await Article.findOne({ slug: req.params.slug })
            .populate('authorId', 'name avatar bio'); // Assume bio exists or ignore

        if (!article) return res.status(404).json({ message: 'Article not found' });

        // Increment views
        article.views += 1;
        await article.save();

        res.json(article);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching article', error: error.message });
    }
});

// Create article (Instructor only)
router.post('/', authenticate, requireInstructor, async (req, res) => {
    try {
        const { title, content, coverImage, videoUrl, category, tags, isPublished } = req.body;

        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required' });
        }

        const authorId = req.user._id || req.user.id;

        const article = new Article({
            title,
            content,
            coverImage: coverImage || '',
            videoUrl: videoUrl || '',
            category: category || 'general',
            tags: Array.isArray(tags) ? tags : [],
            isPublished: isPublished !== undefined ? isPublished : false,
            authorId
        });

        await article.save();
        res.status(201).json(article);
    } catch (error) {
        const fs = require('fs');
        const path = require('path');
        const errorDetail = {
            message: error.message,
            stack: error.stack,
            body: req.body,
            userId: req.user?._id
        };
        fs.appendFileSync(path.join(__dirname, '../article_error.log'), `[${new Date().toISOString()}] ${JSON.stringify(errorDetail, null, 2)}\n\n`);

        console.error('Core Article Creation Error:', error);
        res.status(500).json({
            message: 'Internal server error during article creation',
            error: error.message,
            details: error.errors // Include Mongoose validation errors if any
        });
    }
});

module.exports = router;
