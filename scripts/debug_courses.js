const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('../models/Course');

const checkCourses = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const courses = await Course.find({});
        console.log(`Found ${courses.length} courses.`);

        courses.forEach(c => {
            console.log(`Course: ${c.title}, Published: ${c.isPublished}, Approval: ${c.approvalStatus}`);
        });

        // Optional: Force publish all for debugging
        // await Course.updateMany({}, { isPublished: true, approvalStatus: 'approved' });
        // console.log('Forced all courses to be published and approved.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkCourses();
