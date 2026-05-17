const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./config/database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.FRONTEND_URL || 'http://127.0.0.1:5500').split(',').map(u => {
    try { return new URL(u).origin; } catch { return u; }
});
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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