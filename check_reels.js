const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const Reel = require('./models/Reel');

async function checkAndCleanReels() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher');
        console.log('Connected to MongoDB');

        const reels = await Reel.find();
        console.log(`Found ${reels.length} reels in database. Checking file integrity...`);

        let deletedCount = 0;

        for (const reel of reels) {
            // videoUrl is like /uploads/files/filename.mp4
            // We need to check exact path on disk relative to server root
            if (!reel.videoUrl) {
                console.log(`[DELETE] Reel ${reel._id} has no videoUrl`);
                await Reel.findByIdAndDelete(reel._id);
                deletedCount++;
                continue;
            }

            // Remove leading slash for path join
            const relativePath = reel.videoUrl.startsWith('/') ? reel.videoUrl.slice(1) : reel.videoUrl;
            // Assuming videoUrl points to 'uploads/...'
            const absolutePath = path.join(__dirname, relativePath);

            if (!fs.existsSync(absolutePath)) {
                console.log(`[DELETE] Missing File: ${absolutePath} (ID: ${reel._id})`);
                await Reel.findByIdAndDelete(reel._id);
                deletedCount++;
            } else {
                // console.log(`[OK] ${reel.videoUrl}`);
            }
        }

        console.log(`Cleanup complete. Deleted ${deletedCount} invalid reels.`);
        mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkAndCleanReels();
