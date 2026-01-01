const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
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
    enrolledAt: {
        type: Date,
        default: Date.now
    },

    // Progress Tracking
    progress: {
        type: Number, // Percentage 0-100
        default: 0
    },
    completedVideos: [{
        videoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Video'
        },
        completedAt: {
            type: Date,
            default: Date.now
        },
        timeSpent: {
            type: Number, // seconds
            default: 0
        }
    }],
    totalTimeSpent: {
        type: Number, // Total seconds spent on course
        default: 0
    },
    lastAccessedAt: {
        type: Date,
        default: Date.now
    },
    lastAccessedVideo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video'
    },

    // Completion
    isCompleted: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date
    },
    certificateIssued: {
        type: Boolean,
        default: false
    },
    certificateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Certificate'
    },

    // Engagement
    hasReviewed: {
        type: Boolean,
        default: false
    },
    reviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review'
    },

    // Notes
    notes: [{
        videoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Video'
        },
        timestamp: Number, // seconds
        content: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

// Compound index to ensure one enrollment per student per course
enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
enrollmentSchema.index({ courseId: 1 });
enrollmentSchema.index({ instructorId: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
