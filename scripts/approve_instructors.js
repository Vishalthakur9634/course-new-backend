const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const approveInstructors = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher');
        console.log('Connected to MongoDB');

        const result = await User.updateMany(
            { role: 'instructor' },
            { $set: { isInstructorApproved: true } }
        );

        console.log(`Approved ${result.modifiedCount} instructor(s).`);
        console.log(`Matched ${result.matchedCount} instructor(s).`);

    } catch (error) {
        console.error('Error approving instructors:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

approveInstructors();
