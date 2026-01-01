const mongoose = require('mongoose');

const assessmentSubmissionSchema = new mongoose.Schema({
    assessmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assessment',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    answers: [{
        questionId: String,
        type: { type: String, enum: ['mcq', 'coding', 'subjective'] },
        mcqAnswer: Number, // Index of selected option
        codeAnswer: String, // Stringified code
        subjectiveAnswer: String, // Text answer or file URL
        isCorrect: { type: Boolean, default: false },
        score: { type: Number, default: 0 },
        feedback: String
    }],
    totalScore: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['InProgress', 'Submitted', 'Graded'],
        default: 'InProgress'
    },
    timeSpent: Number, // in seconds
    submittedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('AssessmentSubmission', assessmentSubmissionSchema);
