const mongoose = require('mongoose');

const interviewSessionSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        required: true, // e.g., 'Software Engineer', 'Product Manager'
        enum: ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Product Manager', 'UX Designer']
    },
    difficulty: {
        type: String,
        enum: ['Junior', 'Mid-Level', 'Senior'],
        default: 'Junior'
    },
    transcript: [{
        speaker: {
            type: String,
            enum: ['AI', 'User'],
            required: true
        },
        text: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    feedback: [{
        question: String,
        userAnswer: String,
        aiFeedback: String,
        rating: Number // 1-10
    }],
    scores: {
        technical: { type: Number, default: 0 },
        communication: { type: Number, default: 0 },
        problemSolving: { type: Number, default: 0 },
        overall: { type: Number, default: 0 }
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'abandoned'],
        default: 'active'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
