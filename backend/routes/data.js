const express = require('express');
const router = express.Router();
const db = require('../config/database');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'users');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `student_${req.params.id}_${Date.now()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(path.extname(file.originalname))) return cb(null, true);
        cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed'));
    }
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

router.use(authenticateToken);

router.get('/stats', async (req, res) => {
    try {
        const [[totalStudents]] = await db.execute('SELECT COUNT(*) as count FROM students');
        const [[occupiedRooms]] = await db.execute("SELECT COUNT(*) as count FROM rooms WHERE status = 'full'");
        const [[pendingComplaints]] = await db.execute("SELECT COUNT(*) as count FROM complaints WHERE status IN ('pending', 'in_progress')");
        
        res.json({
            totalStudents: totalStudents.count,
            occupiedRooms: occupiedRooms.count,
            pendingComplaints: pendingComplaints.count
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

router.get('/students', async (req, res) => {
    try {
        const [students] = await db.execute(`
            SELECT s.id, s.admission_number, s.price,
                   u.username, u.first_name, u.last_name, u.email, u.phone, u.image_url,
                   r.room_number, r.floor
            FROM students s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN rooms r ON s.room_id = r.id
            ORDER BY s.id DESC
        `);
        res.json(students);
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

router.post('/students', async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { username, password, firstName, lastName, email, phone, admissionNumber, roomId, price } = req.body;

        if (roomId) {
            const [roomCheck] = await connection.execute('SELECT capacity, current_occupancy FROM rooms WHERE id = ?', [roomId]);
            if (roomCheck.length > 0 && roomCheck[0].current_occupancy >= roomCheck[0].capacity) {
                return res.status(400).json({ error: 'Room is already at full capacity' });
            }
        }

        const hashedPassword = await require('bcrypt').hash(password, 10);

        const [userResult] = await connection.execute(
            'INSERT INTO users (username, password, role, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, 'student', firstName, lastName, email, phone]
        );

        const priceValue = price !== undefined && price !== null && price !== '' ? price : null;

        const [studentResult] = await connection.execute(
            'INSERT INTO students (user_id, admission_number, room_id, price) VALUES (?, ?, ?, ?)',
            [userResult.insertId, admissionNumber, roomId || null, priceValue]
        );

        if (roomId) {
            await connection.execute('UPDATE rooms SET current_occupancy = current_occupancy + 1, status = CASE WHEN current_occupancy + 1 >= capacity THEN \'full\' ELSE \'available\' END WHERE id = ?', [roomId]);
        }

        res.status(201).json({ message: 'Student added successfully', studentId: studentResult.insertId });
    } catch (error) {
        console.error('Add student error:', error);
        res.status(500).json({ error: 'Failed to add student' });
    } finally {
        connection.release();
    }
});

router.delete('/students/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
        const [student] = await connection.execute('SELECT s.user_id, s.room_id, u.image_url FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ?', [req.params.id]);
        if (student.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const roomId = student[0].room_id;
        
        if (student[0].image_url) {
            const filePath = path.join(UPLOAD_DIR, path.basename(student[0].image_url));
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        
        await connection.execute('DELETE FROM students WHERE id = ?', [req.params.id]);
        await connection.execute('DELETE FROM users WHERE id = ?', [student[0].user_id]);
        
        if (roomId) {
            await connection.execute('UPDATE rooms SET current_occupancy = current_occupancy - 1, status = CASE WHEN current_occupancy - 1 < capacity THEN \'available\' ELSE \'full\' END WHERE id = ?', [roomId]);
        }
        
        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json({ error: 'Failed to delete student' });
    } finally {
        connection.release();
    }
});

router.get('/students/:id', async (req, res) => {
    try {
        const [students] = await db.execute(`
            SELECT s.id, s.admission_number, s.price,
                   u.username, u.first_name, u.last_name, u.email, u.phone, u.image_url,
                   r.room_number, r.floor, r.capacity, r.status as room_status
            FROM students s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN rooms r ON s.room_id = r.id
            WHERE s.id = ?
        `, [req.params.id]);
        
        if (students.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        res.json(students[0]);
    } catch (error) {
        console.error('Get student error:', error);
        res.status(500).json({ error: 'Failed to fetch student' });
    }
});

// Upload student image (replaces old one)
router.post('/students/:id/image', (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message });
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image file provided' });

        const [students] = await db.execute('SELECT user_id FROM students WHERE id = ?', [req.params.id]);
        if (students.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Student not found' });
        }

        const userId = students[0].user_id;
        const [user] = await db.execute('SELECT image_url FROM users WHERE id = ?', [userId]);

        if (user[0].image_url) {
            const oldPath = path.join(UPLOAD_DIR, path.basename(user[0].image_url));
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        const imageUrl = `${req.protocol}://${req.get('host')}/users/${req.file.filename}`;
        await db.execute('UPDATE users SET image_url = ? WHERE id = ?', [imageUrl, userId]);

        res.json({ imageUrl, message: 'Image uploaded successfully' });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error('Upload image error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

router.put('/students/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { firstName, lastName, email, phone, price, roomId } = req.body;
        
        const [student] = await connection.execute('SELECT user_id, room_id FROM students WHERE id = ?', [req.params.id]);
        if (student.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const userId = student[0].user_id;
        const oldRoomId = student[0].room_id;
        
        await connection.execute(
            'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE id = ?',
            [firstName, lastName, email, phone, userId]
        );
        
        await connection.execute(
            'UPDATE students SET price = ? WHERE id = ?',
            [price !== undefined && price !== null && price !== '' ? price : null, req.params.id]
        );
        
        if (roomId !== undefined) {
            if (roomId && oldRoomId !== roomId) {
                const [targetRoom] = await connection.execute('SELECT capacity, current_occupancy FROM rooms WHERE id = ?', [roomId]);
                if (targetRoom.length > 0 && targetRoom[0].current_occupancy >= targetRoom[0].capacity) {
                    return res.status(400).json({ error: 'Target room is already at full capacity' });
                }
            }

            await connection.execute('UPDATE students SET room_id = ? WHERE id = ?', [roomId || null, req.params.id]);
            
            if (oldRoomId && oldRoomId !== roomId) {
                const [oldRoom] = await connection.execute('SELECT capacity, current_occupancy FROM rooms WHERE id = ?', [oldRoomId]);
                if (oldRoom.length > 0) {
                    const newOccupancy = oldRoom[0].current_occupancy - 1;
                    const newStatus = newOccupancy < oldRoom[0].capacity ? 'available' : 'full';
                    await connection.execute('UPDATE rooms SET current_occupancy = ?, status = ? WHERE id = ?', [newOccupancy, newStatus, oldRoomId]);
                }
            }
            
            if (roomId && oldRoomId !== roomId) {
                const [newRoom] = await connection.execute('SELECT capacity, current_occupancy FROM rooms WHERE id = ?', [roomId]);
                if (newRoom.length > 0) {
                    const newOccupancy = newRoom[0].current_occupancy + 1;
                    const newStatus = newOccupancy >= newRoom[0].capacity ? 'full' : 'available';
                    await connection.execute('UPDATE rooms SET current_occupancy = ?, status = ? WHERE id = ?', [newOccupancy, newStatus, roomId]);
                }
            }
        }
        
        res.json({ message: 'Student updated successfully' });
    } catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({ error: 'Failed to update student' });
    } finally {
        connection.release();
    }
});

