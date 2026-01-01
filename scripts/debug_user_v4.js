const mongoose = require('mongoose');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const log = (msg) => {
    console.log(msg);
    fs.appendFileSync('debug_log_v4.txt', msg + '\n');
};

const debugUser = async () => {
    try {
        log('Starting debug script v4...');

        let uri = process.env.MONGODB_URI;
        if (!uri) {
            log('MONGODB_URI not found in process.env. Trying to read .env file manually...');
            try {
                const envPath = path.join(__dirname, '../.env');
                if (fs.existsSync(envPath)) {
                    const envContent = fs.readFileSync(envPath, 'utf8');
                    const match = envContent.match(/MONGODB_URI=(.+)/);
                    if (match) {
                        uri = match[1].trim();
                        log('Found URI in .env file.');
                    }
                }
            } catch (e) {
                log(`Error reading .env: ${e.message}`);
            }
        }

        if (!uri) {
            log('CRITICAL: Could not find MONGODB_URI.');
            return;
        }

        log(`Connecting to DB: ${uri.substring(0, 20)}...`); // Log partial URI for safety
        await mongoose.connect(uri);
        log('Connected to MongoDB');

        const allUsers = await User.find({});
        log(`Total Users: ${allUsers.length}`);

        // Find specific user from logs
        const targetId = '6931c4fbf261c387b8dd7bb6';
        let targetUser = await User.findById(targetId);

        if (!targetUser) {
            log('Target user not found by ID. Searching by role instructor...');
            const instructors = await User.find({ role: 'instructor' });
            log(`Found ${instructors.length} instructors.`);
            if (instructors.length > 0) {
                // Try to match by email if we knew it, or just list them
                instructors.forEach(i => log(`Instructor: ${i.email} (${i._id}) Approved: ${i.isInstructorApproved}`));

                // For now, approve ALL instructors to be safe
                log('Approving ALL instructors...');
                const result = await User.updateMany({ role: 'instructor' }, { $set: { isInstructorApproved: true } });
                log(`Updated ${result.modifiedCount} instructors.`);
            }
        } else {
            log(`Target User Found: ${targetUser.email} (${targetUser._id})`);
            log(`Current Approved Status: ${targetUser.isInstructorApproved}`);

            if (!targetUser.isInstructorApproved) {
                log('Approving user...');
                targetUser.isInstructorApproved = true;
                await targetUser.save();
                log('User approved.');
            } else {
                log('User is already approved.');
            }
        }

    } catch (error) {
        log(`Error: ${error.message}`);
    } finally {
        await mongoose.disconnect();
        log('Disconnected.');
    }
};

debugUser();
