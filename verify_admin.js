const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
dotenv.config();

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-selling-app');
        const admin = await User.findOne({ email: 'vishalthakur732007@gmail.com' });
        console.log('Admin found:', admin ? 'YES' : 'NO');
        if (admin) {
            console.log('Admin Role:', admin.role);
            console.log('Admin Name:', admin.name);
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};
verify();
