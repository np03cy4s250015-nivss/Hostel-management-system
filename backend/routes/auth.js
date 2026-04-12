const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'Team_LMX_HMS_2026';

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const [users] = await db.execute(
            'SELECT id, username, password, role, first_name, last_name, email FROM users WHERE username = ?',
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
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { username, password, role, firstName, lastName, email, phone } = req.body;

        if (!username || !password || !role || !firstName || !lastName || !email) {
            return res.status(400).json({ error: 'All required fields must be provided' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.execute(
            'INSERT INTO users (username, password, role, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, role, firstName, lastName, email, phone || null]
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
            'SELECT id, username, role, first_name, last_name, email FROM users WHERE id = ?',
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
            email: user.email
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/logout', (req, res) => {
    res.json({ message: 'Logout successful' });
});

module.exports = router;