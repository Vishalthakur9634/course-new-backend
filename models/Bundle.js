const mongoose = require('mongoose');

const bundleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    courses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    }],
    instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    discountPercentage: {
        type: Number,
        default: 0
    },
    thumbnail: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    tag: {
        type: String, // e.g., "Best Seller", "Trending"
        default: ''
    },
    bg: {
        type: String,
        default: 'from-brand-primary to-orange-600'
    }
}, { timestamps: true });

module.exports = mongoose.model('Bundle', bundleSchema);
