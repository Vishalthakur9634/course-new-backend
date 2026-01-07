const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const Reel = require('./models/Reel');
const Course = require('./models/Course');
const Video = require('./models/Video');

async function dump() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher');
        console.log('Connected to MongoDB');

        let output = 'DATABASE PATH AUDIT\n===================\n\n';

        const reels = await Reel.find().limit(20).lean();
        output += `--- REELS FOUND: ${reels.length} ---\n`;
        reels.forEach((r, idx) => {
            output += `[Reel ${idx}] ID: ${r._id}\n`;
            output += `  Video: ${r.videoUrl}\n`;
            output += `  Thumb: ${r.thumbnailUrl}\n`;
        });

        const videos = await Video.find().limit(20).lean();
        output += `\n--- VIDEOS FOUND: ${videos.length} ---\n`;
        videos.forEach((v, idx) => {
            output += `[Video ${idx}] ID: ${v._id}\n`;
            output += `  Video: ${v.videoUrl}\n`;
            output += `  Thumb: ${v.thumbnailUrl}\n`;
        });

        const courses = await Course.find().limit(5).lean();
        output += `\n--- COURSES FOUND: ${courses.length} ---\n`;
        courses.forEach((c, idx) => {
            output += `[Course ${idx}] ID: ${c._id}\n`;
            output += `  Thumbnail: ${c.thumbnail}\n`;
            if (c.modules) {
                c.modules.forEach((m, mIdx) => {
                    m.lessons?.forEach((l, lIdx) => {
                        output += `    Lesson ${mIdx}.${lIdx}: ${l.videoUrl}\n`;
                    });
                });
            }
        });

        fs.writeFileSync('path_audit.txt', output);
        console.log('Results written to path_audit.txt');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

dump();
