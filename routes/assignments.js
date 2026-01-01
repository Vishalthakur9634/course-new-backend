const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const { authenticate, requireInstructor } = require('../middleware/rbac');

// --- Instructor Routes ---

// Create assignment
router.post('/', authenticate, requireInstructor, async (req, res) => {
    try {
        const { title, description, courseId, dueDate, points, attachmentUrl, attachmentName } = req.body;
        console.log('Creating assignment with data:', {
            title, description, courseId, dueDate, points,
            instructorId: req.user._id
        });
        const assignment = new Assignment({
            title,
            description,
            courseId,
            instructorId: req.user._id,
            dueDate,
            points,
            attachmentUrl,
            attachmentName
        });
        await assignment.save();
        console.log('Assignment created successfully:', assignment._id);
        res.status(201).json(assignment);
    } catch (error) {
        console.error('Error creating assignment:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code,
            errors: error.errors
        });
        res.status(500).json({ message: 'Error creating assignment', error: error.message });
    }
});

// Update assignment
router.put('/:id', authenticate, requireInstructor, async (req, res) => {
    try {
        const assignment = await Assignment.findOneAndUpdate(
            { _id: req.params.id, instructorId: req.user._id },
            req.body,
            { new: true }
        );
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
        res.json(assignment);
    } catch (error) {
        res.status(500).json({ message: 'Error updating assignment' });
    }
});

// Delete assignment
router.delete('/:id', authenticate, requireInstructor, async (req, res) => {
    try {
        const assignment = await Assignment.findOneAndDelete({ _id: req.params.id, instructorId: req.user._id });
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
        res.json({ message: 'Assignment deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting assignment' });
    }
});

// Get submissions for an assignment
router.get('/:id/submissions', authenticate, requireInstructor, async (req, res) => {
    try {
        const submissions = await AssignmentSubmission.find({ assignmentId: req.params.id })
            .populate('studentId', 'name email avatar')
            .sort({ createdAt: -1 });
        res.json(submissions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching submissions' });
    }
});

// Grade a submission
router.put('/submissions/:submissionId/grade', authenticate, requireInstructor, async (req, res) => {
    try {
        const { grade, feedback } = req.body;
        const submission = await AssignmentSubmission.findById(req.params.submissionId)
            .populate('assignmentId');

        if (!submission) return res.status(404).json({ message: 'Submission not found' });

        // Ensure the current instructor owns the assignment
        if (submission.assignmentId.instructorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized to grade this assignment' });
        }

        submission.grade = grade;
        submission.feedback = feedback;
        submission.status = 'Graded';
        submission.gradedAt = Date.now();
        await submission.save();

        res.json(submission);
    } catch (error) {
        console.error('Grading error:', error);
        res.status(500).json({ message: 'Error grading submission' });
    }
});

// --- Common/Student Routes ---

// Get assignments for a course
router.get('/course/:courseId', authenticate, async (req, res) => {
    try {
        const assignments = await Assignment.find({ courseId: req.params.courseId })
            .sort({ dueDate: 1 });
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching assignments' });
    }
});

// Submit an assignment
router.post('/:id/submit', authenticate, async (req, res) => {
    try {
        const { submissionUrl, submissionName, submissionText } = req.body;

        // Check if already submitted
        const existing = await AssignmentSubmission.findOne({
            assignmentId: req.params.id,
            studentId: req.user._id
        });

        if (existing) {
            existing.submissionUrl = submissionUrl;
            existing.submissionName = submissionName;
            existing.submissionText = submissionText;
            existing.status = 'Pending'; // Reset to pending if re-submitted
            await existing.save();
            return res.json(existing);
        }

        const submission = new AssignmentSubmission({
            assignmentId: req.params.id,
            studentId: req.user._id,
            submissionUrl,
            submissionName,
            submissionText
        });
        await submission.save();
        res.status(201).json(submission);
    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ message: 'Error submitting assignment' });
    }
});

// Get student's submission for an assignment
router.get('/:id/my-submission', authenticate, async (req, res) => {
    try {
        const submission = await AssignmentSubmission.findOne({
            assignmentId: req.params.id,
            studentId: req.user._id
        });
        res.json(submission);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching submission' });
    }
});

module.exports = router;
