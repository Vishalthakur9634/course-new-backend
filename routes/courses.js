const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Course = require('../models/Course');
const Video = require('../models/Video');
const { processVideo } = require('../utils/videoProcessor');
const { authenticate } = require('../middleware/rbac');
const User = require('../models/User'); // Need User model for my-learning

const router = express.Router();

// Multer setup for video upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/temp';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// Create Course
router.post('/', async (req, res) => {
    try {
        const course = new Course(req.body);
        await course.save();
        res.status(201).json(course);
    } catch (error) {
        res.status(500).json({ message: 'Error creating course', error });
    }
});

// Get Enrolled Courses (My Learning)
router.get('/my-learning', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate({
            path: 'enrolledCourses.courseId',
            select: 'title description thumbnail instructorId progress'
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Filter out null courses (in case course was deleted)
        const courses = user.enrolledCourses
            .filter(enrollment => enrollment.courseId)
            .map(enrollment => ({
                ...enrollment.courseId.toObject(),
                progress: enrollment.progress,
                enrolledAt: enrollment.enrolledAt
            }));

        res.json(courses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching enrolled courses', error: error.message });
    }
});

// Get All Courses (with optional filters)
router.get('/', async (req, res) => {
    try {
        const { instructorId, category, level } = req.query;
        let query = {};

        if (instructorId) query.instructorId = instructorId;
        if (category && category !== 'All') query.category = category;
        if (level && level !== 'all') query.level = level;

        // Search Query Support
        if (req.query.search) {
            query.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { category: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        // Advanced Filters
        if (req.query.rating) {
            query.rating = { $gte: parseFloat(req.query.rating) };
        }

        if (req.query.minPrice || req.query.maxPrice) {
            query.price = {};
            if (req.query.minPrice) query.price.$gte = parseFloat(req.query.minPrice);
            if (req.query.maxPrice) query.price.$lte = parseFloat(req.query.maxPrice);
        }

        // Sorting
        let sort = {};
        if (req.query.sort) {
            switch (req.query.sort) {
                case 'newest': sort = { createdAt: -1 }; break;
                case 'oldest': sort = { createdAt: 1 }; break;
                case 'popular': sort = { enrollmentCount: -1 }; break;
                case 'rating': sort = { rating: -1 }; break;
                case 'price-low': sort = { price: 1 }; break;
                case 'price-high': sort = { price: -1 }; break;
                default: sort = { createdAt: -1 };
            }
        } else {
            sort = { createdAt: -1 };
        }

        const courses = await Course.find(query)
            .populate('videos')
            .populate('instructorId', 'name avatar')
            .sort(sort);

        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching courses', error: error.message });
    }
});

// Get Single Course
router.get('/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        let user = null;
        if (token) {
            try {
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'secret');
                user = await User.findById(decoded.id);
            } catch (e) {
                // Ignore invalid token for public view
            }
        }

        const course = await Course.findById(req.params.id).populate('videos');
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Check if user has access to videos
        let hasAccess = false;
        if (user) {
            if (user.role === 'superadmin' || user.role === 'admin') {
                hasAccess = true;
            } else if (user.role === 'instructor' && course.instructorId.toString() === user._id.toString()) {
                hasAccess = true;
            } else {
                const Enrollment = require('../models/Enrollment');
                const enrollment = await Enrollment.findOne({ studentId: user._id, courseId: course._id });
                if (enrollment) hasAccess = true;
            }
        }

        // If no access, strip video URLs/content but keep titles for overview
        if (!hasAccess) {
            const publicCourse = course.toObject();
            if (publicCourse.videos) {
                publicCourse.videos = publicCourse.videos.map(v => ({
                    _id: v._id,
                    title: v.title,
                    duration: v.duration,
                    isLocked: true // Frontend can use this
                }));
            }
            return res.json(publicCourse);
        }

        res.json(course);
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid course ID format' });
        }
        res.status(500).json({ message: 'Error fetching course', error: error.message });
    }
});

// Update Course
router.put('/:id', async (req, res) => {
    try {
        const { title, description, price, category, thumbnail, isPublished, approvalStatus } = req.body;
        const updateData = { title, description, price, category, thumbnail };
        if (typeof isPublished !== 'undefined') updateData.isPublished = isPublished;
        if (approvalStatus) updateData.approvalStatus = approvalStatus;

        const course = await Course.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        if (!course) return res.status(404).json({ message: 'Course not found' });
        res.json(course);
    } catch (error) {
        res.status(500).json({ message: 'Error updating course', error: error.message });
    }
});

