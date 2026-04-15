const express = require('express');
const router = express.Router();
const db = require('../config/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'Team_LMX_HMS_2026';

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
            SELECT s.id, s.admission_number,
                   u.username, u.first_name, u.last_name, u.email, u.phone,
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
        const { username, password, firstName, lastName, email, phone, admissionNumber, roomId } = req.body;

        const hashedPassword = await require('bcrypt').hash(password, 10);

        const [userResult] = await connection.execute(
            'INSERT INTO users (username, password, role, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, 'student', firstName, lastName, email, phone]
        );

        await connection.execute(
            'INSERT INTO students (user_id, admission_number, room_id) VALUES (?, ?, ?)',
            [userResult.insertId, admissionNumber, roomId || null]
        );

        if (roomId) {
            await connection.execute('UPDATE rooms SET current_occupancy = current_occupancy + 1, status = CASE WHEN current_occupancy + 1 >= capacity THEN \'full\' ELSE \'available\' END WHERE id = ?', [roomId]);
        }

        res.status(201).json({ message: 'Student added successfully' });
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
        const [student] = await connection.execute('SELECT user_id, room_id FROM students WHERE id = ?', [req.params.id]);
        if (student.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const roomId = student[0].room_id;
        
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
            SELECT s.id, s.admission_number,
                   u.username, u.first_name, u.last_name, u.email, u.phone,
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

router.put('/students/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { firstName, lastName, phone, roomId, status } = req.body;
        
        const [student] = await connection.execute('SELECT user_id, room_id FROM students WHERE id = ?', [req.params.id]);
        if (student.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const userId = student[0].user_id;
        const oldRoomId = student[0].room_id;
        
        await connection.execute(
            'UPDATE users SET first_name = ?, last_name = ?, phone = ? WHERE id = ?',
            [firstName, lastName, phone, userId]
        );
        
        if (roomId !== undefined) {
            await connection.execute('UPDATE students SET room_id = ? WHERE id = ?', [roomId || null, req.params.id]);
            
            if (oldRoomId && oldRoomId !== roomId) {
                const [oldRoom] = await connection.execute('SELECT capacity, current_occupancy FROM rooms WHERE id = ?', [oldRoomId]);
                if (oldRoom.length > 0) {
                    const newOccupancy = oldRoom[0].current_occupancy - 1;
                    const newStatus = newOccupancy < oldRoom[0].capacity ? 'available' : 'full';
                    await connection.execute('UPDATE rooms SET current_occupancy = ?, status = ? WHERE id = ?', [newOccupancy, newStatus, oldRoomId]);
                }
            }
            
            if (roomId) {
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

router.get('/complaints', async (req, res) => {
    try {
        const [complaints] = await db.execute(`
            SELECT c.id, c.category, c.description, c.status, c.resolution_notes, c.created_at,
                   u.first_name, u.last_name, u.email
            FROM complaints c
            JOIN students s ON c.student_id = s.id
            JOIN users u ON s.user_id = u.id
            ORDER BY c.id DESC
        `);
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

router.get('/my-profile', async (req, res) => {
    try {
        const [students] = await db.execute(`
            SELECT s.*, u.first_name, u.last_name, u.email, u.phone,
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

module.exports = router;
