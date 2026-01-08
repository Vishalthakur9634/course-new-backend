const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HiringPost',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    portfolioLink: {
        type: String,
        trim: true
    },
    resumeLink: {
        type: String,
        trim: true
    },
    coverNote: {
        type: String,
        maxLength: 5000
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'interview', 'rejected', 'hired'],
        default: 'pending'
    },
    instructorFeedback: {
        type: String
    }
}, {
    timestamps: true
});

// Prevent multiple applications from same student to same job
jobApplicationSchema.index({ jobId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