// ==================== ROOMS ====================
router.get('/rooms', async (req, res) => {
    try {
        const [rooms] = await db.execute(`
            SELECT r.id, r.room_number, r.floor, r.capacity, r.current_occupancy, r.status
            FROM rooms r
            ORDER BY r.id DESC
        `);
        res.json(rooms);
    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

router.post('/rooms', async (req, res) => {
    try {
        const { roomNumber, floor, capacity, status } = req.body;
        
        await db.execute(
            'INSERT INTO rooms (room_number, floor, capacity, status) VALUES (?, ?, ?, ?)',
            [roomNumber, floor, capacity, status || 'available']
        );

        res.status(201).json({ message: 'Room added successfully' });
    } catch (error) {
        console.error('Add room error:', error);
        res.status(500).json({ error: 'Failed to add room' });
    }
});

router.delete('/rooms/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM rooms WHERE id = ?', [req.params.id]);
        res.json({ message: 'Room deleted successfully' });
    } catch (error) {
        console.error('Delete room error:', error);
        res.status(500).json({ error: 'Failed to delete room' });
    }
});

// ==================== COMPLAINTS ====================
router.get('/complaints', async (req, res) => {
    try {
        const statusFilter = req.query.status;
        let query = `
            SELECT c.id, c.category, c.description, c.status, c.resolution_notes, c.created_at,
                   u.first_name, u.last_name, u.email
            FROM complaints c
            JOIN students s ON c.student_id = s.id
            JOIN users u ON s.user_id = u.id
        `;
        let params = [];
        
        if (statusFilter) {
            query += ' WHERE c.status = ?';
            params.push(statusFilter);
        }
        
        query += ' ORDER BY c.id DESC';
        
        const [complaints] = await db.execute(query, params);
        res.json(complaints);
    } catch (error) {
        console.error('Get complaints error:', error);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

router.post('/complaints', async (req, res) => {
    try {
        const { studentId, category, description } = req.body;
        
        if (!studentId || !category || !description) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        await db.execute(
            'INSERT INTO complaints (student_id, category, description, status) VALUES (?, ?, ?, ?)',
            [studentId, category, description, 'pending']
        );
        
        res.status(201).json({ message: 'Complaint submitted successfully' });
    } catch (error) {
        console.error('Add complaint error:', error);
        res.status(500).json({ error: 'Failed to submit complaint' });
    }
});

router.get('/complaints/:id', async (req, res) => {
    try {
        const [complaints] = await db.execute(`
            SELECT c.id, c.category, c.description, c.status, c.resolution_notes, c.created_at,
                   u.first_name, u.last_name, u.email
            FROM complaints c
            JOIN students s ON c.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE c.id = ?
        `, [req.params.id]);
        
        if (complaints.length === 0) {
            return res.status(404).json({ error: 'Complaint not found' });
        }
        res.json(complaints[0]);
    } catch (error) {
        console.error('Get complaint error:', error);
        res.status(500).json({ error: 'Failed to fetch complaint' });
    }
});

router.put('/complaints/:id', async (req, res) => {
    try {
        const { status, resolutionNotes } = req.body;
        await db.execute(
            'UPDATE complaints SET status = ?, resolution_notes = ? WHERE id = ?',
            [status, resolutionNotes, req.params.id]
        );
        res.json({ message: 'Complaint updated successfully' });
    } catch (error) {
        console.error('Update complaint error:', error);
        res.status(500).json({ error: 'Failed to update complaint' });
    }
});

// ==================== NOTICES ====================
router.get('/notices', async (req, res) => {
    try {
        const [notices] = await db.execute(`
            SELECT n.id, n.title, n.content, n.priority, n.created_at,
                   u.first_name, u.last_name
            FROM notices n
            JOIN users u ON n.posted_by = u.id
            ORDER BY n.id DESC
        `);
        res.json(notices);
    } catch (error) {
        console.error('Get notices error:', error);
        res.status(500).json({ error: 'Failed to fetch notices' });
    }
});

router.post('/notices', async (req, res) => {
    try {
        const { title, content, priority } = req.body;
        const postedBy = req.user.id;
        
        await db.execute(
            'INSERT INTO notices (title, content, posted_by, priority) VALUES (?, ?, ?, ?)',
            [title, content, postedBy, priority || 'normal']
        );

        res.status(201).json({ message: 'Notice published successfully' });
    } catch (error) {
        console.error('Add notice error:', error);
        res.status(500).json({ error: 'Failed to publish notice' });
    }
});

router.delete('/notices/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM notices WHERE id = ?', [req.params.id]);
        res.json({ message: 'Notice deleted successfully' });
    } catch (error) {
        console.error('Delete notice error:', error);
        res.status(500).json({ error: 'Failed to delete notice' });
    }
});

