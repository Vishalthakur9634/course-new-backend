const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String, // e.g., "10:00 AM - 12:00 PM"
        required: true
    },
    location: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Workshop', 'Conference', 'Webinar', 'Meetup', 'Keynote'],
        default: 'Webinar'
    },
    attendees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    thumbnail: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
