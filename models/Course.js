const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    subtitle: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    discountPrice: {
        type: Number,
        default: 0
    },
    thumbnail: {
        type: String,
        required: true
    },
    previewVideo: {
        type: String, // URL to preview/trailer video
        default: ''
    },
    category: {
        type: String,
        required: true
    },
    subcategory: {
        type: String,
        default: ''
    },
    tags: [{
        type: String
    }],
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'all'],
        default: 'all'
    },
    language: {
        type: String,
        default: 'English'
    },

    // Instructor
    instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Content
    videos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video'
    }],
    requirements: [{
        type: String
    }],
    learningObjectives: [{
        type: String
    }],
    targetAudience: [{
        type: String
    }],

    // Status & Publishing
    approvalStatus: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'rejected'],
        default: 'draft'
    },
    rejectionReason: {
        type: String,
        default: ''
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    publishedAt: {
        type: Date
    },

    // Statistics
    enrollmentCount: {
        type: Number,
        default: 0
    },
    totalRevenue: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        default: 0
    },
    totalRatings: {
        type: Number,
        default: 0
    },
    totalReviews: {
        type: Number,
        default: 0
    },
    viewCount: {
        type: Number,
        default: 0
    },

    // Course Settings
    allowComments: {
        type: Boolean,
        default: true
    },
    allowReviews: {
        type: Boolean,
        default: true
    },
    certificateEnabled: {
        type: Boolean,
        default: true
    },

    // Instructor Admin Settings (for course launcher controls)
    instructorAdminSettings: {
        enableOverview: { type: Boolean, default: true },
        enableQA: { type: Boolean, default: true },
        enableSummary: { type: Boolean, default: true },
        enableNotes: { type: Boolean, default: true },
        customOverviewContent: { type: String, default: '' }
    },

    // Course Sponsorship (managed by super admin)
    sponsorship: {
        isSponsored: { type: Boolean, default: false },
        sponsoredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        sponsorshipType: { type: String, enum: ['free', 'discounted'], default: 'discounted' },
        sponsorshipDiscount: { type: Number, default: 0, min: 0, max: 100 }, // percentage
        sponsorshipStartDate: { type: Date },
        sponsorshipEndDate: { type: Date },
        sponsorshipReason: { type: String, default: '' },
        requestStatus: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' } // NEW
    },

    // SEO
    metaTitle: {
        type: String,
        default: ''
    },
    metaDescription: {
        type: String,
        default: ''
    },
    metaKeywords: [{
        type: String
    }],

    // Featured
    isFeatured: {
        type: Boolean,
        default: false
    },
    featuredOrder: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Indexes
courseSchema.index({ instructorId: 1 });
courseSchema.index({ approvalStatus: 1 });
courseSchema.index({ isPublished: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ rating: -1 });
courseSchema.index({ enrollmentCount: -1 });

module.exports = mongoose.model('Course', courseSchema);
