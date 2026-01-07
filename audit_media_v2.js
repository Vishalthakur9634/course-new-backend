const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const ReelSchema = new mongoose.Schema({}, { strict: false });
const Reel = mongoose.model('Reel', ReelSchema);

async function checkReels() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher');
        console.log('Connected to MongoDB');

        const reels = await Reel.find({});
        console.log(`Found ${reels.length} reels in database.\n`);

        const uploadsDir = path.join(__dirname, 'uploads');

        let healthy = 0;
        let broken = 0;

        for (const reel of reels) {
            const videoUrl = reel.videoUrl;
            if (!videoUrl) {
                console.log(`[EMPTY] Reel ${reel._id}: No videoUrl`);
                continue;
            }

            // Extract path relative to uploads
            // e.g. /uploads/files/xxx.mp4 -> files/xxx.mp4
            const relativePath = videoUrl.replace(/^\/?uploads\//, '');
            const filePath = path.join(uploadsDir, relativePath);

            if (fs.existsSync(filePath)) {
                healthy++;
                // console.log(`[OK] Reel ${reel._id}: ${videoUrl}`);
            } else {
                broken++;
                console.log(`[MISSING] Reel ${reel._id}: ${videoUrl}`);
                console.log(`          Expected at: ${filePath}\n`);
            }
        }

        console.log('--- AUDIT SUMMARY ---');
        console.log(`Healthy Reels: ${healthy}`);
        console.log(`Broken Reels:  ${broken}`);
        console.log('----------------------');

        if (broken > 0) {
            console.log('\nACTION REQUIRED: Please re-upload the missing files listed above or delete the broken reel documents.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Audit failed:', error);
        process.exit(1);
    }
}

checkReels();
