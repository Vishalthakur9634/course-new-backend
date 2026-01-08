const mongoose = require('mongoose');

const missionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    rewardXp: {
        type: Number,
        default: 0
    },
    type: {
        type: String,
        enum: ['daily', 'weekly', 'achievement', 'one-time'],
        default: 'daily'
    },
    icon: {
        type: String,
        default: 'Target'
    },
    color: {
        type: String,
        default: 'brand-primary'
    }
}, { timestamps: true });

module.exports = mongoose.model('Mission', missionSchema);
