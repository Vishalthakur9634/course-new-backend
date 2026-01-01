const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    videoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Number, // Time in video (seconds) where note was taken
        default: 0
    },
    attachments: [{
        filename: String,
        url: String,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now }
    }],
    isPublic: {
        type: Boolean,
        default: false // Private by default
    }
}, { timestamps: true });

// Indexes
noteSchema.index({ userId: 1, videoId: 1 });
noteSchema.index({ courseId: 1 });

module.exports = mongoose.model('Note', noteSchema);
