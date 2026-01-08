const mongoose = require('mongoose');

const codeSnippetSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    language: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    isPublic: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('CodeSnippet', codeSnippetSchema);
