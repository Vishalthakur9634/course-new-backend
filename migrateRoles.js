const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher';

console.log('🔄 Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Update 'admin' to 'superadmin'
        const adminResult = await usersCollection.updateMany(
            { role: 'admin' },
            {
                $set: {
                    role: 'superadmin',
                    isInstructorApproved: true
                }
            }
        );

        // Update 'user' to 'student'
        const userResult = await usersCollection.updateMany(
            { role: 'user' },
            { $set: { role: 'student' } }
        );

        console.log(`✅ Migrated ${adminResult.modifiedCount} admin users to superadmin`);
        console.log(`✅ Migrated ${userResult.modifiedCount} regular users to student`);
        console.log('\n🎉 Migration complete! You can now login.');

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Migration Error:', err.message);
        process.exit(1);
    });
