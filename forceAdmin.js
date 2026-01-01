const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const forceAdminRole = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-selling-app');
        console.log('MongoDB Connected');

        const email = 'vishalthakur732007@gmail.com';

        // Update user to admin and return the user
        const user = await User.findOneAndUpdate(
            { email },
            { role: 'admin' },
            { new: true }
        );

        if (user) {
            console.log('\n✓ SUCCESS! User updated:');
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('ID:', user._id);
            console.log('\nCopy this to browser console:');
            console.log(`localStorage.setItem('user', '${JSON.stringify({ id: user._id, name: user.name, email: user.email, role: user.role })}');`);
            console.log('\nThen go to: http://localhost:5173/admin');
        } else {
            console.log('✗ User not found');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

forceAdminRole();
