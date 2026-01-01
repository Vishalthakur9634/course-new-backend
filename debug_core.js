const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
const Video = require('./models/Video'); // Ensure Video model is registered
require('dotenv').config();

async function debugApp() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher');
        console.log('✅ Connected to DB');

        // 1. SIMULATE GET /api/courses
        console.log('\n📚 SIMULATING GET /api/courses ...');
        try {
            const courses = await Course.find().populate('videos');
            console.log(`✅ Success! Fetched ${courses.length} courses.`);
            courses.forEach(c => {
                console.log(`   - "${c.title}" (Instructor: ${c.instructorId}, Videos: ${c.videos.length})`);
            });
        } catch (err) {
            console.error('❌ GET /api/courses FAILED:', err);
        }

        // 2. SIMULATE GET /api/users/profile/:id
        const adminEmail = 'vishalthakur732007@gmail.com';
        const admin = await User.findOne({ email: adminEmail });

        if (admin) {
            console.log(`\n👤 SIMULATING GET /api/users/profile/${admin._id} ...`);
            try {
                const user = await User.findById(admin._id)
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
                console.log('✅ Success! Fetched user profile.');
                console.log(`   - Enrolled: ${user.enrolledCourses.length}`);
            } catch (err) {
                console.error('❌ GET /api/users/profile FAILED:', err);
            }
        }

    } catch (error) {
        console.error('Global Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debugApp();
