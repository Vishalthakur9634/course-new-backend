const mongoose = require('mongoose');
require('dotenv').config();
const { Community } = require('./models/Community');

async function verifyGlobalFeed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher');
        console.log('Connected to MongoDB');

        const globalFeed = await Community.findOne({ name: 'Global Feed' });
        if (!globalFeed) {
            console.log('Global Feed not found. Seeding...');
            await Community.create({
                name: 'Global Feed',
                description: 'The universal transmission layer for all Neo Hub operatives.',
                category: 'general',
                creatorId: '6774f1d48c8b671cc3261a8a', // Placeholder ID or find a superadmin
                isOfficial: true,
                color: '#ffcc00'
            });
            console.log('Global Feed seeded successfully.');
        } else {
            console.log('Global Feed already exists.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

verifyGlobalFeed();
