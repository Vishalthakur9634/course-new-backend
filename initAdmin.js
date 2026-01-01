const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

dotenv.config();

const initAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-selling-app');
        console.log('MongoDB Connected');

        const adminEmail = process.env.ADMIN_EMAIL || 'vishalthakur732007@gmail.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'vishal9634';

        const existingAdmin = await User.findOne({ email: adminEmail });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        if (existingAdmin) {
            existingAdmin.password = hashedPassword;
            existingAdmin.role = 'superadmin';
            existingAdmin.name = 'Super Admin';
            await existingAdmin.save();
            console.log('Super Admin account updated');
        } else {
            const newAdmin = new User({
                name: 'Super Admin',
                email: adminEmail,
                password: hashedPassword,
                role: 'superadmin',
                purchasedCourses: []
            });
            await newAdmin.save();
            console.log('Super Admin account created');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error initializing admin:', error);
        process.exit(1);
    }
};

initAdmin();
