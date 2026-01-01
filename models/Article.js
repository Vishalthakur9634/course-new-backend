const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        sparse: true
    },
    content: {
        type: String,
        required: true
    },
    coverImage: {
        type: String,
        default: ''
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tags: [{
        type: String
    }],
    category: {
        type: String,
        default: 'general'
    },
    videoUrl: {
        type: String,
        default: ''
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    views: {
        type: Number,
        default: 0
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

// Pre-save middleware to generate slug
articleSchema.pre('save', async function () {
    if (this.isModified('title') && this.title) {
        const baseSlug = this.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s-]+/g, '-')
            .replace(/^-+|-+$/g, '');

        // Add unique suffix to ensure uniqueness
        this.slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;
    }
});

module.exports = mongoose.model('Article', articleSchema);