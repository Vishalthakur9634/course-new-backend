const mongoose = require('mongoose');

const mentorshipSessionSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    mentorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    topic: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'scheduled', 'completed', 'cancelled'],
        default: 'pending'
    },
    scheduledDate: {
        type: Date
    },
    duration: {
        type: Number, // in minutes
        default: 60
    },
    meetingLink: {
        type: String
    },
    price: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('MentorshipSession', mentorshipSessionSchema);
