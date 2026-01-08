const express = require('express');
const router = express.Router();
const HiringPost = require('../models/HiringPost');
const JobApplication = require('../models/JobApplication');
const { authenticate } = require('../middleware/rbac');

// Middleware to check if user is instructor
const isInstructor = (req, res, next) => {
    if (req.user.role !== 'instructor' && req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Access denied. Instructors only.' });
    }
    next();
};

// @route   POST /api/hiring
// @desc    Create a new job post
// @access  Instructor
router.post('/', authenticate, isInstructor, async (req, res) => {
    try {
        const { title, company, description, requirements, location, type, salaryRange, skills, deadline } = req.body;

        const newPost = new HiringPost({
            title,
            company,
            description,
            requirements,
            location,
            type,
            salaryRange,
            skills,
            deadline,
            postedBy: req.user.id
        });

        const savedPost = await newPost.save();
        res.status(201).json(savedPost);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/hiring
// @desc    Get all active public job posts
// @access  Public (or Authenticated) - Authenticated for now
router.get('/', authenticate, async (req, res) => {
    try {
        const jobs = await HiringPost.find({ status: 'active' })
            .populate('postedBy', 'name avatar')
            .sort({ createdAt: -1 });
        res.json(jobs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/hiring/my-posts
// @desc    Get posts created by current instructor
// @access  Instructor
router.get('/my-posts', authenticate, isInstructor, async (req, res) => {
    try {
        const jobs = await HiringPost.find({ postedBy: req.user.id })
            .sort({ createdAt: -1 });

        // Get application counts for each job
        const jobsWithCounts = await Promise.all(jobs.map(async (job) => {
            const appCount = await JobApplication.countDocuments({ jobId: job._id });
            return { ...job.toObject(), applicationCount: appCount };
        }));

        res.json(jobsWithCounts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/hiring/:id
// @desc    Get specific job details
// @access  Authenticated
router.get('/:id', authenticate, async (req, res) => {
    try {
        const job = await HiringPost.findById(req.params.id).populate('postedBy', 'name avatar email');
        if (!job) return res.status(404).json({ message: 'Job not found' });
        res.json(job);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/hiring/:id/apply
// @desc    Apply for a job
// @access  Student
router.post('/:id/apply', authenticate, async (req, res) => {
    try {
        const job = await HiringPost.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        if (job.status !== 'active') {
            return res.status(400).json({ message: 'This job is no longer accepting applications' });
        }

        // Check if already applied
        const existingApp = await JobApplication.findOne({ jobId: req.params.id, studentId: req.user.id });
        if (existingApp) {
            return res.status(400).json({ message: 'You have already applied to this job' });
        }

        const { portfolioLink, resumeLink, coverNote } = req.body;

        const newApplication = new JobApplication({
            jobId: req.params.id,
            studentId: req.user.id,
            portfolioLink,
            resumeLink,
            coverNote
        });

        await newApplication.save();

        // Add student to applicants array in HiringPost (optional, for quick lookup)
        job.applicants.push(req.user.id);
        await job.save();

        res.status(201).json({ message: 'Application submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/hiring/:id/applications
// @desc    Get all applications for a specific job
// @access  Instructor (Owner only)
router.get('/:id/applications', authenticate, isInstructor, async (req, res) => {
    try {
        const job = await HiringPost.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        if (job.postedBy.toString() !== req.user.id && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Not authorized to view these applications' });
        }

        const applications = await JobApplication.find({ jobId: req.params.id })
            .populate('studentId', 'name email avatar')
            .sort({ createdAt: -1 });

        res.json(applications);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PATCH /api/hiring/applications/:appId
// @desc    Update application status
// @access  Instructor
router.patch('/applications/:appId', authenticate, isInstructor, async (req, res) => {
    try {
        const { status, feedback } = req.body;
        const application = await JobApplication.findById(req.params.appId).populate('jobId');

        if (!application) return res.status(404).json({ message: 'Application not found' });

        // Check ownership via populated job
        if (application.jobId.postedBy.toString() !== req.user.id && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        application.status = status;
        if (feedback) application.instructorFeedback = feedback;

        await application.save();
        res.json(application);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
