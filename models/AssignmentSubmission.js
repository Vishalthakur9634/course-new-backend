const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    assignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    submissionUrl: {
        type: String,
        required: true
    },
    submissionName: {
        type: String
    },
    submissionText: {
        type: String
    },
    status: {
        type: String,
        enum: ['Pending', 'Graded'],
        default: 'Pending'
    },
    grade: {
        type: Number
    },
    feedback: {
        type: String
    },
    gradedAt: {
        type: Date
    }
}, { timestamps: true });

submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ studentId: 1 });

module.exports = mongoose.model('AssignmentSubmission', submissionSchema);
