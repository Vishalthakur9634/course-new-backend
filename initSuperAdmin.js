const bcrypt = require('bcryptjs');
const User = require('./models/User');
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('✅ MongoDB Connected'))
    .catch((err) => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    });

async function createSuperAdmin() {
    try {
        // Check if super admin already exists
        const existingSuperAdmin = await User.findOne({ role: 'superadmin' });

        if (existingSuperAdmin) {
            console.log('❌ Super admin already exists:', existingSuperAdmin.email);
            process.exit(0);
        }

        // Get credentials from command line arguments or use defaults
        const email = process.argv[2] || 'admin@courselauncher.com';
        const password = process.argv[3] || 'Admin@123';
        const name = process.argv[4] || 'Super Admin';

        // Check if user with this email exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('❌ User with this email already exists');
            process.exit(1);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create super admin
        const superAdmin = new User({
            name,
            email,
            password: hashedPassword,
            role: 'superadmin',
            isInstructorApproved: true,
            isActive: true
        });

        await superAdmin.save();

        console.log('✅ Super Admin created successfully!');
        console.log('📧 Email:', email);
        console.log('🔑 Password:', password);
        console.log('\n⚠️  Please change the password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating super admin:', error);
        process.exit(1);
    }
}

createSuperAdmin();
