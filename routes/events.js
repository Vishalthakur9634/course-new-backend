const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/rbac');

router.get('/', async (req, res) => {
    try {
        res.json({
            live: [
                {
                    id: 1,
                    title: "Advanced Neural Networks Architecture",
                    instructor: "Dr. Aris Thorne",
                    isLive: true,
                    participants: 1240
                }
            ],
            upcoming: [
                {
                    id: 2,
                    title: "The Future of Web 4.0 Ecosystems",
                    date: "2026-01-08T10:00:00Z",
                    type: "Keynote"
                }
            ]
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
