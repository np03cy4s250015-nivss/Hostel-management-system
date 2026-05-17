-- Hostel Management System Database Setup
-- Run these commands manually in MySQL

-- Create database
CREATE DATABASE IF NOT EXISTS hostel_management;
USE hostel_management;

-- Users table (admin and students)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student') NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    image_url VARCHAR(255) DEFAULT NULL,
    preferences JSON DEFAULT NULL
);

-- Rooms table (no blocks - just floors)
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL UNIQUE,
    floor INT NOT NULL,
    capacity INT NOT NULL,
    current_occupancy INT DEFAULT 0,
    status ENUM('available', 'full', 'maintenance') DEFAULT 'available'
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT DEFAULT NULL,
    admission_number VARCHAR(50) UNIQUE NOT NULL,
    price DECIMAL(10, 2) DEFAULT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- Notices table (no target_block - removed blocks)
CREATE TABLE IF NOT EXISTS notices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    posted_by INT NOT NULL,
    priority ENUM('normal', 'important', 'urgent') DEFAULT 'normal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Complaints table
CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('pending', 'in_progress', 'resolved', 'rejected') DEFAULT 'pending',
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Settings Change Requests table (for username/password/theme updates with admin approval)
CREATE TABLE IF NOT EXISTS settings_change_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    setting_type ENUM('username', 'password', 'theme') NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    reviewed_by INT DEFAULT NULL,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_user_id (user_id)
);

-- User Settings table (for storing user preferences like theme)
CREATE TABLE IF NOT EXISTS user_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    theme VARCHAR(20) DEFAULT 'light',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- Insert rooms: 3 floors × 10 rooms = 30 total rooms
-- Floor 1: 101-110, Floor 2: 201-210, Floor 3: 301-310
INSERT INTO rooms (room_number, floor, capacity, status) VALUES
-- Floor 1
('101', 1, 2, 'available'), ('102', 1, 2, 'available'), ('103', 1, 2, 'available'),
('104', 1, 2, 'available'), ('105', 1, 2, 'available'), ('106', 1, 2, 'available'),
('107', 1, 2, 'available'), ('108', 1, 2, 'available'), ('109', 1, 2, 'available'),
('110', 1, 2, 'available'),
-- Floor 2
('201', 2, 2, 'available'), ('202', 2, 2, 'available'), ('203', 2, 2, 'available'),
('204', 2, 2, 'available'), ('205', 2, 2, 'available'), ('206', 2, 2, 'available'),
('207', 2, 2, 'available'), ('208', 2, 2, 'available'), ('209', 2, 2, 'available'),
('210', 2, 2, 'available'),
-- Floor 3
('301', 3, 2, 'available'), ('302', 3, 2, 'available'), ('303', 3, 2, 'available'),
('304', 3, 2, 'available'), ('305', 3, 2, 'available'), ('306', 3, 2, 'available'),
('307', 3, 2, 'available'), ('308', 3, 2, 'available'), ('309', 3, 2, 'available'),
('310', 3, 2, 'available');

-- Payments table (for tracking monthly fee payments)
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'esewa',
    transaction_id VARCHAR(255) DEFAULT NULL,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    paid_month VARCHAR(7) NOT NULL,
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_student_id (student_id),
    INDEX idx_paid_month (paid_month),
    INDEX idx_status (status)
);

-- Default admin user (password: admin123)
-- WARNING: Change this password immediately after first login for production use.
INSERT INTO users (username, password, role, first_name, last_name, email, phone) 
VALUES ('admin', '$2b$10$0McFV9JvPsbarUbjzB9Tf.J.bJrnijJXnW9dn5SyEU6oJnZ97n5Ge', 'admin', 'Admin', 'Warden', 'admin@hms.com', '1234567890');