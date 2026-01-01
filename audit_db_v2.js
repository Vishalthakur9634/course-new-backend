const mongoose = require('mongoose');
const User = require('./models/User');
const Enrollment = require('./models/Enrollment');
require('dotenv').config();

async function checkDetails() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher');

        const users = await User.find({}, 'name email role');
        console.log('--- USERS ---');
        for (const u of users) {
            console.log(`U_ID:${u._id}|ROLE:${u.role}|NAME:${u.name}|MAIL:${u.email}`);
        }

        const enrollments = await Enrollment.find().populate('courseId', 'title');
        console.log('\n--- ENROLLMENTS ---');
        for (const e of enrollments) {
            console.log(`ST_ID:${e.studentId}|C_ID:${e.courseId ? e.courseId._id : 'NULL'}|TITLE:${e.courseId ? e.courseId.title : 'NULL'}`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkDetails();
