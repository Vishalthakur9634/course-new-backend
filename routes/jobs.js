const express = require('express');
const router = express.Router();
const JobListing = require('../models/JobListing');
const { authenticate } = require('../middleware/rbac');

// Get all open jobs
router.get('/', async (req, res) => {
    try {
        const jobs = await JobListing.find({ status: 'Open' })
            .populate('postedBy', 'name avatar');
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a specific job
router.get('/:id', async (req, res) => {
    try {
        const job = await JobListing.findById(req.params.id)
            .populate('postedBy', 'name avatar');
        if (!job) return res.status(404).json({ message: 'Job not found' });
        res.json(job);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Post a new job
router.post('/', authenticate, async (req, res) => {
    try {
        if (!['instructor', 'superadmin', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Only instructors and admins can post jobs' });
        }
        const newJob = new JobListing({
            ...req.body,
            postedBy: req.user.id
        });
        await newJob.save();
        res.status(201).json(newJob);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a job
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const job = await JobListing.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // Only allow the poster or superadmin/admin to delete
        if (job.postedBy.toString() !== req.user.id && req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await job.deleteOne();
        res.json({ message: 'Job listing removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const JobApplication = require('../models/JobApplication');

// Apply for a job
router.post('/:id/apply', authenticate, async (req, res) => {
    try {
        const { resume, coverLetter } = req.body;
        const jobId = req.params.id;

        const alreadyApplied = await JobApplication.findOne({ jobId, userId: req.user.id });
        if (alreadyApplied) {
            return res.status(400).json({ message: 'You have already applied for this job' });
        }

        const application = new JobApplication({
            jobId,
            userId: req.user.id,
            resume,
            coverLetter
        });

        await application.save();
        res.status(201).json({ message: 'Application submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
