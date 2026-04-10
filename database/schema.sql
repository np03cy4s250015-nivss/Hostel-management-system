-- =============================================
-- Hostel Management System - MySQL Database Schema
-- =============================================

-- Create database
CREATE DATABASE IF NOT EXISTS hostel_management;
USE hostel_management;

-- =============================================
-- Users Table
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role ENUM('admin', 'student', 'warden') DEFAULT 'student',
    phone VARCHAR(20),
    address TEXT,
    profile_image VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- =============================================
-- Blocks Table
-- =============================================
CREATE TABLE IF NOT EXISTS blocks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    total_floors INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_block_name (name)
);

-- =============================================
-- Rooms Table
-- =============================================
CREATE TABLE IF NOT EXISTS rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_number VARCHAR(20) NOT NULL,
    block_id INT NOT NULL,
    floor INT NOT NULL,
    room_type ENUM('single', 'double', 'triple', 'dormitory') DEFAULT 'double',
    capacity INT NOT NULL DEFAULT 2,
    price DECIMAL(10, 2) NOT NULL,
    status ENUM('available', 'occupied', 'maintenance', 'reserved') DEFAULT 'available',
    amenities JSON,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
    UNIQUE INDEX idx_room_block (room_number, block_id),
    INDEX idx_status (status),
    INDEX idx_block (block_id)
);

-- =============================================
-- Bookings Table
-- =============================================
CREATE TABLE IF NOT EXISTS bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    booking_date DATE NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE,
    booking_status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
    booking_type ENUM('new', 'renewal', 'transfer') DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_room (room_id),
    INDEX idx_status (booking_status),
    INDEX idx_booking_date (booking_date)
);

-- =============================================
-- Payments Table
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash', 'card', 'bank_transfer', 'online') DEFAULT 'cash',
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    transaction_id VARCHAR(100) UNIQUE,
    payment_date DATE,
    month VARCHAR(20),
    year INT,
    receipt_number VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_booking (booking_id),
    INDEX idx_user (user_id),
    INDEX idx_status (payment_status),
    INDEX idx_transaction (transaction_id)
);

-- =============================================
-- Complaints Table
-- =============================================
CREATE TABLE IF NOT EXISTS complaints (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    room_id INT,
    category ENUM('plumbing', 'electrical', 'furniture', 'cleaning', 'noise', 'security', 'other') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    assigned_to INT,
    resolved_date DATE,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_priority (priority)
);

-- =============================================
-- Maintenance Requests Table
-- =============================================
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id INT NOT NULL,
    requested_by INT NOT NULL,
    maintenance_type ENUM('repair', 'replacement', 'upgrade', 'inspection') NOT NULL,
    description TEXT NOT NULL,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    scheduled_date DATE,
    completed_date DATE,
    cost DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_room (room_id),
    INDEX idx_status (status)
);

-- =============================================
-- Notices Table
-- =============================================
CREATE TABLE IF NOT EXISTS notices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    notice_type ENUM('general', 'emergency', 'event', 'maintenance', 'payment') DEFAULT 'general',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    target_block_id INT,
    target_all BOOLEAN DEFAULT TRUE,
    published_by INT NOT NULL,
    publish_date DATE NOT NULL,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_block_id) REFERENCES blocks(id) ON DELETE SET NULL,
    INDEX idx_type (notice_type),
    INDEX idx_status (is_active),
    INDEX idx_publish_date (publish_date)
);

-- =============================================
-- Room Allocations Table
-- =============================================
CREATE TABLE IF NOT EXISTS room_allocations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    booking_id INT,
    allocation_date DATE NOT NULL,
    deallocation_date DATE,
    status ENUM('active', 'deallocated') DEFAULT 'active',
    bed_number INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    UNIQUE INDEX idx_user_active (user_id, status),
    INDEX idx_room (room_id),
    INDEX idx_status (status)
);

-- =============================================
-- Insert Sample Data
-- =============================================

-- Insert sample blocks
INSERT INTO blocks (name, description, total_floors) VALUES
('Block A', 'Main hostel block A with single and double rooms', 4),
('Block B', 'Hostel block B for female students', 3),
('Block C', 'Hostel block C for male students', 4);

-- Insert sample rooms
INSERT INTO rooms (room_number, block_id, floor, room_type, capacity, price, status) VALUES
('101', 1, 1, 'single', 1, 5000, 'occupied'),
('102', 1, 1, 'double', 2, 3500, 'available'),
('201', 1, 2, 'double', 2, 3500, 'occupied'),
('204', 1, 2, 'double', 2, 3500, 'occupied'),
('301', 1, 3, 'triple', 3, 2500, 'available'),
('401', 1, 4, 'triple', 3, 2500, 'maintenance'),
('101', 2, 1, 'single', 1, 5500, 'occupied'),
('102', 2, 1, 'double', 2, 4000, 'available'),
('201', 2, 2, 'double', 2, 4000, 'available'),
('305', 3, 3, 'double', 2, 3800, 'available');

-- Insert sample admin user (password: admin123)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, phone) VALUES
('admin', 'admin@hostel.com', '$2a$10$XqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQq', 'Admin', 'Warden', 'admin', '1234567890');

-- Insert sample student users (password: student123)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, phone) VALUES
('student', 'student@hostel.com', '$2a$10$XqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQq', 'John', 'Student', 'student', '9876543210'),
('john_smith', 'john.smith@hostel.com', '$2a$10$XqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQq', 'John', 'Smith', 'student', '1111111111'),
('mike_johnson', 'mike.johnson@hostel.com', '$2a$10$XqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQq', 'Mike', 'Johnson', 'student', '2222222222'),
('sarah_williams', 'sarah.williams@hostel.com', '$2a$10$XqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQqQq', 'Sarah', 'Williams', 'student', '3333333333');

-- Insert sample notices
INSERT INTO notices (title, content, notice_type, priority, published_by, publish_date, target_all) VALUES
('Water Supply Interruption', 'Water supply will be interrupted on April 5th from 10 AM to 2 PM for maintenance work.', 'maintenance', 'high', 1, '2024-04-01', TRUE),
('Monthly Fee Payment Reminder', 'April monthly fee payment due date is April 10th. Please pay on time to avoid late fees.', 'payment', 'medium', 1, '2024-03-28', TRUE),
('New WiFi Password', 'The new WiFi password for Block A is: Hostel2024@A', 'general', 'low', 1, '2024-03-25', FALSE);

-- Insert sample complaints
INSERT INTO complaints (user_id, room_id, category, title, description, priority, status) VALUES
(3, 4, 'plumbing', 'Leaking faucet in bathroom', 'The faucet in the bathroom is leaking continuously', 'medium', 'in_progress'),
(4, 4, 'electrical', 'Fan not working properly', 'The ceiling fan is making noise and not rotating properly', 'low', 'resolved'),
(5, 9, 'furniture', 'Broken chair in room', 'The chair in the room is broken and needs replacement', 'low', 'resolved');

-- Insert sample payments
INSERT INTO payments (booking_id, user_id, amount, payment_method, payment_status, payment_date, month, year, transaction_id) VALUES
(1, 3, 500.00, 'online', 'completed', '2024-03-05', 'March', 2024, 'TXN2024003'),
(2, 4, 500.00, 'online', 'completed', '2024-03-08', 'March', 2024, 'TXN2024004'),
(3, 5, 500.00, 'online', 'pending', NULL, 'March', 2024, 'TXN2024005');