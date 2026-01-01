const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const Payment = require('../models/Payment');
const { authenticate } = require('../middleware/rbac');

// Get My Purchase History
router.get('/my-history', authenticate, async (req, res) => {
    try {
        const history = await Payment.find({ studentId: req.user.id })
            .populate('courseId', 'title thumbnail')
            .sort({ createdAt: -1 });
        res.json(history);
    } catch (error) {
        console.error('Error fetching purchase history:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Simulated Payment Endpoint
router.post('/purchase', async (req, res) => {
    try {
        const { userId, courseId, paymentDetails } = req.body;

        if (!userId || !courseId) {
            return res.status(400).json({ message: 'User ID and Course ID are required' });
        }

        // 1. Verify User and Course exist
        const user = await User.findById(userId);
        const course = await Course.findById(courseId);

        if (!user) return res.status(404).json({ message: 'User not found' });
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // 2. Check if already purchased
        if (user.enrolledCourses && user.enrolledCourses.some(c => c.courseId.toString() === courseId)) {
            return res.status(400).json({ message: 'Course already purchased' });
        }

        // 3. Simulate Payment Processing
        console.log(`Processing payment for user ${user.email} for course ${course.title} - Amount: ${course.price}`);

        // Create a payment record
        const payment = new Payment({
            studentId: userId,
            courseId: courseId,
            amount: course.price,
            currency: 'USD',
            status: 'completed',
            paymentMethod: 'credit_card',
            transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            paymentDetails: {
                last4: paymentDetails?.cardNumber?.slice(-4) || '0000',
                brand: 'Visa'
            }
        });

        await payment.save();

        // 4. Handle Referral Commission
        // Check req.body.referralCode
        const { referralCode } = req.body;
        if (referralCode) {
            const referrer = await User.findOne({ referralCode });
            // Prevent self-referral
            if (referrer && referrer._id.toString() !== userId) {
                const commissionRate = 0.10; // 10%
                const commission = course.price * commissionRate;

                // Update Referrer
                referrer.referralStats.totalEarnings = (referrer.referralStats.totalEarnings || 0) + commission;
                referrer.earnings.pending = (referrer.earnings.pending || 0) + commission; // Add to accessible earnings
                referrer.referralStats.totalReferrals = (referrer.referralStats.totalReferrals || 0) + 1;
                await referrer.save();

                console.log(`Commission of $${commission} recorded for referrer ${referrer.email}`);

                // Ideally, create a Transaction record for the referrer too
            }
        }

        // Return success with payment ID so frontend can call enroll
        res.json({
            success: true,
            message: 'Payment successful',
            paymentId: payment._id
        });

    } catch (error) {
        console.error('Payment Error:', error);
        res.status(500).json({ message: 'Server error during payment processing' });
    }
});

module.exports = router;
