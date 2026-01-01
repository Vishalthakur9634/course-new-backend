const express = require('express');
const router = express.Router();
const Practice = require('../models/Practice');
const Course = require('../models/Course');
const { authenticate, requireInstructor } = require('../middleware/rbac');
const Submission = require('../models/Submission');

// Get all practice problems for a course
router.get('/course/:courseId', authenticate, async (req, res) => {
    try {
        const problems = await Practice.find({ courseId: req.params.courseId })
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name');
        res.json(problems);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching practice problems', error: error.message });
    }
});

// Create a new practice problem (Instructor only)
router.post('/', authenticate, requireInstructor, async (req, res) => {
    try {
        const { courseId, title, description, attachments, type, difficulty, points, starterCode, testCases } = req.body;

        const problem = new Practice({
            courseId,
            title,
            description,
            attachments,
            type,
            difficulty,
            points,
            starterCode,
            testCases,
            createdBy: req.user._id
        });

        await problem.save();
        res.status(201).json(problem);
    } catch (error) {
        res.status(500).json({ message: 'Error creating practice problem', error: error.message });
    }
});

// Delete a practice problem (Instructor only)
router.delete('/:id', authenticate, requireInstructor, async (req, res) => {
    try {
        const problem = await Practice.findById(req.params.id);

        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }

        // Verify ownership (optional but recommended)
        if (problem.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await Practice.findByIdAndDelete(req.params.id);
        res.json({ message: 'Problem deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting problem', error: error.message });
    }
});

// [NEW] Submit a solution
router.post('/:id/submit', authenticate, async (req, res) => {
    try {
        const { code, status, grade, feedback, testResults } = req.body;

        // For now, simple create new submission record
        // In future: update existing pending submission if exists
        const submission = new Submission({
            problemId: req.params.id,
            studentId: req.user._id,
            code,
            status,
            grade,
            feedback,
            testResults
        });

        await submission.save();
        res.status(201).json(submission);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting solution', error: error.message });
    }
});

// [NEW] Get submissions for a problem
router.get('/:id/submissions', authenticate, async (req, res) => {
    try {
        const query = { problemId: req.params.id };

        // Students can only see their own submissions
        if (req.user.role === 'student') {
            query.studentId = req.user._id;
        }

        const submissions = await Submission.find(query)
            .sort({ createdAt: -1 })
            .populate('studentId', 'name email avatar');

        res.json(submissions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching submissions', error: error.message });
    }
});

// [NEW] Get submissions for all problems in a course (Instructor only)
router.get('/course/:courseId/submissions', authenticate, requireInstructor, async (req, res) => {
    try {
        const problems = await Practice.find({ courseId: req.params.courseId }).select('_id');
        const problemIds = problems.map(p => p._id);
        const submissions = await Submission.find({ problemId: { $in: problemIds } })
            .sort({ createdAt: -1 })
            .populate('studentId', 'name email avatar')
            .populate('problemId', 'title type points');
        res.json(submissions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching course submissions', error: error.message });
    }
});

// [NEW] Grade a submission
router.put('/submission/:id/grade', authenticate, requireInstructor, async (req, res) => {
    try {
        const { grade, feedback, status } = req.body;
        const submission = await Submission.findByIdAndUpdate(req.params.id, {
            grade,
            feedback,
            status: status || 'Graded'
        }, { new: true });
        res.json(submission);
    } catch (error) {
        res.status(500).json({ message: 'Error grading submission', error: error.message });
    }
});

module.exports = router;
