const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { authenticate } = require('../middleware/rbac');

// Get conversations list
router.get('/conversations', authenticate, async (req, res) => {
    try {
        const userId = req.user._id.toString();

        // Find all unique conversations
        const messages = await Message.find({
            $or: [{ senderId: userId }, { receiverId: userId }]
        })
            .sort({ createdAt: -1 })
            .populate('senderId', 'name avatar')
            .populate('receiverId', 'name avatar');

        // Group by conversation and get latest message
        const conversationsMap = new Map();

        for (const msg of messages) {
            const otherUserId = msg.senderId._id.toString() === userId
                ? msg.receiverId._id.toString()
                : msg.senderId._id.toString();

            if (!conversationsMap.has(otherUserId)) {
                const otherUser = msg.senderId._id.toString() === userId
                    ? msg.receiverId
                    : msg.senderId;

                const unreadCount = await Message.countDocuments({
                    conversationId: msg.conversationId,
                    receiverId: userId,
                    isRead: false
                });

                conversationsMap.set(otherUserId, {
                    user: otherUser,
                    lastMessage: msg.message,
                    lastMessageTime: msg.createdAt,
                    unreadCount,
                    conversationId: msg.conversationId
                });
            }
        }

        const conversations = Array.from(conversationsMap.values())
            .sort((a, b) => b.lastMessageTime - a.lastMessageTime);

        res.json(conversations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching conversations', error: error.message });
    }
});

// Get messages in a conversation
router.get('/:userId', authenticate, async (req, res) => {
    try {
        const currentUserId = req.user._id.toString();
        const otherUserId = req.params.userId;

        // Generate conversation ID
        const conversationId = [currentUserId, otherUserId].sort().join('_');

        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 })
            .populate('senderId', 'name avatar')
            .populate('receiverId', 'name avatar');

        // Mark messages as read
        await Message.updateMany(
            {
                conversationId,
                receiverId: currentUserId,
                isRead: false
            },
            {
                isRead: true,
                readAt: new Date()
            }
        );

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages', error: error.message });
    }
});

// Send a message
router.post('/send', authenticate, async (req, res) => {
    try {
        const { receiverId, message, attachments, relatedCourse } = req.body;
        const senderId = req.user._id;

        if (!receiverId || !message) {
            return res.status(400).json({ message: 'Receiver and message are required' });
        }

        // Verify receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ message: 'Receiver not found' });
        }

        // Generate conversation ID
        const conversationId = [senderId.toString(), receiverId.toString()].sort().join('_');

        const newMessage = await Message.create({
            conversationId,
            senderId,
            receiverId,
            message,
            attachments: attachments || [],
            relatedCourse
        });

        await newMessage.populate('senderId', 'name avatar');
        await newMessage.populate('receiverId', 'name avatar');

        // Create notification for receiver
        const Notification = require('../models/Notification');
        await Notification.create({
            userId: receiverId,
            type: 'new_message',
            title: 'New Message',
            message: `${req.user.name} sent you a message`,
            link: `/messages/${senderId}`,
            priority: 'medium'
        });

        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ message: 'Error sending message', error: error.message });
    }
});

// Get unread message count
router.get('/unread/count', authenticate, async (req, res) => {
    try {
        const count = await Message.countDocuments({
            receiverId: req.user._id,
            isRead: false
        });

        res.json({ unreadCount: count });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching unread count', error: error.message });
    }
});

module.exports = router;
