const express = require('express');
const router = express.Router();
const Sector = require('../models/Sector');
const SkillTree = require('../models/SkillTree');
const VaultItem = require('../models/VaultItem');
const AIChat = require('../models/AIChat');
const TutorResponse = require('../models/TutorResponse');
const { authenticate: auth } = require('../middleware/rbac');

// ==========================================
// SECTORS
// ==========================================
router.get('/sectors', async (req, res) => {
    try {
        const sectors = await Sector.find().sort({ createdAt: -1 });
        res.json(sectors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/sectors', auth, async (req, res) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res.status(403).json({ message: 'Access denied' });
    }
    const sector = new Sector(req.body);
    try {
        const newSector = await sector.save();
        res.status(201).json(newSector);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
    // ... POST route
});

router.put('/sectors/:id', auth, async (req, res) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        const sector = await Sector.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(sector);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/sectors/:id', auth, async (req, res) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        await Sector.findByIdAndDelete(req.params.id);
        res.json({ message: 'Sector deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



router.put('/sectors/:id', auth, async (req, res) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        const sector = await Sector.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(sector);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/sectors/:id', auth, async (req, res) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        await Sector.findByIdAndDelete(req.params.id);
        res.json({ message: 'Sector deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ==========================================
// SKILL TREES
// ==========================================
router.get('/skilltrees', async (req, res) => {
    try {
        const trees = await SkillTree.find().sort({ createdAt: -1 });
        res.json(trees);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/skilltrees', auth, async (req, res) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res.status(403).json({ message: 'Access denied' });
    }
    const tree = new SkillTree(req.body);
    try {
        const newTree = await tree.save();
        res.status(201).json(newTree);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
    // ... POST route
});

router.put('/skilltrees/:id', auth, async (req, res) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        const tree = await SkillTree.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(tree);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/skilltrees/:id', auth, async (req, res) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        await SkillTree.findByIdAndDelete(req.params.id);
        res.json({ message: 'Skill Tree deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



router.put('/skilltrees/:id', auth, async (req, res) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        const tree = await SkillTree.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(tree);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/skilltrees/:id', auth, async (req, res) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        await SkillTree.findByIdAndDelete(req.params.id);
        res.json({ message: 'Skill Tree deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ==========================================
// VAULT ITEMS
// ==========================================
router.get('/vault', auth, async (req, res) => {
    try {
        // Filter based on user role/clearance? For now return all valid.
        const items = await VaultItem.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/vault', auth, async (req, res) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res.status(403).json({ message: 'Access denied' });
    }
    const item = new VaultItem({
        ...req.body,
        uploadedBy: req.user._id
    });
    try {
        const newItem = await item.save();
        res.status(201).json(newItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
    // ... POST route
});

router.put('/vault/:id', auth, async (req, res) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        const item = await VaultItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(item);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/vault/:id', auth, async (req, res) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        await VaultItem.findByIdAndDelete(req.params.id);
        res.json({ message: 'Vault Item deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



router.put('/vault/:id', auth, async (req, res) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        const item = await VaultItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(item);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/vault/:id', auth, async (req, res) => {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        await VaultItem.findByIdAndDelete(req.params.id);
        res.json({ message: 'Vault Item deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ==========================================
// NEURAL TUTOR (AI)
// ==========================================
router.get('/tutor/history', auth, async (req, res) => {
    try {
        let chat = await AIChat.findOne({ userId: req.user._id });
        if (!chat) {
            chat = new AIChat({ userId: req.user._id, messages: [] });
            await chat.save();
        }
        res.json(chat);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/tutor/chat', auth, async (req, res) => {
    try {
        const { message } = req.body;
        let chat = await AIChat.findOne({ userId: req.user._id });
        if (!chat) {
            chat = new AIChat({ userId: req.user._id, messages: [] });
        }

        // Add user message
        chat.messages.push({ role: 'user', text: message });

        // Generate AI Response (Simple Logic for now)
        // 1. Check custom responses
        const responses = await TutorResponse.find({ isActive: true });
        let aiText = "Processing data... I do not have a specific protocol for that query yet. Please consult the Archives.";

        for (const resp of responses) {
            if (resp.triggerKeywords.some(k => message.toLowerCase().includes(k.toLowerCase()))) {
                aiText = resp.responseTemplate.replace('{keyword}', message);
                break;
            }
        }

        // Fallback or specific hardcoded easter eggs
        if (message.toLowerCase().includes('hello')) {
            aiText = "Neural Interface Active. I am your Quantum Tutor. How can I assist your learning transmission today?";
        }

        // Add AI message
        const aiMessage = { role: 'ai', text: aiText, timestamp: new Date() };
        chat.messages.push(aiMessage);
        await chat.save();

        res.json({ aiMessage });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin: Manage Tutor Responses
router.post('/tutor/responses', auth, async (req, res) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    const resp = new TutorResponse(req.body);
    try {
        const newResp = await resp.save();
        res.status(201).json(newResp);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
