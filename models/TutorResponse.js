const mongoose = require('mongoose');

const tutorResponseSchema = new mongoose.Schema({
    triggerKeywords: [{
        type: String
    }],
    responseTemplate: {
        type: String, // "Based on your query about {keyword}..."
        required: true
    },
    category: String,
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('TutorResponse', tutorResponseSchema);
