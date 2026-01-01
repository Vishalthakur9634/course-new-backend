// Quick script to make all existing users admins
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const makeAllAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-selling-app');
        console.log('MongoDB Connected');

        const result = await User.updateMany({}, { role: 'superadmin' });
        console.log(`Updated ${result.modifiedCount} users to superadmin role`);

        const users = await User.find().select('-password');
        console.log('All users:', users);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

makeAllAdmin();
