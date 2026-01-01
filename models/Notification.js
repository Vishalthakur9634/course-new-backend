const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: [
            'course_published',
            'course_approved',
            'course_rejected',
            'new_enrollment',
            'course_completed',
            'certificate_issued',
            'new_review',
            'payment_received',
            'payout_processed',
            'instructor_approved',
            'system_announcement',
            'course_update',
            'new_message',
            'new_follower'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    link: {
        type: String, // URL to navigate to
        default: ''
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed // Additional data
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    }
}, { timestamps: true });

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
