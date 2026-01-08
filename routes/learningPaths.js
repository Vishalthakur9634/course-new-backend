const express = require('express');
const router = express.Router();
const LearningPath = require('../models/LearningPath');
const User = require('../models/User');
const { authenticate, optionalAuthenticate } = require('../middleware/rbac');

// Get all public learning paths
router.get('/', optionalAuthenticate, async (req, res) => {
    try {
        const paths = await LearningPath.find({ isPublic: true })
            .populate('instructorId', 'name avatar')
            .populate('courses.courseId', 'title thumbnail');

        if (req.user) {
            const user = await User.findById(req.user.id);
            const enrichedPaths = paths.map(path => {
                const enrollment = user.enrolledLearningPaths?.find(
                    ep => ep.pathId.toString() === path._id.toString()
                );
                return {
                    ...path.toObject(),
                    progress: enrollment ? enrollment.progress : 0,
                    isEnrolled: !!enrollment
                };
            });
            return res.json(enrichedPaths);
        }

        res.json(paths.map(p => ({ ...p.toObject(), progress: 0 })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a specific learning path
router.get('/:id', async (req, res) => {
    try {
        const path = await LearningPath.findById(req.params.id)
            .populate('instructorId', 'name avatar')
            .populate('courses.courseId');
        if (!path) return res.status(404).json({ message: 'Learning path not found' });
        res.json(path);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new learning path (Instructor only)
router.post('/', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'instructor' && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Only instructors can create learning paths' });
        }
        const newPath = new LearningPath({
            ...req.body,
            instructorId: req.user.id
        });
        await newPath.save();
        res.status(201).json(newPath);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Enroll in a learning path
router.post('/enroll/:id', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const path = await LearningPath.findById(req.params.id);

        if (!path) return res.status(404).json({ message: 'Learning path not found' });

        const isAlreadyEnrolled = user.enrolledLearningPaths?.some(
            ep => ep.pathId.toString() === path._id.toString()
        );

        if (isAlreadyEnrolled) {
            return res.status(400).json({ message: 'Already enrolled in this path' });
        }

        user.enrolledLearningPaths.push({
            pathId: path._id,
            enrolledAt: new Date(),
            progress: 0
        });

        path.enrolledCount += 1;
        await Promise.all([user.save(), path.save()]);

        res.json({ message: 'Enrolled successfully', pathId: path._id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Unenroll from a learning path
router.post('/unenroll/:id', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const path = await LearningPath.findById(req.params.id);

        user.enrolledLearningPaths = user.enrolledLearningPaths.filter(
            ep => ep.pathId.toString() !== req.params.id
        );

        if (path && path.enrolledCount > 0) {
            path.enrolledCount -= 1;
            await path.save();
        }

        await user.save();
        res.json({ message: 'Unenrolled successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
