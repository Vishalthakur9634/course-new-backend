const mongoose = require('mongoose');
require('dotenv').config();

const LearningPath = require('./models/LearningPath');
const JobListing = require('./models/JobListing');
const Project = require('./models/Project');
const Event = require('./models/Event');
const Mission = require('./models/Mission');
const VaultItem = require('./models/VaultItem');
const SkillTree = require('./models/SkillTree');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/course-launcher';

const seedData = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        // Force reload models to pick up schema changes
        if (mongoose.models.Community) delete mongoose.models.Community;
        if (mongoose.models.LearningPath) delete mongoose.models.LearningPath;
        if (mongoose.models.VaultItem) delete mongoose.models.VaultItem;

        const { Community } = require('./models/Community');

        const User = require('./models/User');

        let user = await User.findOne();
        if (!user) {
            user = new User({
                name: 'System Admin',
                email: 'admin@system.com',
                role: 'superadmin'
            });
            // We might need a dummy password if it's required
            user.password = 'SystemAdmin123!';
            await user.save();
            console.log('Created System Admin user for seeding.');
        }
        const creatorId = user._id;

        // Clear existing data
        await LearningPath.deleteMany({});
        await JobListing.deleteMany({});
        await Project.deleteMany({});
        await Event.deleteMany({});
        await Mission.deleteMany({});
        await VaultItem.deleteMany({});
        await SkillTree.deleteMany({});

        // Seed Learning Paths
        const paths = [
            {
                title: 'Full-Stack Web Development',
                description: 'Master both frontend and backend development with modern technologies.',
                category: 'development',
                difficulty: 'Intermediate',
                duration: '6 months',
                enrolledCount: 1250,
                isPublic: true,
                instructorId: creatorId,
                thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085'
            },
            {
                title: 'Machine Learning Specialist',
                description: 'Deep dive into neural networks, data science, and AI models.',
                category: 'data-science',
                difficulty: 'Advanced',
                duration: '8 months',
                enrolledCount: 850,
                isPublic: true,
                instructorId: creatorId,
                thumbnail: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb'
            }
        ];
        await LearningPath.insertMany(paths);
        console.log('Seed: Learning Paths added.');

        // Seed Jobs
        const jobs = [
            {
                title: 'Senior Frontend Engineer',
                company: 'Google',
                location: 'Mountain View, CA (Remote)',
                type: 'Full-time',
                category: 'Engineering',
                description: 'Join our search team to build next-gen interfaces.',
                skills: ['React', 'TypeScript', 'Web Workers'],
                salary: '$180k - $250k',
                status: 'Open',
                postedBy: creatorId
            },
            {
                title: 'UI/UX Designer',
                company: 'Figma',
                location: 'San Francisco, CA',
                type: 'Full-time',
                category: 'Design',
                description: 'Help us design the future of design tools.',
                skills: ['Figma', 'Systems Design', 'Prototyping'],
                salary: '$140k - $190k',
                status: 'Open',
                postedBy: creatorId
            }
        ];
        await JobListing.insertMany(jobs);
        console.log('Seed: Jobs added.');

        // Seed Projects
        const projects = [
            {
                title: 'Inventory Management System',
                description: 'Develop a secure warehouse tracking system for a local logistics company.',
                budget: '$3,500',
                duration: '2 months',
                difficulty: 'Intermediate',
                skills: ['Next.js', 'PostgreSQL', 'Docker'],
                category: 'Development',
                status: 'Open',
                postedBy: creatorId
            },
            {
                title: 'Branding for Eco-Startup',
                description: 'Complete brand identity including logo, palette, and social assets.',
                budget: '$1,200',
                duration: '3 weeks',
                difficulty: 'Beginner',
                skills: ['Illustrator', 'Branding', 'Eco-friendly'],
                category: 'Design',
                status: 'Open',
                postedBy: creatorId
            }
        ];
        await Project.insertMany(projects);
        console.log('Seed: Projects added.');

        // Seed Events
        const events = [
            {
                title: 'Future of Web 3.0 Conference',
                description: 'Explore the next generation of the web with top industry experts.',
                date: new Date('2026-01-24T10:00:00Z'),
                time: '10:00 AM - 04:00 PM',
                location: 'Virtual Lounge',
                type: 'Conference',
                organizer: creatorId,
                isFeatured: true
            },
            {
                title: 'System Design Interview Workshop',
                description: 'Crack any system design interview with our proven framework.',
                date: new Date('2026-02-02T18:00:00Z'),
                time: '06:00 PM - 08:00 PM',
                location: 'Zoom Premium',
                type: 'Workshop',
                organizer: creatorId,
                isFeatured: false
            }
        ];
        await Event.insertMany(events);
        console.log('Seed: Events added.');

        const missions = [
            { title: 'Deep Focus', description: 'Complete 2 lessons today', rewardXp: 50, type: 'daily', icon: 'Target', color: 'brand-primary' },
            { title: 'Knowledge Weaver', description: 'Interact with 3 social posts', rewardXp: 30, type: 'daily', icon: 'Zap', color: 'brand-accent' },
            { title: 'Elite Scholar', description: 'Take a practice quiz', rewardXp: 100, type: 'daily', icon: 'Shield', color: 'purple-500' }
        ];
        await Mission.insertMany(missions);
        console.log('Seed: Missions added.');

        // Seed Vault Items
        const vaultItems = [
            {
                name: 'React 18 Performance Guide',
                type: 'PDF',
                category: 'curriculum',
                size: '2.4 MB',
                security: 'Unrestricted',
                date: '2025-12-01',
                url: '#',
                uploadedBy: creatorId
            },
            {
                name: 'System Design Interview Bundle',
                type: 'ZIP',
                category: 'curriculum',
                size: '128 MB',
                security: 'Restricted',
                date: '2025-12-15',
                url: '#',
                uploadedBy: creatorId
            }
        ];
        await VaultItem.insertMany(vaultItems);
        console.log('Seed: Vault Items added.');

        // Seed Skill Trees
        const skillTrees = [
            {
                id: 'backend-eng',
                title: 'Backend Engineering',
                icon: 'Database',
                category: 'Engineering',
                nodes: [
                    { id: 1, title: 'Node.js Core', level: 1, status: 'completed' },
                    { id: 2, title: 'Advanced Mongodb', level: 2, status: 'in-progress' },
                    { id: 3, title: 'Microservices Architecture', level: 3, status: 'locked' }
                ]
            },
            {
                id: 'ai-specialization',
                title: 'AI/ML Specialization',
                icon: 'Cpu',
                category: 'Data Science',
                nodes: [
                    { id: 1, title: 'Python for DS', level: 1, status: 'completed' },
                    { id: 2, title: 'Neural Networks', level: 2, status: 'completed' },
                    { id: 3, title: 'LLM Fine-tuning', level: 3, status: 'in-progress' }
                ]
            }
        ];
        await SkillTree.insertMany(skillTrees);
        console.log('Seed: Skill Trees added.');

        // Seed Study Groups (Communities)
        const studyGroups = [
            {
                name: 'React Mastery Group',
                description: 'A place to discuss advanced React patterns and best practices.',
                category: 'general',
                isPrivate: false,
                isOfficial: true,
                color: '#61dafb',
                memberCount: 450,
                creatorId: creatorId
            },
            {
                name: 'Data Structures & Algorithms',
                description: 'Daily coding challenges and interview preparation.',
                category: 'general',
                isPrivate: false,
                isOfficial: false,
                color: '#f7df1e',
                memberCount: 1200,
                creatorId: creatorId
            }
        ];
        // Only insert if they don't exist to avoid duplicates if seed is run multiple times
        for (const group of studyGroups) {
            const exists = await Community.findOne({ name: group.name });
            if (!exists) {
                await Community.create(group);
            }
        }
        console.log('Seed: Study Groups added.');

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        const util = require('util');
        const fs = require('fs');
        fs.writeFileSync('error_log.json', util.inspect(error, { showHidden: false, depth: null }));
        console.error('Error seeding data:');
        console.error(util.inspect(error, { showHidden: false, depth: null, colors: true }));
        process.exit(1);
    }
};

seedData();
