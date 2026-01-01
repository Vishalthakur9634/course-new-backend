const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');
require('dotenv').config();

async function checkDetailedAccess() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher');

        console.log('--- ENROLLMENTS (Detailed) ---');
        const enrollments = await Enrollment.find().populate('studentId', 'name email').populate('courseId', 'title');
        enrollments.forEach(e => {
            const student = e.studentId ? `${e.studentId.name} (${e.studentId.email})` : 'MISSING STUDENT';
            const course = e.courseId ? e.courseId.title : 'MISSING COURSE';
            console.log(`Enrollment ID: ${e._id}`);
            console.log(`  Student: ${student}`);
            console.log(`  Course: ${course}`);
            console.log(`  Progress: ${e.progress}%`);
            console.log('---------------------------');
        });

        if (enrollments.length === 0) console.log('No enrollments found.');

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkDetailedAccess();
