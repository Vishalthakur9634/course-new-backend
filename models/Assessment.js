const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
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
    questions: [{
        type: { type: String, enum: ['mcq', 'coding', 'subjective'], default: 'mcq' },
        questionText: { type: String, required: true },
        // For MCQ
        options: [{ type: String }],
        correctAnswerIndex: { type: Number },
        // For Coding
        starterCode: { type: String },
        testCases: [{
            input: String,
            expectedOutput: String,
            hidden: { type: Boolean, default: false }
        }],
        // For all
        points: { type: Number, default: 1 }
    }],
    passingScore: {
        type: Number,
        default: 70 // Percentage
    },
    durationLimit: {
        type: Number, // in minutes, 0 for unlimited
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Assessment', assessmentSchema);
