const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('../models/Course');

const publishCourses = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('Connected to MongoDB');

        const result = await Course.updateMany({}, { isPublished: true, approvalStatus: 'approved' });
        console.log(`Updated ${result.modifiedCount} courses to be published and approved.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
};

publishCourses();
