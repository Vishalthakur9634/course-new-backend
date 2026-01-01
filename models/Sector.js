const mongoose = require('mongoose');

const sectorSchema = new mongoose.Schema({
    id: { // specific ID string like 'dev', 'design' for frontend mapping if needed
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    count: {
        type: Number,
        default: 0
    },
    icon: {
        type: String, // lucide icon name or image url
        default: 'Zap'
    },
    color: {
        type: String, // e.g., 'brand-primary', 'quantum-purple'
        default: 'brand-primary'
    },
    description: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Sector', sectorSchema);
