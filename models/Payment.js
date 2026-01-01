const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    // Buyer
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userId: { // Keep for backward compatibility
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Course & Instructor
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Amounts
    amount: {
        type: Number, // Total amount paid
        required: true
    },
    originalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    couponCode: {
        type: String,
        default: ''
    },

    // Revenue Split
    platformFeePercentage: {
        type: Number,
        default: 20 // 20% platform fee
    },
    platformFee: {
        type: Number,
        required: true
    },
    instructorEarning: {
        type: Number, // Amount instructor receives
        required: true
    },

    // Payment Method
    paymentMethod: {
        type: String,
        enum: ['card', 'upi', 'netbanking', 'wallet', 'paypal', 'stripe', 'test_mode'],
        required: true
    },
    paymentGateway: {
        type: String,
        default: 'stripe'
    },

    // Status
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    transactionId: {
        type: String,
        unique: true,
        sparse: true
    },
    gatewayResponse: {
        type: mongoose.Schema.Types.Mixed
    },

    // Payout to Instructor
    payoutStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    payoutDate: {
        type: Date
    },
    payoutTransactionId: {
        type: String
    },

    // Enrollment Link
    enrollmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Enrollment'
    },

    // Refund
    isRefunded: {
        type: Boolean,
        default: false
    },
    refundReason: {
        type: String
    },
    refundedAt: {
        type: Date
    },
    refundAmount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Indexes
paymentSchema.index({ studentId: 1 });
paymentSchema.index({ instructorId: 1 });
paymentSchema.index({ courseId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ payoutStatus: 1 });
// transactionId index removed (already unique in schema)

module.exports = mongoose.model('Payment', paymentSchema);
