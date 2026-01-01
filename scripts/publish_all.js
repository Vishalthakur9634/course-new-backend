const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('../models/Course');

const publishCourses = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const result = await Course.updateMany({}, { isPublished: true, approvalStatus: 'approved' });
        console.log(`Updated ${result.modifiedCount} courses to be published and approved.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

publishCourses();
