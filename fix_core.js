const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
require('dotenv').config();

async function fixData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher');
        console.log('✅ Connected to DB');

        // 1. FIX ADMIN USER
        const adminEmail = 'vishalthakur732007@gmail.com';
        let admin = await User.findOne({ email: adminEmail });

        if (admin) {
            console.log(`\n👤 Found Admin: ${admin.name} (${admin.role})`);
            if (admin.role !== 'superadmin') {
                admin.role = 'superadmin';
                await admin.save();
                console.log('✅ UPDATED Admin Role to "superadmin"');
            } else {
                console.log('✅ Admin Role is already correct');
            }
        } else {
            console.log(`\n❌ Admin user not found: ${adminEmail}`);
            // Optional: Create if not exists? For now, assume user exists as they said they logged in.
        }

        // 2. FIX COURSES (Missing InstructorId)
        if (admin) {
            const courses = await Course.find({});
            console.log(`\n📚 Checking ${courses.length} courses...`);

            for (const course of courses) {
                let updated = false;

                // Fix Instructor ID
                if (!course.instructorId) {
                    course.instructorId = admin._id;
                    updated = true;
                    console.log(`   - Fixed missing instructorId for "${course.title}"`);
                }

                // Fix Price
                if (course.price === undefined || course.price === null) {
                    course.price = 0;
                    updated = true;
                    console.log(`   - Fixed missing price for "${course.title}"`);
                }

                if (updated) {
                    await course.save();
                    console.log(`   ✅ Saved updates for "${course.title}"`);
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🏁 Fix Script Completed');
    }
}

fixData();
