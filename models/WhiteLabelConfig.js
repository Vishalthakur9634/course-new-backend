const mongoose = require('mongoose');

const whiteLabelConfigSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    platformName: {
        type: String,
        default: 'Quest Platform'
    },
    logo: String,
    primaryColor: {
        type: String,
        default: '#6366f1'
    },
    secondaryColor: String,
    fontFamily: {
        type: String,
        default: 'Orbit'
    },
    customDomain: String,
    isActive: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('WhiteLabelConfig', whiteLabelConfigSchema);
