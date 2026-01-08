const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    budget: {
        type: String,
        required: true
    },
    duration: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Intermediate'
    },
    skills: [{
        type: String
    }],
    proposals: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Open', 'In Progress', 'Completed', 'Closed'],
        default: 'Open'
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    category: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
