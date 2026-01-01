const express = require('express');
const router = express.Router();
const { authenticate, requireInstructor, requireSuperAdmin } = require('../middleware/rbac');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Bundle = require('../models/Bundle');
const Assessment = require('../models/Assessment');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const Coupon = require('../models/Coupon');

// --- SUBSCRIPTION PLANS (Super Admin Managed) ---

// Get all active plans (Public/Auth)
router.get('/plans', async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find({ isActive: true });
        res.json(plans);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching plans', error: error.message });
    }
});

// Create a plan (Super Admin only)
router.post('/plans', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const plan = new SubscriptionPlan(req.body);
        await plan.save();
        res.status(201).json(plan);
    } catch (error) {
        res.status(500).json({ message: 'Error creating plan', error: error.message });
    }
});

// Update a plan (Super Admin only)
router.put('/plans/:id', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(plan);
    } catch (error) {
        res.status(500).json({ message: 'Error updating plan', error: error.message });
    }
});


// --- COURSE BUNDLES (Instructor/Admin Managed) ---

// Get all active bundles
router.get('/bundles', async (req, res) => {
    try {
        const bundles = await Bundle.find({ isActive: true }).populate('courses', 'title price thumbnail');
        res.json(bundles);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bundles', error: error.message });
    }
});

// Create a bundle (Instructor/SuperAdmin)
router.post('/bundles', authenticate, requireInstructor, async (req, res) => {
    try {
        const bundle = new Bundle({
            ...req.body,
            instructorId: req.user._id
        });
        await bundle.save();
        res.status(201).json(bundle);
    } catch (error) {
        res.status(500).json({ message: 'Error creating bundle', error: error.message });
    }
});

// Get instructor's own bundles
router.get('/bundles/my-bundles', authenticate, requireInstructor, async (req, res) => {
    try {
        const bundles = await Bundle.find({ instructorId: req.user._id }).populate('courses', 'title price thumbnail');
        res.json(bundles);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching your bundles', error: error.message });
    }
});

// Delete a bundle
router.delete('/bundles/:id', authenticate, requireInstructor, async (req, res) => {
    try {
        const bundle = await Bundle.findOneAndDelete({ _id: req.params.id, instructorId: req.user._id });
        if (!bundle) return res.status(404).json({ message: 'Bundle not found or unauthorized' });
        res.json({ message: 'Bundle deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting bundle', error: error.message });
    }
});


// --- ASSESSMENTS (Instructor Managed) ---

// Get assessment for a specific course
router.get('/assessments/:courseId', async (req, res) => {
    try {
        const assessment = await Assessment.findOne({ courseId: req.params.courseId });
        res.json(assessment);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching assessment', error: error.message });
    }
});

// Create/Update assessment
router.post('/assessments', authenticate, requireInstructor, async (req, res) => {
    try {
        const { courseId } = req.body;
        let assessment = await Assessment.findOne({ courseId });

        if (assessment) {
            assessment = await Assessment.findByIdAndUpdate(assessment._id, req.body, { new: true });
        } else {
            assessment = new Assessment({
                ...req.body,
                instructorId: req.user._id
            });
            await assessment.save();
        }
        res.json(assessment);
    } catch (error) {
        res.status(500).json({ message: 'Error saving assessment', error: error.message });
    }
});

// Submit an assessment (Student)
router.post('/assessments/:id/submit', authenticate, async (req, res) => {
    try {
        const submission = new AssessmentSubmission({
            assessmentId: req.params.id,
            studentId: req.user._id,
            answers: req.body.answers,
            totalScore: req.body.totalScore,
            status: 'Submitted',
            submittedAt: new Date()
        });
        await submission.save();
        res.status(201).json(submission);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting assessment', error: error.message });
    }
});

// Get student's submission for an assessment
router.get('/assessments/:id/my-submission', authenticate, async (req, res) => {
    try {
        const submission = await AssessmentSubmission.findOne({
            assessmentId: req.params.id,
            studentId: req.user._id
        }).sort({ createdAt: -1 });
        res.json(submission);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching submission', error: error.message });
    }
});


// --- COUPONS (Instructor/Admin) ---

// Get coupons created by instructor
router.get('/coupons', authenticate, requireInstructor, async (req, res) => {
    try {
        const coupons = await Coupon.find({ createdBy: req.user._id });
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching coupons', error: error.message });
    }
});

// Create a coupon
router.post('/coupons', authenticate, requireInstructor, async (req, res) => {
    try {
        const coupon = new Coupon({
            ...req.body,
            createdBy: req.user._id,
            creatorType: req.user.role === 'superadmin' ? 'superadmin' : 'instructor'
        });
        await coupon.save();
        res.status(201).json(coupon);
    } catch (error) {
        res.status(500).json({ message: 'Error creating coupon', error: error.message });
    }
});

// Get all submissions for an assessment (Instructor)
router.get('/assessments/:id/submissions', authenticate, requireInstructor, async (req, res) => {
    try {
        const submissions = await AssessmentSubmission.find({ assessmentId: req.params.id })
            .populate('studentId', 'name email avatar')
            .sort({ createdAt: -1 });
        res.json(submissions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching assessment submissions', error: error.message });
    }
});

// Grade an assessment submission (Instructor)
router.put('/assessment-submissions/:id/grade', authenticate, requireInstructor, async (req, res) => {
    try {
        const { answers, totalScore, status } = req.body;
        const submission = await AssessmentSubmission.findByIdAndUpdate(req.params.id, {
            answers,
            totalScore,
            status: status || 'Graded'
        }, { new: true });
        res.json(submission);
    } catch (error) {
        res.status(500).json({ message: 'Error grading assessment', error: error.message });
    }
});

module.exports = router;
