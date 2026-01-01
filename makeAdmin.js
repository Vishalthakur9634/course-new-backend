// Run this script to make a user an admin
// Usage: node makeAdmin.js <email>

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const makeAdmin = async (email) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-selling-app');
        console.log('MongoDB Connected');

        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found');
            process.exit(1);
        }

        user.role = 'admin';
        await user.save();
        console.log(`User ${email} is now an admin!`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

const email = process.argv[2];
if (!email) {
    console.log('Usage: node makeAdmin.js <email>');
    process.exit(1);
}

makeAdmin(email);
