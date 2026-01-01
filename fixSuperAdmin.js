const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const fixSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher');
        console.log('✅ MongoDB Connected');

        const targetEmail = 'vishalthakur732007@gmail.com';

        // 1. Find the target user
        const superAdmin = await User.findOne({ email: targetEmail });

        if (!superAdmin) {
            console.log(`❌ User ${targetEmail} not found! Creating it...`);
            // Create if not exists (optional, but good for safety)
            // For now, let's assume they exist or we just log error
        } else {
            // 2. Demote EVERYONE else to 'student' (or keep 'instructor' if they have courses? - let's default to student for safety, or check)
            // Actually, safer to just demote 'superadmin' roles to 'student' if they are NOT the target.
            // We don't want to break existing instructors.

            const result = await User.updateMany(
                {
                    email: { $ne: targetEmail },
                    role: 'superadmin'
                },
                { role: 'student' }
            );
            console.log(`⬇️ Demoted ${result.modifiedCount} other superadmins to students.`);

            // 3. Promote target user
            superAdmin.role = 'superadmin';
            await superAdmin.save();
            console.log(`👑 Promoted ${targetEmail} to Super Admin.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixSuperAdmin();
