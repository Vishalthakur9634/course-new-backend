const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const Reel = require('./models/Reel');

async function auditUploads() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher');
        console.log('Connected to MongoDB');

        const reels = await Reel.find();
        console.log(`Auditing ${reels.length} reels...`);

        let missingCount = 0;
        reels.forEach((r) => {
            if (!r.videoUrl) return;

            // Convert relative URL /uploads/files/xxx to local path
            const relativePath = r.videoUrl.startsWith('/') ? r.videoUrl.slice(1) : r.videoUrl;
            const fullPath = path.join(__dirname, relativePath);

            if (!fs.existsSync(fullPath)) {
                console.log(`❌ Missing video: ${r.title} (${r._id})`);
                console.log(`   Path: ${fullPath}`);
                missingCount++;
            }
        });

        console.log(`--- AUDIT SUMMARY ---`);
        console.log(`Total Reels: ${reels.length}`);
        console.log(`Missing Files: ${missingCount}`);
        console.log(`---------------------`);

        mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

auditUploads();
