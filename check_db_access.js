const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');
require('dotenv').config();

async function checkAccess() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher');

        console.log('--- COURSES ---');
        const courses = await Course.find();
        courses.forEach(c => console.log(`ID: ${c._id}, Title: ${c.title}, Price: ${c.price}, EnrollmentCount: ${c.enrollmentCount}`));

        console.log('\n--- USERS ---');
        const users = await User.find();
        users.forEach(u => console.log(`ID: ${u._id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`));

        console.log('\n--- ENROLLMENTS ---');
        const enrollments = await Enrollment.find();
        enrollments.forEach(e => console.log(`Student: ${e.studentId}, Course: ${e.courseId}`));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkAccess();
