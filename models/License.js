const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
    partnerName: {
        type: String,
        required: true,
        trim: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    type: {
        type: String,
        enum: ['Enterprise (unlimited)', 'Academic (500 seats)', 'Corporate (100 seats)', 'Custom'],
        default: 'Enterprise (unlimited)'
    },
    expiryDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'pending', 'cancelled'],
        default: 'active'
    },
    revenue: {
        type: Number,
        required: true
    },
    instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('License', licenseSchema);
