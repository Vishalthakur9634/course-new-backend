const mongoose = require('mongoose');
const User = require('./models/User');
const Enrollment = require('./models/Enrollment');
require('dotenv').config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher');

        console.log('--- USERS ---');
        const users = await User.find({}, 'name email role');
        users.forEach(u => console.log(`${u._id} | ${u.role} | ${u.name} | ${u.email}`));

        console.log('\n--- ENROLLMENTS ---');
        const enrollments = await Enrollment.find().populate('courseId', 'title');
        enrollments.forEach(e => {
            console.log(`Student ID: ${e.studentId} -> Course: ${e.courseId ? e.courseId.title : 'N/A'}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkUsers();
