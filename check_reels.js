const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const Reel = require('./models/Reel');

async function checkReels() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher');
        console.log('Connected to MongoDB');

        const reels = await Reel.find().limit(5);
        console.log('--- REELS DATA CHECK ---');
        reels.forEach((r, i) => {
            console.log(`Reel ${i + 1}:`);
            console.log(`  ID: ${r._id}`);
            console.log(`  Title: ${r.title}`);
            console.log(`  videoUrl: '${r.videoUrl}'`);
            console.log(`  thumbnailUrl: '${r.thumbnailUrl}'`);
        });

        if (reels.length === 0) {
            console.log('No reels found in database.');
        }

        mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkReels();
