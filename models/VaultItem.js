const mongoose = require('mongoose');

const vaultItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    size: String,
    type: { // PDF, DOCX, ZIP, etc.
        type: String,
        required: true
    },
    security: {
        type: String,
        enum: ['Unrestricted', 'Level 2', 'Level 3', 'Level 4', 'Restricted'],
        default: 'Unrestricted'
    },
    url: { // URL to file
        type: String
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('VaultItem', vaultItemSchema);
