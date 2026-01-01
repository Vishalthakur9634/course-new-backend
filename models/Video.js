const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String
    },
    summary: {
        type: String
    },
    videoUrl: {
        type: String, // Path to the master .m3u8 file
        required: true
    },
    thumbnailUrl: {
        type: String
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    duration: {
        type: Number // in seconds
    },
    qualities: [{
        type: String // e.g., '1080p', '720p'
    }],
    resources: [{
        title: String,
        filename: String,
        url: String,
        fileType: String, // pdf, doc, zip, etc.
        fileSize: Number, // in bytes
        uploadedAt: { type: Date, default: Date.now }
    }],
    notePdf: {
        type: String // URL/Path to the PDF note
    }
}, { timestamps: true });

module.exports = mongoose.model('Video', videoSchema);
