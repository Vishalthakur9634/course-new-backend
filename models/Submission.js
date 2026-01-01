const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    problemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Practice',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    code: {
        type: String, // Submitted code
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Passed', 'Failed'],
        default: 'Pending'
    },
    grade: {
        type: Number,
        default: 0
    },
    feedback: {
        type: String
    },
    testResults: [{
        input: String,
        expectedOutput: String,
        actualOutput: String,
        passed: Boolean
    }]
}, {
    timestamps: true
});

submissionSchema.index({ problemId: 1, studentId: 1 }); // Efficient lookup of student's submission for a problem

module.exports = mongoose.model('Submission', submissionSchema);
