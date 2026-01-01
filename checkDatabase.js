const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Course = require('./models/Course');
const Video = require('./models/Video');

dotenv.config();

async function checkDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-selling-app');
        console.log('MongoDB Connected\n');

        // Check courses
        const courses = await Course.find().populate('videos');
        console.log('=== COURSES ===');
        console.log(`Total courses: ${courses.length}\n`);

        courses.forEach((course, index) => {
            console.log(`Course ${index + 1}:`);
            console.log(`  ID: ${course._id}`);
            console.log(`  Title: ${course.title}`);
            console.log(`  Videos: ${course.videos.length}`);
            console.log('');
        });

        // Check videos
        const videos = await Video.find();
        console.log('=== VIDEOS ===');
        console.log(`Total videos: ${videos.length}\n`);

        videos.forEach((video, index) => {
            console.log(`Video ${index + 1}:`);
            console.log(`  ID: ${video._id}`);
            console.log(`  Title: ${video.title}`);
            console.log(`  URL: ${video.videoUrl}`);
            console.log(`  Course ID: ${video.courseId}`);
            console.log('');
        });

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDatabase();
