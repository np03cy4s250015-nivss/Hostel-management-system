const path = require('path');

module.exports = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    frontendPath: path.join(__dirname, '../../frontend')
};