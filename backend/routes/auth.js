const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../config/database');
const { JWT_SECRET, invalidateToken } = require('../middleware/auth');

const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts. Please try again in a minute.' },
    standardHeaders: true,
    legacyHeaders: false
});

router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const [users] = await db.execute(
            'SELECT id, username, password, role, first_name, last_name, email, image_url FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                name: `${user.first_name} ${user.last_name}`,
                role: user.role,
                email: user.email,
                image_url: user.image_url || null
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { username, password, firstName, lastName, email, phone } = req.body;

        if (!username || !password || !firstName || !lastName || !email) {
            return res.status(400).json({ error: 'All required fields must be provided' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.execute(
            'INSERT INTO users (username, password, role, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, 'student', firstName, lastName, email, phone || null]
        );

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const [users] = await db.execute(
            'SELECT id, username, role, first_name, last_name, email, image_url FROM users WHERE id = ?',
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        res.json({
            id: user.id,
            username: user.username,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            email: user.email,
            image_url: user.image_url || null
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        invalidateToken(token);
    }
    res.json({ message: 'Logout successful' });
});

const { generateOtp, verifyOtp } = require('../services/otpService');

router.post('/forgot-password', async (req, res) => {
    try {
        const { username, email } = req.body;

        if (!username || !email) {
            return res.status(400).json({ error: 'Username and email are required' });
        }

        const [users] = await db.execute(
            'SELECT id, email FROM users WHERE username = ? AND email = ?',
            [username, email]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'No account found with that username and email combination' });
        }

        const user = users[0];
        const otp = generateOtp(user.id);

        console.log(`[Password Reset] OTP for ${username}: ${otp}`);

        res.json({
            message: 'OTP sent successfully! Check the server console or Windows notification for your OTP.',
            otp: otp,
            userId: user.id
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { userId, otp, newPassword } = req.body;

        if (!userId || !otp || !newPassword) {
            return res.status(400).json({ error: 'userId, otp, and newPassword are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const result = verifyOtp(userId, otp);
        if (!result.valid) {
            return res.status(400).json({ error: result.reason });
        }

        const hashedPassword = await require('bcrypt').hash(newPassword, 10);
        await db.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        res.json({ message: 'Password reset successful! You can now login with your new password.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = router;