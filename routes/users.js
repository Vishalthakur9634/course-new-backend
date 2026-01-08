const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const Video = require('../models/Video');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/rbac');
const bcrypt = require('bcryptjs');

// Get user directory for networking
router.get('/directory', async (req, res) => {
    try {
        const { search, role } = req.query;
        let query = {};

        if (role && role !== 'all') {
            query.role = role;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { bio: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('name avatar bio role createdAt followers following')
            .limit(20)
            .lean();

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching directory', error: error.message });
    }
});

// Multer for Profile Photos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/profiles';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${req.params.userId}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// Get mentors (instructors)
router.get('/instructors/mentors', async (req, res) => {
    try {
        const { search } = req.query;
        let query = {
            role: 'instructor',
            isInstructorApproved: true
        };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { 'instructorProfile.headline': { $regex: search, $options: 'i' } },
                { 'instructorProfile.expertise': { $regex: search, $options: 'i' } }
            ];
        }

        const mentors = await User.find(query)
            .select('name avatar bio instructorProfile')
            .lean();

        res.json(mentors);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching mentors', error: error.message });
    }
});

// Get User Profile & Progress
router.get('/profile/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('-password')
            .populate('purchasedCourses')
            .populate({
                path: 'enrolledCourses.courseId',
                select: 'title thumbnail instructorId'
            })
            .populate({
                path: 'watchHistory.videoId',
                select: 'title duration'
            })
            .populate({
                path: 'watchHistory.courseId',
                select: 'title thumbnail'
            });

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Calculate Gamification info for private profile too
        const coursesCompleted = user.enrolledCourses.filter(c => c.progress === 100).length;
        const certificatesCount = user.certificates ? user.certificates.length : 0;
        const yearsActive = (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24 * 365);
        const xp = Math.floor(
            (user.enrolledCourses.length * 100) +
            (coursesCompleted * 400) +
            (certificatesCount * 1000) +
            (yearsActive * 200)
        );

        // Add custom fields for UI
        const userData = user.toObject();
        userData.followerCount = user.followers?.length || 0;
        userData.followingCount = user.following?.length || 0;
        userData.gamification = {
            xp,
            level: Math.floor(xp / 1000) + 1,
            coursesCompleted,
            certificatesCount
        };

        // If an authenticated user is requesting, check if they are following
        if (req.headers.authorization) {
            try {
                const jwt = require('jsonwebtoken');
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                userData.isFollowing = user.followers?.some(id => id.toString() === decoded.id);
            } catch (e) {
                userData.isFollowing = false;
            }
        }

        res.json(userData);
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }
        res.status(500).json({ message: 'Error fetching profile', error: error.message });
    }
});

