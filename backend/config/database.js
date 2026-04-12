const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hostel_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: false
});

const promisePool = pool.promise();

module.exports = promisePool;