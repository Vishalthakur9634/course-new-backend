const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['announcements', 'general', 'help', 'showcase', 'offtopic', 'custom', 'study-group', 'career'],
        default: 'general'
    },
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    moderators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    memberCount: {
        type: Number,
        default: 0
    },
    icon: String,
    banner: String,
    color: {
        type: String,
        default: '#6366f1'
    },
    isPrivate: {
        type: Boolean,
        default: false
    },
    isOfficial: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const postSchema = new mongoose.Schema({
    communityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Community',
        required: true
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['discussion', 'question', 'showcase', 'announcement', 'poll', 'video', 'short'],
        default: 'discussion'
    },
    tags: [String],
    media: [{
        type: {
            type: String,
            enum: ['image', 'video', 'file']
        },
        url: String,
        filename: String
    }],
    thumbnailUrl: String,
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        authorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        content: String,
        likes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    isPinned: {
        type: Boolean,
        default: false
    },
    isSolved: {
        type: Boolean,
        default: false
    },
    viewCount: {
        type: Number,
        default: 0
    },
    poll: {
        question: String,
        options: [{
            text: String,
            votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
        }],
        expiresAt: Date
    }
}, { timestamps: true });

// Indexes
communitySchema.index({ category: 1, createdAt: -1 });
communitySchema.index({ creatorId: 1 });
postSchema.index({ communityId: 1, createdAt: -1 });
postSchema.index({ authorId: 1 });

const Community = mongoose.model('Community', communitySchema);
const Post = mongoose.model('Post', postSchema);

module.exports = { Community, Post };