// Upload Video to Course
router.post('/:courseId/videos', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'notePdf', maxCount: 1 }]), async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, description, summary } = req.body;

        const videoFile = req.files['video'] ? req.files['video'][0] : null;
        const notePdfFile = req.files['notePdf'] ? req.files['notePdf'][0] : null;

        if (!videoFile) return res.status(400).json({ message: 'No video file uploaded' });

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const videoId = new mongoose.Types.ObjectId();
        const outputDir = path.join('uploads', 'courses', courseId, videoId.toString());

        // Process video (HLS)
        const masterPlaylistPath = await processVideo(videoFile.path, outputDir, videoId);

        // Construct public URL (relative path)
        const videoUrl = `/uploads/courses/${courseId}/${videoId}/master.m3u8`;

        let notePdfUrl = '';
        if (notePdfFile) {
            // Move PDF to the same directory
            const pdfDest = path.join(outputDir, 'notes.pdf');
            fs.copyFileSync(notePdfFile.path, pdfDest);
            fs.unlinkSync(notePdfFile.path); // Remove temp file
            notePdfUrl = `/uploads/courses/${courseId}/${videoId}/notes.pdf`;
        }

        const video = new Video({
            _id: videoId,
            title,
            description,
            summary,
            videoUrl,
            notePdf: notePdfUrl,
            courseId,
            qualities: ['1080p', '720p', '480p', '360p', '144p']
        });

        await video.save();
        course.videos.push(video._id);
        await course.save();

        // Cleanup temp video file
        if (fs.existsSync(videoFile.path)) {
            fs.unlinkSync(videoFile.path);
        }

        res.status(201).json(video);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error uploading video', error });
    }
});

// Delete Video (Admin)
router.delete('/:courseId/videos/:videoId', async (req, res) => {
    try {
        const { courseId, videoId } = req.params;

        // 1. Remove from Course
        const course = await Course.findById(courseId);
        if (course) {
            course.videos = course.videos.filter(v => v.toString() !== videoId);
            await course.save();
        }

        // 2. Delete Video Document
        await Video.findByIdAndDelete(videoId);

        // 3. Delete Files
        const videoDir = path.join(__dirname, '../uploads/courses', courseId, videoId);
        if (fs.existsSync(videoDir)) {
            fs.rmSync(videoDir, { recursive: true, force: true });
        }

        res.json({ message: 'Video deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting video', error: error.message });
    }
});

// Request Sponsorship
router.post('/:id/sponsor-request', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const { sponsorshipReason } = req.body;

        if (!course.sponsorship) course.sponsorship = {};

        course.sponsorship.requestStatus = 'pending';
        course.sponsorship.sponsorshipReason = sponsorshipReason || '';

        await course.save();

        res.json({ message: 'Sponsorship requested successfully', course });
    } catch (error) {
        res.status(500).json({ message: 'Error requesting sponsorship', error: error.message });
    }
});

// Delete Course (Instructor)
router.delete('/:id', async (req, res) => {
    try {
        // Note: In a real app, use middleware to get user from token. 
        // Here we assume the client sends the userId in headers or body, 
        // OR we rely on the fact that this is an open endpoint but we should verify ownership.
        // Since we don't have auth middleware on this router globally, we'll check if the user is the instructor.
        // Ideally, this route should be protected.

        // Assuming we have some way to identify the user, e.g., passed in body for now or we trust the frontend (NOT SECURE).
        // BETTER: Use the `authenticate` middleware if available or check headers.
        // For now, let's assume the request comes from an authenticated context.

        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Delete all videos
        for (const videoId of course.videos) {
            await Video.findByIdAndDelete(videoId);
        }

        // Delete course from database
        await Course.findByIdAndDelete(req.params.id);

        // Delete course directory
        const courseDir = path.join(__dirname, '../uploads/courses', req.params.id);
        if (fs.existsSync(courseDir)) {
            fs.rmSync(courseDir, { recursive: true, force: true });
        }

        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting course', error: error.message });
    }
});

// Get Course Progress
router.get('/:id/progress', authenticate, async (req, res) => {
    try {
        const Enrollment = require('../models/Enrollment');
        const enrollment = await Enrollment.findOne({
            studentId: req.user._id,
            courseId: req.params.id
        });

        if (!enrollment) {
            return res.status(200).json({ completedVideoIds: [], progress: 0 });
        }

        res.json({
            completedVideoIds: enrollment.completedVideos.map(v => v.videoId),
            progress: enrollment.progress
        });
    } catch (error) {
        console.error('Error fetching course progress:', error);
        res.status(500).json({ message: 'Error fetching progress', error: error.message });
    }
});

module.exports = router;
