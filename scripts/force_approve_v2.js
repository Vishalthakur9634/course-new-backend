const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const forceApprove = async () => {
    try {
        let uri = process.env.MONGODB_URI;
        if (!uri) {
            try {
                const envPath = path.join(__dirname, '../.env');
                if (fs.existsSync(envPath)) {
                    const envContent = fs.readFileSync(envPath, 'utf8');
                    const match = envContent.match(/MONGODB_URI=(.+)/);
                    if (match) {
                        uri = match[1].trim();
                    }
                }
            } catch (e) {
                console.log('Error reading .env:', e);
            }
        }

        if (!uri) {
            console.error('No MONGODB_URI found');
            return;
        }

        // Add options to handle SSL/TLS issues if necessary, though usually standard URI is enough
        console.log(`Connecting to DB: ${uri.substring(0, 15)}...`);
        await mongoose.connect(uri);
        console.log('Connected.');

        const targetId = '6931c4fbf261c387b8dd7bb6';
        const user = await User.findById(targetId);

        if (user) {
            console.log(`Found user: ${user.email} (${user._id})`);

            user.isInstructorApproved = true;
            user.role = 'instructor';

            await user.save();
            console.log('User FORCE APPROVED successfully.');
        } else {
            console.log('User not found!');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

forceApprove();
