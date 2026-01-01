const mongoose = require('mongoose');

const discussionSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    videoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['question', 'discussion', 'announcement'],
        default: 'discussion'
    },
    timestamp: {
        type: Number, // Video timestamp in seconds (if applicable)
        default: 0
    },

    // Replies
    replies: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        content: String,
        createdAt: {
            type: Date,
            default: Date.now
        },
        likes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        isInstructorReply: {
            type: Boolean,
            default: false
        }
    }],

    // Engagement
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    viewCount: {
        type: Number,
        default: 0
    },

    // Status
    isSolved: {
        type: Boolean,
        default: false
    },
    solvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    isLocked: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Indexes
discussionSchema.index({ courseId: 1, createdAt: -1 });
discussionSchema.index({ videoId: 1 });
discussionSchema.index({ userId: 1 });

module.exports = mongoose.model('Discussion', discussionSchema);
