const fs = require('fs');
const path = require('path');

const requires = [
    'express',
    'mongoose',
    'cors',
    'dotenv',
    './routes/auth',
    './routes/courses',
    './routes/users',
    './routes/payment',
    './routes/wishlist',
    './routes/reviews',
    './routes/comments',
    './routes/certificates',
    './routes/announcements',
    './routes/admin',
    './routes/instructor',
    './routes/enrollment',
    './routes/superadmin',
    './routes/notifications',
    './routes/messages',
    './routes/discussions',
    './routes/instructorAdmin',
    './routes/notes',
    './routes/mega',
    './routes/community',
    './routes/live',
    './routes/articles',
    './routes/referrals',
    './routes/upload',
    './routes/practice',
    './routes/reels',
    './routes/assignments',
    './routes/content'
];

requires.forEach(req => {
    try {
        console.log(`Testing: ${req}`);
        require(req);
        console.log(`✅ Success: ${req}`);
    } catch (err) {
        console.error(`❌ Failed: ${req}`);
        console.error(err);
        // Don't exit, try others
    }
});
