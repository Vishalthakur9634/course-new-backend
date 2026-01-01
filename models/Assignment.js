const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dueDate: {
        type: Date
    },
    points: {
        type: Number,
        default: 100
    },
    attachmentUrl: {
        type: String
    },
    attachmentName: {
        type: String
    }
}, { timestamps: true });

assignmentSchema.index({ courseId: 1 });
assignmentSchema.index({ instructorId: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
