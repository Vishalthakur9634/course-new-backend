const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Adjust path if needed

const User = require('../models/User');
const Coupon = require('../models/Coupon');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher')
    .then(async () => {
        console.log('Connected to MongoDB. Cleaning indexes...');

        try {
            await User.collection.dropIndexes();
            console.log('Dropped User indexes');
        } catch (e) { console.log('User indexes error (might not exist):', e.message); }

        try {
            await Coupon.collection.dropIndexes();
            console.log('Dropped Coupon indexes');
        } catch (e) { console.log('Coupon indexes error:', e.message); }

        console.log('Indexes dropped. They will be recreated on next server start.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Connection failed:', err);
        process.exit(1);
    });
