const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true
    },
    maxDiscount: {
        type: Number, // Max discount for percentage type
        default: 0
    },
    minPurchase: {
        type: Number,
        default: 0
    },

    // Applicability
    applicableTo: {
        type: String,
        enum: ['all', 'specific_courses', 'specific_categories', 'specific_instructors'],
        default: 'all'
    },
    courses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    categories: [{
        type: String
    }],
    instructors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Usage Limits
    usageLimit: {
        type: Number,
        default: 0 // 0 means unlimited
    },
    usedCount: {
        type: Number,
        default: 0
    },
    perUserLimit: {
        type: Number,
        default: 1
    },

    // Validity
    validFrom: {
        type: Date,
        required: true
    },
    validUntil: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },

    // Creator
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Can be instructor or superadmin
    },
    creatorType: {
        type: String,
        enum: ['instructor', 'superadmin'],
        required: true
    }
}, { timestamps: true });

// Indexes
// couponSchema.index({ code: 1 }); // Removed duplicate index
couponSchema.index({ validFrom: 1, validUntil: 1 });
couponSchema.index({ isActive: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
