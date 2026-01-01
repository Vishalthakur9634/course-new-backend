const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const processVideo = (inputPath, outputDir, videoId) => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const masterPlaylistPath = path.join(outputDir, 'master.m3u8');

        ffmpeg(inputPath, { timeout: 432000 })
            .addOptions([
                '-profile:v baseline',
                '-level 3.0',
                '-start_number 0',
                '-hls_time 10',
                '-hls_list_size 0',
                '-f hls'
            ])
            // Optimization: Only generating 720p for speed/practicality to prevent upload timeouts
            .output(path.join(outputDir, '720p.m3u8'))
            .videoCodec('libx264')
            .audioCodec('aac')
            .size('1280x720')
            .on('end', () => {
                // Create master playlist pointing just to 720p
                const masterContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p.m3u8`;
                fs.writeFileSync(masterPlaylistPath, masterContent);
                resolve(masterPlaylistPath);
            })
            .on('error', (err) => {
                console.error('Error processing video:', err);
                reject(err);
            })
            .run();
    });
};

module.exports = { processVideo };
