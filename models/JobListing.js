const mongoose = require('mongoose');

const jobListingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    company: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'],
        default: 'Full-time'
    },
    category: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    requirements: [{
        type: String
    }],
    salary: {
        type: String, // e.g., "$100k - $120k"
        default: 'Negotiable'
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    applicationUrl: {
        type: String
    },
    status: {
        type: String,
        enum: ['Open', 'Closed', 'Filled'],
        default: 'Open'
    },
    skills: [{
        type: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('JobListing', jobListingSchema);
