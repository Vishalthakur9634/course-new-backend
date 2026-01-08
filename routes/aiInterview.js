const express = require('express');
const router = express.Router();
const InterviewSession = require('../models/InterviewSession');
const { authenticate } = require('../middleware/rbac');

// Mock Questions Database
const QUESTIONS = {
    'Software Engineer': [
        "Tell me about a challenging technical problem you solved recently.",
        "Explain the difference between a process and a thread.",
        "How do you handle invalid input in an API endpoint?",
        "Describe the concept of 'Big O' notation to a non-technical person."
    ],
    'Frontend Developer': [
        "What is the difference between UseState and UseEffect in React?",
        "Explain the box model in CSS.",
        "How do you optimize a React application for performance?",
        "What are Semantic HTML tags and why are they important?"
    ],
    // Add more roles as needed
};

// @route   POST /api/ai-interview/start
// @desc    Start a new interview session
// @access  Student
router.post('/start', authenticate, async (req, res) => {
    try {
        const { role, difficulty } = req.body;

        // Initial greeting
        const greeting = `Hello! I'm your AI interviewer for the ${difficulty} ${role} position. Let's get started. Tell me a little bit about yourself and your background.`;

        const session = new InterviewSession({
            studentId: req.user.id,
            role,
            difficulty,
            transcript: [{
                speaker: 'AI',
                text: greeting
            }]
        });

        await session.save();
        res.status(201).json(session);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/ai-interview/message
// @desc    Send a message and get AI response
// @access  Student
router.post('/message', authenticate, async (req, res) => {
    try {
        const { sessionId, message } = req.body;
        const session = await InterviewSession.findById(sessionId);

        if (!session) return res.status(404).json({ message: 'Session not found' });
        if (session.studentId.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

        // Add User Message
        session.transcript.push({
            speaker: 'User',
            text: message
        });

        // Simple Mock AI Logic
        // In a real app, this would call OpenAI/Gemini API
        let aiResponse = "";

        // Pick a question based on transcript length (simplified flow)
        const exchangeCount = session.transcript.filter(t => t.speaker === 'User').length;
        const questionsList = QUESTIONS[session.role] || QUESTIONS['Software Engineer'];

        if (exchangeCount <= questionsList.length) {
            aiResponse = `That's interesting. moving on... ${questionsList[exchangeCount - 1]}`;
        } else {
            aiResponse = "Thank you for your answers. That concludes the technical portion. Do you have any questions for me?";
            session.status = 'completed';
            // Mock Scoring
            session.scores = {
                technical: Math.floor(Math.random() * 3) + 7, // 7-9
                communication: Math.floor(Math.random() * 3) + 7,
                problemSolving: Math.floor(Math.random() * 3) + 7,
                overall: 8
            };
        }

        // Add AI Response
        session.transcript.push({
            speaker: 'AI',
            text: aiResponse
        });

        await session.save();
        res.json(session);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/ai-interview/history
// @desc    Get user's interview history
// @access  Student
router.get('/history', authenticate, async (req, res) => {
    try {
        const history = await InterviewSession.find({ studentId: req.user.id }).sort({ createdAt: -1 });
        res.json(history);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
