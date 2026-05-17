const express = require('express');
const router = express.Router();
const db = require('../config/database');
const crypto = require('crypto');
const https = require('https');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

if (!process.env.ESEWA_SECRET_KEY) {
    console.error('FATAL: ESEWA_SECRET_KEY environment variable is not set. Check your .env file.');
    process.exit(1);
}

const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY;
const ESEWA_SANDBOX_BASE = 'https://rc-epay.esewa.com.np';
const FRONTEND_BASE_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5500/frontend';
const BACKEND_PORT = process.env.PORT || 3000;
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || `http://127.0.0.1:${BACKEND_PORT}`;

// Auto-create payments table if not exists
(async () => {
    try {
        await db.execute(`
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
            )
        `);
        console.log('Payments table ready');
    } catch (err) {
        console.error('Failed to create payments table:', err.message);
    }
})();

function generateSignature(totalAmount, transactionUuid, productCode) {
    const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
    return crypto.createHmac('sha256', ESEWA_SECRET_KEY)
        .update(message)
        .digest('base64');
}

function verifySignature(data, signature) {
    if (!data.signed_field_names) return false;
    const fields = data.signed_field_names.split(',');
    const message = fields.map(f => `${f}=${data[f]}`).join(',');
    const expected = crypto.createHmac('sha256', ESEWA_SECRET_KEY)
        .update(message)
        .digest('base64');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

// Success callback from eSewa (no auth — eSewa redirects here)
router.get('/success', async (req, res) => {
    try {
        const { data } = req.query;
        if (!data) {
            return res.redirect(`${FRONTEND_BASE_URL}/dashboard_user.html?payment=failed&reason=no_data`);
        }

        const decoded = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));

        if (!verifySignature(decoded, decoded.signature)) {
            console.error('eSewa callback signature verification failed');
            return res.redirect(`${FRONTEND_BASE_URL}/dashboard_user.html?payment=failed&reason=invalid_signature`);
        }

        const payStatus = await checkEsewaTransactionStatus(
            decoded.product_code,
            decoded.total_amount,
            decoded.transaction_uuid
        );

        const [payments] = await db.execute(
            'SELECT * FROM payments WHERE transaction_id = ?',
            [decoded.transaction_uuid]
        );

        if (payments.length === 0) {
            return res.redirect(`${FRONTEND_BASE_URL}/dashboard_user.html?payment=failed&reason=not_found`);
        }

        const payment = payments[0];

        if (payment.status === 'completed') {
            return res.redirect(`${FRONTEND_BASE_URL}/dashboard_user.html?payment=success&transaction_uuid=${decoded.transaction_uuid}&refId=${decoded.transaction_code || ''}`);
        }

        if (payStatus === 'COMPLETE' || payStatus === 'complete') {
            await db.execute(
                "UPDATE payments SET status = 'completed', transaction_id = ?, paid_at = NOW() WHERE id = ?",
                [decoded.transaction_code || decoded.transaction_uuid, payment.id]
            );
            return res.redirect(`${FRONTEND_BASE_URL}/dashboard_user.html?payment=success&transaction_uuid=${decoded.transaction_uuid}&refId=${decoded.transaction_code || ''}`);
        } else {
            await db.execute(
                "UPDATE payments SET status = 'failed' WHERE id = ?",
                [payment.id]
            );
            return res.redirect(`${FRONTEND_BASE_URL}/dashboard_user.html?payment=failed&reason=status_${payStatus}`);
        }
    } catch (error) {
        console.error('eSewa success callback error:', error);
        return res.redirect(`${FRONTEND_BASE_URL}/dashboard_user.html?payment=failed&reason=server_error`);
    }
});

// Failure callback from eSewa
router.get('/failure', async (req, res) => {
    const { pid } = req.query;
    if (pid) {
        try {
            await db.execute(
                "UPDATE payments SET status = 'failed' WHERE transaction_id = ? AND status = 'pending'",
                [pid]
            );
        } catch (e) {
            console.error('Failed to mark payment as failed:', e);
        }
    }
    return res.redirect(`${FRONTEND_BASE_URL}/dashboard_user.html?payment=failed&reason=cancelled`);
});