// ==================== MY PROFILE ====================
router.get('/my-profile', async (req, res) => {
    try {
        const [students] = await db.execute(`
            SELECT s.*, u.first_name, u.last_name, u.email, u.phone, u.image_url,
                   r.room_number, r.floor
            FROM students s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN rooms r ON s.room_id = r.id
            WHERE u.id = ?
        `, [req.user.id]);
        
        if (students.length === 0) {
            return res.status(404).json({ error: 'Student profile not found' });
        }
        
        res.json(students[0]);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Get user preferences
router.get('/my-preferences', async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT preferences FROM users WHERE id = ?',
            [req.user.id]
        );
        if (users.length === 0) {
            return res.json({});
        }
        const prefs = users[0].preferences;
        res.json(typeof prefs === 'string' ? JSON.parse(prefs) : (prefs || {}));
    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

// Update user preferences
router.put('/my-preferences', async (req, res) => {
    try {
        const { preferences } = req.body;
        await db.execute(
            'UPDATE users SET preferences = ? WHERE id = ?',
            [JSON.stringify(preferences || {}), req.user.id]
        );
        res.json({ message: 'Preferences saved' });
    } catch (error) {
        console.error('Save preferences error:', error);
        res.status(500).json({ error: 'Failed to save preferences' });
    }
});

// ============================================
// Settings Change Requests Routes
// ============================================

/**
 * GET all settings change requests
 * - Admin: sees all requests
 * - Student: sees only their own requests
 */
router.get('/settings-requests', async (req, res) => {
    try {
        let query = `
            SELECT sr.*,
                   u.username as requested_by_username,
                   u.first_name as requested_by_firstname,
                   u.last_name as requested_by_lastname,
                   reviewer.username as reviewed_by_username,
                   reviewer.first_name as reviewed_by_firstname,
                   reviewer.last_name as reviewed_by_lastname
            FROM settings_change_requests sr
            JOIN users u ON sr.user_id = u.id
            LEFT JOIN users reviewer ON sr.reviewed_by = reviewer.id
        `;
        let params = [];
        let whereClause = '';
        
        // If user is student, only show their own requests
        if (req.user.role === 'student') {
            whereClause = ' WHERE sr.user_id = ?';
            params.push(req.user.id);
        }
        
        // Add status filter if provided
        const statusFilter = req.query.status;
        if (statusFilter) {
            whereClause += whereClause ? ' AND sr.status = ?' : ' WHERE sr.status = ?';
            params.push(statusFilter);
        }
        
        query += whereClause + ' ORDER BY sr.created_at DESC';
        
        const [requests] = await db.execute(query, params);
        res.json(requests);
    } catch (error) {
        console.error('Get settings requests error:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

/**
 * GET user's own settings change requests
 */
router.get('/my-settings-requests', async (req, res) => {
    try {
        const [requests] = await db.execute(
            `SELECT sr.*, 
                    u.username as requested_by_username,
                    u.first_name as requested_by_firstname,
                    u.last_name as requested_by_lastname
             FROM settings_change_requests sr
             JOIN users u ON sr.user_id = u.id
             WHERE sr.user_id = ?
             ORDER BY sr.created_at DESC`,
            [req.user.id]
        );
        res.json(requests);
    } catch (error) {
        console.error('Get my settings requests error:', error);
        res.status(500).json({ error: 'Failed to fetch your requests' });
    }
});

/**
 * POST new settings change request
 * Any authenticated user can submit a request
 */
router.post('/settings-requests', async (req, res) => {
    try {
        const { settingType, oldValue, newValue, reason } = req.body;
        
        if (!settingType || !newValue) {
            return res.status(400).json({ error: 'Setting type and new value are required' });
        }
        
        // Username changes are not allowed via this endpoint (handled directly by admin or blocked)
        if (settingType === 'username') {
            return res.status(403).json({ error: 'Username changes are not permitted' });
        }
        
        // Validate setting type
        const validTypes = ['password', 'theme'];
        if (!validTypes.includes(settingType)) {
            return res.status(400).json({ error: 'Invalid setting type' });
        }
        
        // Check if user already has a pending request for this setting
        const [existing] = await db.execute(
            'SELECT id FROM settings_change_requests WHERE user_id = ? AND setting_type = ? AND status = ?',
            [req.user.id, settingType, 'pending']
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ 
                error: 'You already have a pending request for this setting. Please wait for admin review.' 
            });
        }
        
        await db.execute(
            `INSERT INTO settings_change_requests 
                (user_id, setting_type, old_value, new_value, reason, status, created_at) 
             VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
            [req.user.id, settingType, oldValue, newValue, reason || null]
        );
        
        res.status(201).json({ message: 'Settings change request submitted successfully' });
    } catch (error) {
        console.error('Create settings request error:', error);
        res.status(500).json({ error: 'Failed to submit request' });
    }
});

/**
 * PUT update settings request status (approve/reject)
 * Admin only
 */
router.put('/settings-requests/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { status, reviewNotes } = req.body;
        const requestId = req.params.id;
        
        // Only admin can approve/reject
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        // Get the request with user info
        const [requests] = await connection.execute(
            `SELECT sr.*, u.username 
             FROM settings_change_requests sr
             JOIN users u ON sr.user_id = u.id
             WHERE sr.id = ?`,
            [requestId]
        );
        
        if (requests.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        const request = requests[0];
        
        if (request.status !== 'pending') {
            return res.status(400).json({ error: 'Request has already been processed' });
        }
        
        await connection.beginTransaction();
        
        // Update request status
        await connection.execute(
            `UPDATE settings_change_requests 
             SET status = ?, reviewed_by = ?, review_notes = ?, updated_at = NOW() 
             WHERE id = ?`,
            [status, req.user.id, reviewNotes || null, requestId]
        );
        
        // If approved, apply the change
        if (status === 'approved') {
            const { setting_type, new_value } = request;
            
            if (setting_type === 'password') {
                const bcrypt = require('bcrypt');
                const hashedPassword = await bcrypt.hash(new_value, 10);
                await connection.execute(
                    'UPDATE users SET password = ? WHERE id = ?',
                    [hashedPassword, request.user_id]
                );
            } else if (setting_type === 'theme') {
                // Upsert theme preference into user_settings
                await connection.execute(
                    `INSERT INTO user_settings (user_id, theme) VALUES (?, ?)
                     ON DUPLICATE KEY UPDATE theme = ?`,
                    [request.user_id, new_value, new_value]
                );
            }
        }
        
        await connection.commit();
        res.json({ 
            message: `Request ${status} successfully`,
            approvalStatus: status
        });
    } catch (error) {
        await connection.rollback();
        console.error('Update settings request error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    } finally {
        connection.release();
    }
});

// Get notifications for admin
router.get('/notifications', async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user.id;
        const notifications = [];
        
        if (role === 'admin') {
            // Get pending complaints
            const [complaints] = await db.execute(`
                SELECT c.id, c.category, c.description, c.status, c.created_at,
                       u.first_name, u.last_name
                FROM complaints c
                JOIN students s ON c.student_id = s.id
                JOIN users u ON s.user_id = u.id
                WHERE c.status IN ('pending', 'in_progress')
                ORDER BY c.created_at DESC
                LIMIT 10
            `);
            
            complaints.forEach(c => {
                notifications.push({
                    id: `complaint_${c.id}`,
                    type: 'complaint',
                    title: c.status === 'pending' ? 'New Complaint' : 'Complaint Update',
                    message: `${c.first_name} ${c.last_name} - ${c.category}`,
                    refId: c.id,
                    timestamp: c.created_at,
                    status: c.status
                });
            });
            
            // Get pending room change requests
            const [requests] = await db.execute(`
                SELECT id, setting_type, old_value, new_value, status, created_at
                FROM settings_change_requests
                WHERE status = 'pending'
                ORDER BY created_at DESC
                LIMIT 10
            `);
            
            requests.forEach(r => {
                notifications.push({
                    id: `request_${r.id}`,
                    type: 'request',
                    title: 'Setting Change Request',
                    message: `${r.setting_type}: ${r.old_value} → ${r.new_value}`,
                    refId: r.id,
                    timestamp: r.created_at,
                    status: r.status
                });
            });

            // Get recent completed payments
            const [payments] = await db.execute(`
                SELECT p.id, p.amount, p.paid_month, p.paid_at,
                       u.first_name, u.last_name, u.username
                FROM payments p
                JOIN students s ON p.student_id = s.id
                JOIN users u ON s.user_id = u.id
                WHERE p.status = 'completed' AND p.paid_at >= NOW() - INTERVAL 24 HOUR
                ORDER BY p.paid_at DESC
                LIMIT 10
            `);

            payments.forEach(p => {
                notifications.push({
                    id: `payment_${p.id}`,
                    type: 'payment',
                    title: 'Payment Received',
                    message: `${p.first_name} ${p.last_name} paid $${parseFloat(p.amount).toFixed(2)} for ${p.paid_month}`,
                    refId: p.id,
                    timestamp: p.paid_at,
                    status: 'completed'
                });
            });
        } else if (role === 'student') {
            // Get complaints for this student
            const [complaints] = await db.execute(`
                SELECT id, category, description, status, created_at
                FROM complaints
                WHERE student_id = (SELECT id FROM students WHERE user_id = ?)
                ORDER BY created_at DESC
                LIMIT 10
            `, [userId]);
            
            complaints.forEach(c => {
                notifications.push({
                    id: `complaint_${c.id}`,
                    type: 'complaint',
                    title: c.status === 'resolved' ? 'Complaint Resolved' : 'Complaint Update',
                    message: `Your ${c.category} complaint has been ${c.status}`,
                    refId: c.id,
                    timestamp: c.created_at,
                    status: c.status
                });
            });
            
            // Get notices
            const [notices] = await db.execute(`
                SELECT id, title, content, created_at
                FROM notices
                ORDER BY created_at DESC
            `);
            
            notices.forEach(n => {
                notifications.push({
                    id: `notice_${n.id}`,
                    type: 'notice',
                    title: n.title,
                    message: n.content.substring(0, 50) + (n.content.length > 50 ? '...' : ''),
                    refId: n.id,
                    timestamp: n.created_at,
                    status: 'active'
                });
            });
        }
        
        // Sort by timestamp descending
        notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json(notifications);
    } catch (error) {
        console.error('Notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

module.exports = router;
