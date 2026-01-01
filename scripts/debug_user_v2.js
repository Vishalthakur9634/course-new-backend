const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const debugUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher');
        console.log('Connected to MongoDB');
        console.log('DB Name:', mongoose.connection.name);

        // List all users
        const allUsers = await User.find({});
        console.log(`Total Users in DB: ${allUsers.length}`);

        allUsers.forEach(u => {
            console.log(`- ${u.name} (${u.email}) [${u.role}] ID: ${u._id}`);
        });

        // Find specific user from logs
        const targetId = '6931c4fbf261c387b8dd7bb6';
        const targetUser = await User.findById(targetId);

        if (targetUser) {
            console.log('\nTarget User Found:');
            console.log(JSON.stringify(targetUser, null, 2));

            if (targetUser.role === 'instructor' && !targetUser.isInstructorApproved) {
                console.log('Approving target user...');
                targetUser.isInstructorApproved = true;
                await targetUser.save();
                console.log('Target user approved.');
            }
        } else {
            console.log(`\nTarget User with ID ${targetId} NOT FOUND.`);
        }

    } catch (error) {
        console.error('Error debugging user:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

debugUser();
