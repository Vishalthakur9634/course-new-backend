const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const debugUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher');
        console.log('Connected to MongoDB');

        // Find the user seen in the logs
        // The ID from logs was 6931c4fbf261c387b8dd7bb6 - wait, that ID looks odd (starts with 69...), standard MongoIDs usually start with 5 or 6 but are hex. 
        // Let's list all instructors to be sure.

        const instructors = await User.find({ role: 'instructor' });
        console.log(`Found ${instructors.length} instructors.`);

        for (const user of instructors) {
            console.log(`User: ${user.email}, ID: ${user._id}, Role: ${user.role}, Approved: ${user.isInstructorApproved}`);

            if (!user.isInstructorApproved) {
                console.log(`Approving user ${user.email}...`);
                user.isInstructorApproved = true;
                await user.save();
                console.log('Approved.');
            }
        }

    } catch (error) {
        console.error('Error debugging user:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

debugUser();
