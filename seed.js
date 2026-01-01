const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');
const Course = require('./models/Course');
const Video = require('./models/Video');
const Review = require('./models/Review');
const Enrollment = require('./models/Enrollment');

dotenv.config();

const USERS_DATA = [
    {
        name: 'Super Admin',
        email: 'admin@courselauncher.com',
        password: 'Admin@123',
        role: 'superadmin',
        isInstructorApproved: true
    },
    {
        name: 'John Instructor',
        email: 'john@instructor.com',
        password: 'Password@123',
        role: 'instructor',
        isInstructorApproved: true,
        instructorProfile: {
            headline: 'Senior Full Stack Developer',
            expertise: ['React', 'Node.js', 'MongoDB'],
            experience: '10+ years',
            totalCourses: 2
        }
    },
    {
        name: 'Jane Smith',
        email: 'jane@instructor.com',
        password: 'Password@123',
        role: 'instructor',
        isInstructorApproved: true,
        instructorProfile: {
            headline: 'UI/UX Design Expert',
            expertise: ['Figma', 'Adobe XD', 'UI Design'],
            experience: '8 years',
            totalCourses: 2
        }
    },
    {
        name: 'Alice Student',
        email: 'alice@student.com',
        password: 'Password@123',
        role: 'student'
    },
    {
        name: 'Bob Student',
        email: 'bob@student.com',
        password: 'Password@123',
        role: 'student'
    },
    {
        name: 'Charlie Student',
        email: 'charlie@student.com',
        password: 'Password@123',
        role: 'student'
    }
];

const COURSES_DATA = [
    {
        title: 'Mastering React & Modern Web Development',
        description: 'Comprehensive guide to building professional web applications with React, including hooks, context, and performance optimization.',
        price: 99.99,
        category: 'Development',
        level: 'intermediate',
        language: 'English',
        isPublished: true,
        approvalStatus: 'approved',
        enrollmentCount: 150,
        rating: 4.8,
        thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop&q=60'
    },
    {
        title: 'Business Strategy 2024: A Modern Approach',
        description: 'Learn how to scale businesses with data-driven decision making and modern growth hacking techniques.',
        price: 79.99,
        category: 'Business',
        level: 'beginner',
        language: 'English',
        isPublished: true,
        approvalStatus: 'approved',
        enrollmentCount: 85,
        rating: 4.5,
        thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60'
    },
    {
        title: 'Complete UI/UX Design Masterclass',
        description: 'From wireframing to high-fidelity prototyping. Master Figma and Adobe XD for professional web and mobile design.',
        price: 129.99,
        category: 'Design',
        level: 'all',
        language: 'English',
        isPublished: true,
        approvalStatus: 'approved',
        enrollmentCount: 210,
        rating: 4.9,
        thumbnail: 'https://images.unsplash.com/photo-1586717791821-3f44a563dc4c?w=800&auto=format&fit=crop&q=60'
    },
    {
        title: 'Social Media Marketing 2.0',
        description: 'Drive engagement and sales through optimized social media campaigns on Instagram, TikTok, and LinkedIn.',
        price: 59.99,
        category: 'Marketing',
        level: 'beginner',
        language: 'English',
        isPublished: true,
        approvalStatus: 'approved',
        enrollmentCount: 300,
        rating: 4.7,
        thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop&q=60'
    }
];

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Course.deleteMany({});
        await Video.deleteMany({});
        await Review.deleteMany({});
        await Enrollment.deleteMany({});
        console.log('✅ Cleared existing data');

        // Create Users
        const createdUsers = [];
        for (const userData of USERS_DATA) {
            const hashedPassword = await bcrypt.hash(userData.password, 12);
            const user = new User({
                ...userData,
                password: hashedPassword
            });
            await user.save();
            createdUsers.push(user);
            console.log(`✅ Created user: ${userData.name} (${userData.role})`);
        }

        const instructors = createdUsers.filter(u => u.role === 'instructor');
        const students = createdUsers.filter(u => u.role === 'student');

        // Create Courses
        for (let i = 0; i < COURSES_DATA.length; i++) {
            const courseData = COURSES_DATA[i];
            const instructor = instructors[i % instructors.length];

            const course = new Course({
                ...courseData,
                instructorId: instructor._id
            });

            // Add placeholder videos
            const videos = [];
            for (let j = 1; j <= 3; j++) {
                const video = new Video({
                    title: `Lesson ${j}: Introduction to ${courseData.category}`,
                    description: `Understanding the fundamentals of ${courseData.category} in part ${j}.`,
                    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
                    courseId: course._id,
                    duration: 600,
                    order: j
                });
                await video.save();
                videos.push(video._id);
            }

            course.videos = videos;
            await course.save();
            console.log(`✅ Created course: ${course.title}`);

            // Create some random enrollments and reviews
            for (let k = 0; k < 2; k++) {
                const student = students[Math.floor(Math.random() * students.length)];

                // Avoid duplicate enrollments
                const existingEnrollment = await Enrollment.findOne({ studentId: student._id, courseId: course._id });
                if (existingEnrollment) continue;

                const enrollment = new Enrollment({
                    studentId: student._id,
                    courseId: course._id,
                    instructorId: instructor._id,
                    enrolledAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
                    status: 'active',
                    progress: Math.floor(Math.random() * 100)
                });
                await enrollment.save();

                const review = new Review({
                    user: student._id,
                    course: course._id,
                    rating: 4 + Math.random(),
                    comment: 'This course is very helpful! Great content and clear explanations.',
                    createdAt: new Date()
                });
                await review.save();
            }
        }

        console.log('✅ Database seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        if (error.name === 'ValidationError') {
            console.error('Validation Errors:', Object.keys(error.errors).map(key => `${key}: ${error.errors[key].message}`));
        }
        process.exit(1);
    }
}

seedDatabase();
