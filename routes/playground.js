const express = require('express');
const router = express.Router();
const CodeSnippet = require('../models/CodeSnippet');
const { authenticate } = require('../middleware/rbac');

// Get user snippets
router.get('/snippets', authenticate, async (req, res) => {
    try {
        const snippets = await CodeSnippet.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(snippets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Save snippet
router.post('/snippets', authenticate, async (req, res) => {
    try {
        const { title, language, code, isPublic } = req.body;
        const snippet = new CodeSnippet({
            userId: req.user.id,
            title,
            language,
            code,
            isPublic
        });
        await snippet.save();
        res.status(201).json(snippet);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete snippet
router.delete('/snippets/:id', authenticate, async (req, res) => {
    try {
        const snippet = await CodeSnippet.findById(req.params.id);
        if (!snippet) return res.status(404).json({ message: 'Snippet not found' });
        if (snippet.userId.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

        await snippet.deleteOne();
        res.json({ message: 'Snippet removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
