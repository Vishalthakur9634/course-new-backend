const mongoose = require('mongoose');

const hiringPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    company: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    requirements: [{
        type: String
    }],
    location: {
        type: String, // e.g., "Remote", "New York, NY"
        required: true
    },
    type: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
        default: 'Full-time'
    },
    salaryRange: {
        min: Number,
        max: Number,
        currency: {
            type: String,
            default: 'USD'
        }
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    applicants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    status: {
        type: String,
        enum: ['active', 'closed', 'draft'],
        default: 'active'
    },
    skills: [{
        type: String
    }],
    deadline: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('HiringPost', hiringPostSchema);
