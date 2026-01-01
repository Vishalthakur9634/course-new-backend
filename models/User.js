const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'instructor', 'admin', 'superadmin'],
        default: 'student'
    },
    avatar: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },

    // Instructor-specific fields
    instructorProfile: {
        headline: { type: String, default: '' },
        expertise: [{ type: String }],
        experience: { type: String, default: '' },
        socialLinks: {
            website: { type: String, default: '' },
            linkedin: { type: String, default: '' },
            twitter: { type: String, default: '' },
            youtube: { type: String, default: '' },
            github: { type: String, default: '' }
        },
        rating: { type: Number, default: 0 },
        totalStudents: { type: Number, default: 0 },
        totalCourses: { type: Number, default: 0 }
    },
    isInstructorApproved: {
        type: Boolean,
        default: false
    },
    instructorApplicationDate: {
        type: Date
    },
    earnings: {
        total: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        withdrawn: { type: Number, default: 0 }
    },
    payoutDetails: {
        method: { type: String, enum: ['bank', 'paypal', 'stripe', ''], default: '' },
        bankName: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
        accountHolder: { type: String, default: '' },
        ifscCode: { type: String, default: '' },
        paypalEmail: { type: String, default: '' }
    },

    // Student-specific fields
    enrolledCourses: [{
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        enrolledAt: { type: Date, default: Date.now },
        progress: { type: Number, default: 0 }
    }],
    purchasedCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    watchHistory: [{
        videoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Video'
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        },
        progress: {
            type: Number, // Time in seconds
            default: 0
        },
        completed: {
            type: Boolean,
            default: false
        },
        lastWatched: {
            type: Date,
            default: Date.now
        }
    }],
    certificates: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Certificate'
    }],

    // Preferences
    uiPreferences: {
        sidebarWidth: { type: Number, default: 280 },
        videoPlayerSize: { type: String, enum: ['normal', 'theater', 'mini'], default: 'normal' },
        theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
        language: { type: String, default: 'en' },
        autoplay: { type: Boolean, default: true },
        playbackSpeed: { type: Number, default: 1 }
    },

    // Notifications
    notificationSettings: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        courseUpdates: { type: Boolean, default: true },
        promotions: { type: Boolean, default: false }
    },

    // Tracking
    lastLogin: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    banReason: {
        type: String,
        default: ''
    },

    // Referral System
    referralCode: {
        type: String,
        unique: true,
        sparse: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    referralStats: {
        totalReferrals: { type: Number, default: 0 },
        totalEarnings: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 }
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Gamification
    gamification: {
        xp: { type: Number, default: 0 },
        level: { type: Number, default: 1 },
        badges: [{
            name: { type: String },
            awardedAt: { type: Date, default: Date.now },
            icon: { type: String }
        }],
        streak: { type: Number, default: 0 },
        lastActivity: { type: Date }
    }
}, { timestamps: true });

// Indexes
// email index removed (already unique in schema)
userSchema.index({ role: 1 });
userSchema.index({ isInstructorApproved: 1 });

// userSchema.index({ referralCode: 1 }); // Removed duplicate index

userSchema.pre('save', async function () {
    if (!this.referralCode) {
        // Generate simple referral code: Uppercase Name (first 4 chars) + Random 4 digits
        const namePart = this.name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'USER');
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        this.referralCode = `${namePart}${randomPart}`;
    }
});

module.exports = mongoose.model('User', userSchema);
