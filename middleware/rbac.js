const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT and attach user to request
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            console.log('Auth Middleware: No token provided');
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            console.log('Auth Middleware: User not found for ID', decoded.id);
            return res.status(401).json({ message: 'User not found' });
        }

        if (user.isBanned) {
            return res.status(403).json({ message: 'Account banned', reason: user.banReason });
        }

        req.user = user;
        next();
    } catch (error) {
        console.log('Auth Middleware Error:', error.message);
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Role-based access control
const requireStudent = (req, res, next) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ message: 'Access denied. Student role required.' });
    }
    next();
};

const requireInstructor = (req, res, next) => {
    console.log('requireInstructor Check:', {
        userId: req.user?._id,
        role: req.user?.role,
        isInstructorApproved: req.user?.isInstructorApproved
    });

    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
        return next();
    }

    if (req.user.role !== 'instructor') {
        console.log('Access Denied: Role not allowed');
        return res.status(403).json({ message: 'Access denied. Instructor role required.' });
    }

    if (!req.user.isInstructorApproved) {
        console.log('Access Denied: Instructor not approved');
        return res.status(403).json({ message: 'Your instructor account is pending approval.' });
    }

    next();
};

const requireSuperAdmin = (req, res, next) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Access denied. Super admin role required.' });
    }
    next();
};

// Accept any of the specified roles
const requireAnyRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied. Required roles: ${roles.join(', ')}`
            });
        }

        // For instructors, check approval status
        if (req.user.role === 'instructor' && !req.user.isInstructorApproved) {
            return res.status(403).json({ message: 'Your instructor account is pending approval.' });
        }

        next();
    };
};

// Verify course ownership
const requireCourseOwnership = async (req, res, next) => {
    try {
        const Course = require('../models/Course');
        const courseId = req.params.courseId || req.params.id;

        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Super admin can access any course
        if (req.user.role === 'superadmin') {
            req.course = course;
            return next();
        }

        // Check if user is the instructor
        if (course.instructorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied. You are not the owner of this course.' });
        }

        req.course = course;
        next();
    } catch (error) {
        res.status(500).json({ message: 'Error verifying course ownership', error: error.message });
    }
};

// Check if student has access to course (purchased/enrolled)
const requireCourseAccess = async (req, res, next) => {
    try {
        const Enrollment = require('../models/Enrollment');
        const courseId = req.params.courseId || req.params.id;

        // Instructor can access their own courses
        if (req.user.role === 'instructor') {
            const Course = require('../models/Course');
            const course = await Course.findById(courseId);
            if (course && course.instructorId.toString() === req.user._id.toString()) {
                return next();
            }
        }

        // Super admin can access any course
        if (req.user.role === 'superadmin') {
            return next();
        }

        // Check enrollment for students
        const enrollment = await Enrollment.findOne({
            studentId: req.user._id,
            courseId: courseId
        });

        if (!enrollment) {
            return res.status(403).json({ message: 'You are not enrolled in this course' });
        }

        req.enrollment = enrollment;
        next();
    } catch (error) {
        res.status(500).json({ message: 'Error verifying course access', error: error.message });
    }
};

module.exports = {
    authenticate,
    requireStudent,
    requireInstructor,
    requireSuperAdmin,
    requireAnyRole,
    requireCourseOwnership,
    requireCourseAccess
};
