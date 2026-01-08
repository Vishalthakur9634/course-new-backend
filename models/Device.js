const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    deviceName: {
        type: String,
        required: true
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['online', 'offline'],
        default: 'online'
    },
    pushToken: String,
    metadata: {
        os: String,
        appVersion: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Device', deviceSchema);
