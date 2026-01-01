const mongoose = require('mongoose');
const User = require('../models/User');
const fs = require('fs');

const log = (msg) => {
    console.log(msg);
    fs.appendFileSync('debug_log.txt', msg + '\n');
};

const debugUser = async () => {
    try {
        log('Starting debug script...');
        await mongoose.connect('mongodb://localhost:27017/course-launcher');
        log('Connected to MongoDB');

        const allUsers = await User.find({});
        log(`Total Users: ${allUsers.length}`);

        allUsers.forEach(u => {
            log(`User: ${u.name}, Role: ${u.role}, ID: ${u._id}, Approved: ${u.isInstructorApproved}`);
        });

        const targetId = '6931c4fbf261c387b8dd7bb6';
        // Try to find by string ID
        let targetUser = await User.findById(targetId);

        if (!targetUser) {
            log('Target user not found by ID. Searching by role instructor...');
            const instructors = await User.find({ role: 'instructor' });
            if (instructors.length > 0) {
                targetUser = instructors[0]; // Just take the first one for now
                log(`Found an instructor: ${targetUser._id}`);
            }
        }

        if (targetUser) {
            log(`Target User Found: ${targetUser._id}`);
            log(`Current Approved Status: ${targetUser.isInstructorApproved}`);

            if (!targetUser.isInstructorApproved) {
                log('Approving user...');
                targetUser.isInstructorApproved = true;
                await targetUser.save();
                log('User approved.');
            } else {
                log('User is already approved.');
            }
        } else {
            log('No target user or instructor found.');
        }

    } catch (error) {
        log(`Error: ${error.message}`);
    } finally {
        await mongoose.disconnect();
        log('Disconnected.');
    }
};

debugUser();