// All other routes require auth
router.use(authenticateToken);

// Initiate eSewa v2 payment
router.post('/initiate', async (req, res) => {
    try {
        const { studentId, amount, month } = req.body;

        if (!studentId || !amount || !month) {
            return res.status(400).json({ error: 'studentId, amount, and month are required' });
        }

        if (req.user.role === 'admin') {
            return res.status(403).json({ error: 'Only students can make payments' });
        }

        const [students] = await db.execute(
            'SELECT id FROM students WHERE id = ? AND user_id = ?',
            [studentId, req.user.id]
        );
        if (students.length === 0) {
            return res.status(404).json({ error: 'Student record not found' });
        }

        const [existing] = await db.execute(
            "SELECT id, status FROM payments WHERE student_id = ? AND paid_month = ?",
            [studentId, month]
        );
        const alreadyCompleted = existing.find(p => p.status === 'completed');
        if (alreadyCompleted) {
            return res.status(400).json({ error: 'Payment already completed for this month' });
        }

        // Cancel any stale pending payments for same month so user can retry
        await db.execute(
            "UPDATE payments SET status = 'failed' WHERE student_id = ? AND paid_month = ? AND status = 'pending'",
            [studentId, month]
        );

        const transactionUuid = `PAY-${studentId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const totalAmount = parseFloat(amount).toFixed(2);
        const signature = generateSignature(totalAmount, transactionUuid, ESEWA_MERCHANT_CODE);

        const [result] = await db.execute(
            'INSERT INTO payments (student_id, amount, payment_method, status, paid_month, transaction_id) VALUES (?, ?, ?, ?, ?, ?)',
            [studentId, amount, 'esewa', 'pending', month, transactionUuid]
        );

        res.json({
            paymentId: result.insertId,
            transactionUuid,
            esewaUrl: `${ESEWA_SANDBOX_BASE}/api/epay/main/v2/form`,
            params: {
                amount: totalAmount,
                tax_amount: '0',
                total_amount: totalAmount,
                transaction_uuid: transactionUuid,
                product_code: ESEWA_MERCHANT_CODE,
                product_service_charge: '0',
                product_delivery_charge: '0',
                success_url: `${BACKEND_BASE_URL}/api/payment/success`,
                failure_url: `${BACKEND_BASE_URL}/api/payment/failure`,
                signed_field_names: 'total_amount,transaction_uuid,product_code',
                signature: signature
            }
        });
    } catch (error) {
        console.error('Payment initiate error:', error);
        res.status(500).json({ error: 'Failed to initiate payment' });
    }
});

// Verify eSewa v2 payment (called from frontend after redirect)
router.post('/verify', async (req, res) => {
    try {
        const { transactionUuid, refId } = req.body;

        if (!transactionUuid) {
            return res.status(400).json({ error: 'transactionUuid is required' });
        }

        const [payments] = await db.execute(
            'SELECT * FROM payments WHERE transaction_id = ?',
            [transactionUuid]
        );
        if (payments.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const payment = payments[0];

        const [students] = await db.execute(
            'SELECT id FROM students WHERE id = ? AND user_id = ?',
            [payment.student_id, req.user.id]
        );
        if (students.length === 0 && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (payment.status === 'completed') {
            return res.json({
                message: 'Payment already verified',
                payment: {
                    id: payment.id,
                    amount: payment.amount,
                    month: payment.paid_month,
                    status: 'completed',
                    transactionRef: payment.transaction_id,
                    paidAt: payment.paid_at
                }
            });
        }

        const status = await checkEsewaTransactionStatus(
            ESEWA_MERCHANT_CODE,
            parseFloat(payment.amount).toFixed(2),
            transactionUuid
        );

        if (status !== 'COMPLETE' && status !== 'complete') {
            await db.execute(
                "UPDATE payments SET status = 'failed' WHERE id = ?",
                [payment.id]
            );
            return res.status(400).json({ error: `Payment not completed on eSewa (status: ${status})` });
        }

        await db.execute(
            'UPDATE payments SET status = ?, transaction_id = COALESCE(?, transaction_id), paid_at = NOW() WHERE id = ?',
            ['completed', refId || transactionUuid, payment.id]
        );

        res.json({
            message: 'Payment verified successfully',
            payment: {
                id: payment.id,
                amount: payment.amount,
                month: payment.paid_month,
                status: 'completed',
                transactionRef: refId || transactionUuid,
                paidAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Payment verify error:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

// Cancel pending payments for a student+month (so they can retry)
router.post('/cancel-pending', async (req, res) => {
    try {
        const { studentId, month } = req.body;

        if (req.user.role === 'admin') {
            return res.status(403).json({ error: 'Only students can cancel their payments' });
        }

        if (!studentId || !month) {
            return res.status(400).json({ error: 'studentId and month are required' });
        }

        const [students] = await db.execute(
            'SELECT id FROM students WHERE id = ? AND user_id = ?',
            [studentId, req.user.id]
        );
        if (students.length === 0) {
            return res.status(404).json({ error: 'Student record not found' });
        }

        const [result] = await db.execute(
            "UPDATE payments SET status = 'failed' WHERE student_id = ? AND paid_month = ? AND status = 'pending'",
            [studentId, month]
        );

        res.json({ message: 'Cancelled', cancelled: result.affectedRows });
    } catch (error) {
        console.error('Cancel pending error:', error);
        res.status(500).json({ error: 'Failed to cancel pending payment' });
    }
});

// Simulate payment completion (for testing, admin only, bypasses eSewa)
router.post('/simulate', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { studentId, month } = req.body;

        if (!studentId || !month) {
            return res.status(400).json({ error: 'studentId and month are required' });
        }

        // Mark all pending payments for this month as completed
        const [result] = await db.execute(
            "UPDATE payments SET status = 'completed', transaction_id = CONCAT('sim-', UNIX_TIMESTAMP()), paid_at = NOW() WHERE student_id = ? AND paid_month = ? AND status = 'pending'",
            [studentId, month]
        );

        // If no pending payment existed, create a completed one
        if (result.affectedRows === 0) {
            await db.execute(
                "INSERT INTO payments (student_id, amount, payment_method, status, paid_month, transaction_id, paid_at) SELECT ?, COALESCE(price, 0), 'test', 'completed', ?, CONCAT('sim-', UNIX_TIMESTAMP()), NOW() FROM students WHERE id = ?",
                [studentId, month, studentId]
            );
        }

        res.json({ message: 'Payment simulated successfully' });
    } catch (error) {
        console.error('Simulate payment error:', error);
        res.status(500).json({ error: 'Failed to simulate payment' });
    }
});

// Mark payment as completed manually (admin only, for testing)
router.post('/mark-completed', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { paymentId, transactionRef } = req.body;
        if (!paymentId) {
            return res.status(400).json({ error: 'paymentId is required' });
        }

        const [payments] = await db.execute('SELECT * FROM payments WHERE id = ?', [paymentId]);
        if (payments.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        await db.execute(
            'UPDATE payments SET status = ?, transaction_id = COALESCE(?, transaction_id), paid_at = NOW() WHERE id = ?',
            ['completed', transactionRef || null, paymentId]
        );

        res.json({ message: 'Payment marked as completed' });
    } catch (error) {
        console.error('Mark completed error:', error);
        res.status(500).json({ error: 'Failed to update payment' });
    }
});

// Get payment history
router.get('/history', async (req, res) => {
    try {
        let query, params;

        if (req.user.role === 'admin') {
            query = `
                SELECT p.id, p.amount, p.payment_method, p.transaction_id, p.status, p.paid_month, p.paid_at,
                       s.id as student_id, u.first_name, u.last_name, u.username, u.email,
                       r.room_number
                FROM payments p
                JOIN students s ON p.student_id = s.id
                JOIN users u ON s.user_id = u.id
                LEFT JOIN rooms r ON s.room_id = r.id
                ORDER BY p.paid_at DESC
            `;
            params = [];
        } else {
            query = `
                SELECT p.id, p.amount, p.payment_method, p.transaction_id, p.status, p.paid_month, p.paid_at
                FROM payments p
                JOIN students s ON p.student_id = s.id
                WHERE s.user_id = ?
                ORDER BY p.paid_at DESC
            `;
            params = [req.user.id];
        }

        const [payments] = await db.execute(query, params);
        res.json(payments);
    } catch (error) {
        console.error('Payment history error:', error);
        res.status(500).json({ error: 'Failed to fetch payment history' });
    }
});

// Get current month payment status for logged-in student
router.get('/my-status', async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            return res.status(403).json({ error: 'Only for students' });
        }

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const [students] = await db.execute(
            'SELECT s.id, s.price FROM students s WHERE s.user_id = ?',
            [req.user.id]
        );
        if (students.length === 0) {
            return res.json({ status: 'no_record', amount: 0, month: currentMonth });
        }

        const student = students[0];

        const [payments] = await db.execute(
            "SELECT id, status, amount, paid_at FROM payments WHERE student_id = ? AND paid_month = ? ORDER BY paid_at DESC LIMIT 1",
            [student.id, currentMonth]
        );

        const [completedPayments] = await db.execute(
            "SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payments WHERE student_id = ? AND status = 'completed'",
            [student.id]
        );

        if (payments.length > 0 && payments[0].status === 'completed') {
            res.json({
                status: 'paid',
                amount: student.price,
                month: currentMonth,
                paidAmount: payments[0].amount,
                paidAt: payments[0].paid_at,
                paymentId: payments[0].id,
                totalPayments: completedPayments[0].count,
                totalAmount: completedPayments[0].total
            });
        } else if (payments.length > 0 && payments[0].status === 'pending') {
            res.json({
                status: 'pending',
                amount: student.price,
                month: currentMonth,
                paymentId: payments[0].id,
                totalPayments: completedPayments[0].count,
                totalAmount: completedPayments[0].total
            });
        } else {
            res.json({
                status: 'due',
                amount: student.price,
                month: currentMonth,
                totalPayments: completedPayments[0].count,
                totalAmount: completedPayments[0].total
            });
        }
    } catch (error) {
        console.error('Payment status error:', error);
        res.status(500).json({ error: 'Failed to fetch payment status' });
    }
});

// Get payment stats for admin dashboard
router.get('/stats', async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const [[monthlyRevenue]] = await db.execute(
            "SELECT COALESCE(SUM(amount), 0) as revenue FROM payments WHERE paid_month = ? AND status = 'completed'",
            [currentMonth]
        );

        const [[totalRevenue]] = await db.execute(
            "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'"
        );

        const [[paymentCounts]] = await db.execute(
            "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending FROM payments"
        );

        const [[paidStudents]] = await db.execute(
            "SELECT COUNT(DISTINCT student_id) as count FROM payments WHERE paid_month = ? AND status = 'completed'",
            [currentMonth]
        );

        res.json({
            monthlyRevenue: monthlyRevenue.revenue,
            totalRevenue: totalRevenue.total,
            totalPayments: paymentCounts.total || 0,
            completedPayments: paymentCounts.completed || 0,
            pendingPayments: paymentCounts.pending || 0,
            paidStudentsThisMonth: paidStudents.count
        });
    } catch (error) {
        console.error('Payment stats error:', error);
        res.status(500).json({ error: 'Failed to fetch payment stats' });
    }
});

async function checkEsewaTransactionStatus(productCode, totalAmount, transactionUuid) {
    return new Promise((resolve) => {
        const path = `/api/epay/transaction/status/?product_code=${encodeURIComponent(productCode)}&total_amount=${encodeURIComponent(totalAmount)}&transaction_uuid=${encodeURIComponent(transactionUuid)}`;

        const options = {
            hostname: 'rc-epay.esewa.com.np',
            path: path,
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed.status || 'UNKNOWN');
                } catch (e) {
                    resolve(body);
                }
            });
        });

        req.on('error', (err) => {
            console.error('eSewa status check error:', err.message);
            resolve('ERROR');
        });

        req.end();
    });
}

module.exports = router;
