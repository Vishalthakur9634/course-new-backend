const mongoose = require('mongoose');

const practiceSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    attachments: [{
        name: String,
        url: String,
        type: String // 'pdf', 'ppt', etc.
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Practice 2.0 Fields
    type: {
        type: String,
        enum: ['subjective', 'coding'],
        default: 'subjective'
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        default: 'Easy'
    },
    points: {
        type: Number,
        default: 10
    },
    starterCode: {
        type: String // For coding problems
    },
    testCases: [{
        input: String,
        expectedOutput: String,
        hidden: { type: Boolean, default: false }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Practice', practiceSchema);
