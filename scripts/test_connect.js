const mongoose = require('mongoose');
require('dotenv').config();

const testConnect = async () => {
    try {
        console.log('URI:', process.env.MONGODB_URI.substring(0, 20) + '...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected successfully!');
    } catch (error) {
        console.error('Connection failed:', error);
    } finally {
        await mongoose.disconnect();
    }
};

testConnect();