// Get Public Profile (Student Resume/Gamification)
router.get('/:userId/public-profile', async (req, res) => {
    try {
        if (!req.params.userId || req.params.userId === 'undefined' || !req.params.userId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: 'Invalid User ID' });
        }

        const user = await User.findById(req.params.userId)
            .select('name avatar bio createdAt role enrolledCourses certificates followers following')
            .populate({
                path: 'enrolledCourses.courseId',
                select: 'title thumbnail category difficulty'
            })
            .lean();

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Gamification Logic (Orbit XP)
        const coursesCompleted = user.enrolledCourses.filter(c => c.progress === 100).length;
        const certificatesCount = user.certificates ? user.certificates.length : 0;
        const yearsActive = (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24 * 365);

        const xp = Math.floor(
            (user.enrolledCourses.length * 100) +
            (coursesCompleted * 400) +
            (certificatesCount * 1000) +
            (yearsActive * 200)
        );

        // Follow check
        let isFollowing = false;
        if (req.headers.authorization) {
            try {
                const jwt = require('jsonwebtoken');
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                isFollowing = user.followers?.some(id => id.toString() === decoded.id);
            } catch (e) { }
        }

        // Badges Calculation
        const badges = [
            { id: 'early_adopter', name: 'Early Adopter', icon: 'Sparkles', color: 'indigo', unlocked: true },
            { id: 'first_steps', name: 'First Steps', icon: 'BookOpen', color: 'blue', unlocked: user.enrolledCourses.length > 0 },
            { id: 'dedicated', name: 'Dedicated Learner', icon: 'Flame', color: 'orange', unlocked: coursesCompleted >= 1 },
            { id: 'certified', name: 'Certified Pro', icon: 'Award', color: 'yellow', unlocked: certificatesCount >= 1 },
            { id: 'social_butterfly', name: 'Social Butterfly', icon: 'Users', color: 'pink', unlocked: user.followers?.length >= 5 },
            { id: 'expert', name: 'Orbit Expert', icon: 'Zap', color: 'brand', unlocked: xp > 5000 }
        ];

        res.json({
            ...user,
            isFollowing,
            followerCount: user.followers?.length || 0,
            followingCount: user.following?.length || 0,
            gamification: {
                xp,
                level: Math.floor(xp / 1000) + 1,
                badges,
                coursesCompleted,
                certificatesCount
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching public profile', error: error.message });
    }
});

// Update User Profile
router.put('/profile/:userId', authenticate, async (req, res) => {
    try {
        const selfId = req.user?._id?.toString() || req.user?.id?.toString();
        const targetUserId = req.params.userId;

        if (selfId !== targetUserId && req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized to update this profile' });
        }

        const user = await User.findById(targetUserId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { name, email, avatar, bio, phone, socialLinks, headline, expertise, password } = req.body;

        if (name) user.name = name;
        if (email) user.email = email;
        if (avatar) user.avatar = avatar;
        if (bio !== undefined) user.bio = bio;
        if (phone !== undefined) user.phone = phone;

        // Safely handle instructor profile updates
        if (socialLinks || headline || expertise) {
            if (!user.instructorProfile) user.instructorProfile = {};
            if (socialLinks) user.instructorProfile.socialLinks = socialLinks;
            if (headline) user.instructorProfile.headline = headline;
            if (expertise) user.instructorProfile.expertise = expertise;
        }

        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();
        res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error('Profile Update Error:', error);
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
});

// Update Profile Photo
router.post('/profile/:userId/photo', authenticate, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No photo uploaded' });

        const imageUrl = `/uploads/profiles/${req.file.filename}`;
        await User.findByIdAndUpdate(req.params.userId, { avatar: imageUrl });

        res.json({ url: imageUrl, message: 'Photo updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating photo', error: error.message });
    }
});

// Update Video Progress
router.post('/progress', async (req, res) => {
    try {
        const { userId, videoId, courseId, progress, completed } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if video exists in history
        const historyIndex = user.watchHistory.findIndex(h => h.videoId.toString() === videoId);

        if (historyIndex > -1) {
            // Update existing record
            user.watchHistory[historyIndex].progress = progress;
            user.watchHistory[historyIndex].lastWatched = Date.now();
            if (completed) user.watchHistory[historyIndex].completed = true;
        } else {
            // Add new record
            user.watchHistory.push({
                videoId,
                courseId,
                progress,
                completed,
                lastWatched: Date.now()
            });
        }

        await user.save();
        res.json({ message: 'Progress updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating progress', error: error.message });
    }
});

// Get User Wishlist
router.get('/:userId/wishlist', authenticate, async (req, res) => {
    try {
        const targetUserId = req.params.userId === 'undefined' ? (req.user?.id || req.user?._id) : req.params.userId;
        const user = await User.findById(targetUserId).populate({
            path: 'wishlist',
            select: 'title thumbnail price rating instructorId',
            populate: {
                path: 'instructorId',
                select: 'name'
            }
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json(user.wishlist);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching wishlist', error: error.message });
    }
});

// Toggle Wishlist Item
router.post('/:userId/wishlist/:courseId', authenticate, async (req, res) => {
    try {
        const { userId, courseId } = req.params;
        console.log('Wishlist Toggle:', { userId, courseId });

        // Use authenticated user ID if 'undefined' or specifically requested as self
        let effectiveUserId = (userId === 'undefined' || userId === 'self') ? (req.user?._id || req.user?.id) : userId;

        if (!effectiveUserId) {
            console.error('Wishlist Toggle: No User ID found');
            return res.status(401).json({ message: 'User identification failed' });
        }

        const user = await User.findById(effectiveUserId);
        if (!user) {
            console.error('Wishlist Toggle: User not found', effectiveUserId);
            return res.status(404).json({ message: 'User not found' });
        }

        // Initialize wishlist if it doesn't exist
        if (!user.wishlist) user.wishlist = [];

        const index = user.wishlist.findIndex(id => id && id.toString() === courseId);
        let action = '';

        if (index > -1) {
            // Remove
            user.wishlist.splice(index, 1);
            action = 'removed';
        } else {
            // Add (Verify course exists first)
            const courseExists = await Course.findById(courseId);
            if (!courseExists) {
                return res.status(404).json({ message: 'Course not found' });
            }
            user.wishlist.push(courseId);
            action = 'added';
        }

        await user.save();
        res.json({ message: `Course ${action} from wishlist`, wishlist: user.wishlist, action });
    } catch (error) {
        console.error('Wishlist Error:', error);
        res.status(500).json({ message: 'Error updating wishlist', error: error.message });
    }
});

// Get top instructors for leaderboard
router.get('/instructors/top', async (req, res) => {
    try {
        const Course = require('../models/Course');
        const Enrollment = require('../models/Enrollment');

        const instructors = await User.find({
            role: 'instructor',
            isInstructorApproved: true
        }).select('name email avatar').lean();

        // Get student count and rating for each instructor
        const instructorStats = await Promise.all(instructors.map(async (instructor) => {
            const courses = await Course.find({ instructorId: instructor._id });
            const courseIds = courses.map(c => c._id);
            const studentCount = await Enrollment.countDocuments({ courseId: { $in: courseIds } });
            const avgRating = courses.length > 0
                ? courses.reduce((sum, c) => sum + (c.rating || 0), 0) / courses.length
                : 0;

            return {
                ...instructor,
                studentCount,
                rating: avgRating.toFixed(1)
            };
        }));

        // Sort by student count descending
        instructorStats.sort((a, b) => b.studentCount - a.studentCount);

        res.json(instructorStats.slice(0, 10));
    } catch (error) {
        console.error('Error fetching top instructors:', error);
        res.status(500).json({ message: 'Error fetching top instructors', error: error.message });
    }
});

// Follow User
router.post('/follow/:userId', authenticate, async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.userId);
        const currentUser = await User.findById(req.user.id);

        if (!targetUser) return res.status(404).json({ message: 'User not found' });
        if (targetUser._id.equals(currentUser._id)) return res.status(400).json({ message: 'You cannot follow yourself' });

        if (!currentUser.following.includes(targetUser._id)) {
            currentUser.following.push(targetUser._id);
            targetUser.followers.push(currentUser._id);
            await currentUser.save();
            await targetUser.save();

            // Notify target user
            const Notification = require('../models/Notification');
            await Notification.create({
                userId: targetUser._id,
                type: 'new_follower',
                title: 'New Follower!',
                message: `${currentUser.name} started following you.`,
                priority: 'low'
            });
        }

        res.json({ message: 'Followed successfully', following: currentUser.following });
    } catch (error) {
        res.status(500).json({ message: 'Error following user', error: error.message });
    }
});

// Unfollow User
router.post('/unfollow/:userId', authenticate, async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.userId);
        const currentUser = await User.findById(req.user.id);

        if (!targetUser) return res.status(404).json({ message: 'User not found' });

        currentUser.following = currentUser.following.filter(id => !id.equals(targetUser._id));
        targetUser.followers = targetUser.followers.filter(id => !id.equals(currentUser._id));

        await currentUser.save();
        await targetUser.save();

        res.json({ message: 'Unfollowed successfully', following: currentUser.following });
    } catch (error) {
        res.status(500).json({ message: 'Error unfollowing user', error: error.message });
    }
});

// Get Following List
router.get('/following/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .populate('following', 'name avatar role')
            .lean();
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.following);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching following', error: error.message });
    }
});

// Get Followers List
router.get('/followers/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .populate('followers', 'name avatar role')
            .lean();
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.followers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching followers', error: error.message });
    }
});

module.exports = router;
