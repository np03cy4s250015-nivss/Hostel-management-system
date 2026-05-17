const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./config/database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').filter(Boolean).map(u => {
    try { return new URL(u).origin; } catch { return u; }
});
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.length === 0) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        try {
            const u = new URL(origin);
            if ((u.hostname === '127.0.0.1' || u.hostname === 'localhost' || /^192\.168\./.test(u.hostname) || /^10\./.test(u.hostname)) && u.port === '5500') {
                return callback(null, true);
            }
        } catch {}
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const contentType = req.headers['content-type'] || '';
        if (!contentType.startsWith('application/json') && !contentType.startsWith('multipart/form-data') && !contentType.startsWith('application/x-www-form-urlencoded')) {
            return res.status(400).json({ error: 'Content-Type header required for state-changing requests' });
        }
    }
    next();
});

app.use('/users', express.static(path.join(__dirname, 'users')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/data', require('./routes/data'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api', require('./routes'));

app.get('/', (req, res) => {
    res.json({ message: 'Hostel Management System API' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;