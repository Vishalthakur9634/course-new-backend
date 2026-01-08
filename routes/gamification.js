const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Mission = require('../models/Mission');
const { authenticate } = require('../middleware/rbac');

// Get user XP and missions
router.get('/xp', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('gamification enrolledCourses certificates createdAt');
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Dynamic XP Calculation if not persisted
        const coursesCompleted = user.enrolledCourses?.filter(c => c.progress === 100).length || 0;
        const certificatesCount = user.certificates ? user.certificates.length : 0;
        const yearsActive = (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24 * 365);

        const calculatedXp = Math.floor(
            (user.enrolledCourses?.length * 100 || 0) +
            (coursesCompleted * 400) +
            (certificatesCount * 1000) +
            (yearsActive * 200)
        );

        // Persistent XP check
        const currentXp = user.gamification?.xp || calculatedXp;
        const level = Math.floor(currentXp / 1000) + 1;

        const missions = await Mission.find();

        res.json({
            xp: currentXp,
            level: level,
            streak: user.gamification?.streak || 0,
            badges: user.gamification?.badges || [],
            nextLevelXp: level * 1000,
            coursesCompleted,
            certificatesCount,
            missions: missions.map(m => {
                const completed = user.gamification?.completedMissions?.find(
                    cm => cm.missionId.toString() === m._id.toString()
                );
                return {
                    id: m._id,
                    title: m.title,
                    desc: m.description,
                    reward: m.rewardXp,
                    progress: completed ? 100 : 0,
                    icon: m.icon,
                    color: m.color,
                    completed: !!completed
                };
            })
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/leaderboard', async (req, res) => {
    try {
        const topUsers = await User.find({ role: 'student' })
            .select('name avatar gamification')
            .sort({ 'gamification.xp': -1 })
            .limit(10);

        res.json(topUsers.map(u => ({
            id: u._id,
            name: u.name,
            avatar: u.avatar,
            xp: u.gamification?.xp || 0,
            level: u.gamification?.level || 1
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new mission (Admin only)
router.post('/missions', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can manage missions' });
        }
        const newMission = new Mission(req.body);
        await newMission.save();
        res.status(201).json(newMission);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a mission (Admin only)
router.delete('/missions/:id', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can manage missions' });
        }
        await Mission.findByIdAndDelete(req.params.id);
        res.json({ message: 'Mission deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Redeem a reward
router.post('/redeem', authenticate, async (req, res) => {
    try {
        const { rewardId, costXp } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ message: 'User not found' });
        if ((user.gamification?.xp || 0) < costXp) {
            return res.status(400).json({ message: 'Insufficient XP' });
        }

        user.gamification.xp -= costXp;
        user.gamification.redeemedRewards.push({
            rewardId,
            costXp,
            redeemedAt: new Date()
        });

        await user.save();
        res.json({ message: 'Reward redeemed successfully', xp: user.gamification.xp });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Complete a mission
router.post('/complete-mission/:id', authenticate, async (req, res) => {
    try {
        const missionId = req.params.id;
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ message: 'User not found' });

        const alreadyCompleted = user.gamification?.completedMissions?.find(
            cm => cm.missionId.toString() === missionId
        );

        if (alreadyCompleted) {
            return res.status(400).json({ message: 'Mission already completed' });
        }

        const mission = await Mission.findById(missionId);
        if (!mission) return res.status(404).json({ message: 'Mission not found' });

        user.gamification.xp += mission.rewardXp;
        user.gamification.completedMissions.push({
            missionId,
            completedAt: new Date()
        });

        await user.save();
        res.json({ message: 'Mission completed!', xp: user.gamification.xp });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
