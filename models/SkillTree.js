const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema({
    id: Number,
    title: String,
    status: {
        type: String,
        enum: ['locked', 'in-progress', 'completed'],
        default: 'locked'
    },
    level: Number
});

const skillTreeSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    icon: {
        type: String, // lucide icon name
        default: 'Box'
    },
    color: {
        type: String,
        default: 'brand-primary'
    },
    nodes: [nodeSchema]
}, { timestamps: true });

module.exports = mongoose.model('SkillTree', skillTreeSchema);
