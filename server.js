const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://course-new-frontend.netlify.app',
        process.env.FRONTEND_URL
    ].filter(Boolean), // Remove nulls/undefined
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// Serve static files with proper MIME types for HLS streaming
app.use('/uploads', (req, res, next) => {
    // Audit log for file access
    console.log(`[Static] Attempting to access: ${req.url}`);

    // Explicitly set CORS for all media assets
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    next();
}, express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.m3u8')) {
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        } else if (filePath.endsWith('.ts')) {
            res.setHeader('Content-Type', 'video/mp2t');
        } else if (filePath.endsWith('.mp4')) {
            res.setHeader('Content-Type', 'video/mp4');
        }
    }
}));

// Fallback for missing static files to log explicitly
app.use('/uploads', (req, res) => {
    console.error(`[Static] 404 Not Found: ${req.url}`);
    res.status(404).send('File not found');
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher', {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4 // Use IPv4, skip IPv6
})
    .then(() => console.log('✅ MongoDB Connected'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Routes
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payment');
const wishlistRoutes = require('./routes/wishlist');
const reviewRoutes = require('./routes/reviews');
const commentRoutes = require('./routes/comments');
const certificateRoutes = require('./routes/certificates');
const announcementRoutes = require('./routes/announcements');
const adminRoutes = require('./routes/admin');

// New multi-role routes
const instructorRoutes = require('./routes/instructor');
const enrollmentRoutes = require('./routes/enrollment');
const superAdminRoutes = require('./routes/superadmin');
const notificationRoutes = require('./routes/notifications');
const messageRoutes = require('./routes/messages');
const discussionRoutes = require('./routes/discussions');
const instructorAdminRoutes = require('./routes/instructorAdmin');
const notesRoutes = require('./routes/notes');
const megaRoutes = require('./routes/mega');
const communityRoutes = require('./routes/community');
const liveRoutes = require('./routes/live');
const articleRoutes = require('./routes/articles');
const referralRoutes = require('./routes/referrals');
const uploadRoutes = require('./routes/upload');
const practiceRoutes = require('./routes/practice');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/admin', adminRoutes);

// New API Routes
app.use('/api/instructor', instructorRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/instructor-admin', instructorAdminRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/mega', megaRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/reels', require('./routes/reels')); // [NEW] Reels routes
app.use('/api/assignments', require('./routes/assignments')); // [NEW] Assignment routes
app.use('/api/content', require('./routes/content')); // [NEW] Content routes (Sectors, Skills, Vault, AI)

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Global Error Handler & Logger
const fs = require('fs');
app.use((err, req, res, next) => {
    const errorLog = `[${new Date().toISOString()}] ${req.method} ${req.url} - Error: ${err.message}\nStack: ${err.stack}\n\n`;
    fs.appendFileSync('debug_log.txt', errorLog);
    console.error('SERVER ERROR:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const PORT = process.env.PORT || 5001;
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "https://course-new-frontend.netlify.app",
            process.env.FRONTEND_URL
        ].filter(Boolean),
        methods: ["GET", "POST"]
    }
});

// Socket.io Connection Logic
io.on('connection', (socket) => {
    console.log('👤 New User Connected:', socket.id);

    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        console.log(`🏠 User joined room: ${roomId}`);
    });

    socket.on('send_message', (data) => {
        // Broadcast to specific room (conversationId)
        io.to(data.conversationId).emit('receive_message', data);
    });

    socket.on('disconnect', () => {
        console.log('🔌 User Disconnected');
    });
});

// Make io accessible in routes
app.set('io', io);

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/profiles', 'uploads/files', 'uploads/courses', 'uploads/temp'];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

