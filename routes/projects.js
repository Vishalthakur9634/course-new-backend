const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { authenticate } = require('../middleware/rbac');

// Get all open projects
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find({ status: 'Open' })
            .populate('postedBy', 'name avatar');
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a specific project
router.get('/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('postedBy', 'name avatar');
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new project
router.post('/', authenticate, async (req, res) => {
    try {
        if (!['instructor', 'superadmin', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Only instructors and admins can list projects' });
        }
        const newProject = new Project({
            ...req.body,
            postedBy: req.user.id
        });
        await newProject.save();
        res.status(201).json(newProject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a project
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Only allow the poster or superadmin/admin to delete
        if (project.postedBy.toString() !== req.user.id && req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await project.deleteOne();
        res.json({ message: 'Project removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const ProjectApplication = require('../models/ProjectApplication');

// Apply for a project
router.post('/:id/apply', authenticate, async (req, res) => {
    try {
        const { proposal } = req.body;
        const projectId = req.params.id;

        const alreadyApplied = await ProjectApplication.findOne({ projectId, userId: req.user.id });
        if (alreadyApplied) {
            return res.status(400).json({ message: 'You have already applied for this project' });
        }

        const application = new ProjectApplication({
            projectId,
            userId: req.user.id,
            proposal
        });

        await application.save();
        res.status(201).json({ message: 'Application submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user's applications
router.get('/my/applications', authenticate, async (req, res) => {
    try {
        const applications = await ProjectApplication.find({ userId: req.user.id })
            .populate('projectId');
        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
