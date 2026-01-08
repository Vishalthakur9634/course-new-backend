const mongoose = require('mongoose');

const learningPathSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['development', 'data-science', 'design', 'business', 'marketing', 'other']
    },
    difficulty: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Beginner'
    },
    courses: [{
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        milestone: { type: String }
    }],
    duration: {
        type: String, // e.g., "6 months"
        default: 'Flexible'
    },
    enrolledCount: {
        type: Number,
        default: 0
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    thumbnail: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('LearningPath', learningPathSchema);
