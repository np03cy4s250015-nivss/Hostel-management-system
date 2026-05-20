-- ============================================
-- Hostel Management System — Demo / Sample Data
-- ============================================
-- PURPOSE
--   Populates the Charts sidebar and the main Analytics page with
--   realistic-looking monthly data that goes up and down — not
--   a perfect linear ramp.
--
-- VERSION 4  (May 2026) — ups and downs
--
-- STUDENT JOIN PATTERN  (staggered + gaps)
--   Oct 2025  Priya  joins      →  1 total
--   Nov 2025  Raj    joins      →  2 total
--   Dec 2025  Maya   joins      →  3 total
--   Jan 2026  Sita   joins      →  4 total
--               Feb 2026  nobody joins   →  4 total
--   Mar 2026  Vikram joins      →  5 total
--   Apr 2026  Anita  joins      →  6 total
--   May 2026  Rohan  joins      →  7 total
--
-- PAYMENT RULE (each enrolled student = $150 that month)
--   completed = that month's invoice was paid by the student
--   pending   = still unpaid
--
-- BEHAVIOUR — students pay sporadically, some months they skip payment:
--
-- Reviewed this month: which status does the student's invoice get?
-- The "payer" flips randomly so both lines move:
--
--   received (completed):     $150 $300 $300 $300 $450 $300 $450 $600
--   due     (pending):          $0  $30 $270 $540 $450 $750 $750
--   └─ ups and downs on both lines

USE hostel_management;

-- ─── 1. CLEAN UP old demo rows ─────────────────────────────────────────────

DELETE p FROM payments   p
JOIN students s ON p.student_id  = s.id
JOIN users    u ON s.user_id     = u.id
WHERE u.username LIKE 'demo_%';

DELETE s FROM students   s
JOIN users    u ON s.user_id  = u.id
WHERE u.username LIKE 'demo_%';

DELETE FROM users    WHERE username LIKE 'demo_%';
DELETE FROM notices  WHERE id       > 3;
DELETE FROM rooms    WHERE room_number IN ('101','102','103','104');

-- ─── 2. DEMO USERS  (password: password123) ────────────────────────────────

INSERT INTO users (username, password, role, first_name, last_name, email, phone) VALUES
  ('demo_priya',  '$2b$10$GXabyGPbCPh23f93QEInM.L0NKCZGp4cbh.680bm3nyDGA2MjYNoy', 'student', 'Priya',  'Sharma',  'priya@demo.hms',  '9001110001'),
  ('demo_raj',    '$2b$10$GXabyGPbCPh23f93QEInM.L0NKCZGp4cbh.680bm3nyDGA2MjYNoy', 'student', 'Raj',    'Verma',   'raj@demo.hms',    '9001110002'),
  ('demo_sita',   '$2b$10$GXabyGPbCPh23f93QEInM.L0NKCZGp4cbh.680bm3nyDGA2MjYNoy', 'student', 'Sita',   'Thapa',   'sita@demo.hms',   '9001110003'),
  ('demo_arjun',  '$2b$10$GXabyGPbCPh23f93QEInM.L0NKCZGp4cbh.680bm3nyDGA2MjYNoy', 'student', 'Arjun',  'Khadka',  'arjun@demo.hms',  '9001110004'),
  ('demo_maya',   '$2b$10$GXabyGPbCPh23f93QEInM.L0NKCZGp4cbh.680bm3nyDGA2MjYNoy', 'student', 'Maya',   'Gurung',  'maya@demo.hms',   '9001110005'),
  ('demo_vikram', '$2b$10$GXabyGPbCPh23f93QEInM.L0NKCZGp4cbh.680bm3nyDGA2MjYNoy', 'student', 'Vikram', 'Shrestha','vikram@demo.hms', '9001110006'),
  ('demo_anita',  '$2b$10$GXabyGPbCPh23f93QEInM.L0NKCZGp4cbh.680bm3nyDGA2MjYNoy', 'student', 'Anita',  'Lama',    'anita@demo.hms',  '9001110007'),
  ('demo_rohan',  '$2b$10$GXabyGPbCPh23f93QEInM.L0NKCZGp4cbh.680bm3nyDGA2MjYNoy', 'student', 'Rohan',  'Joshi',   'rohan@demo.hms',  '9001110008');

-- ─── 3. DEMO ROOMS  (Floor 1) ────────────────────────────────────────────

INSERT INTO rooms (room_number, floor, capacity, current_occupancy, status) VALUES
  ('101', 1, 2, 0, 'available'),
  ('102', 1, 2, 0, 'available'),
  ('103', 1, 2, 0, 'available'),
  ('104', 1, 2, 0, 'available');

-- ─── 4. DEMO STUDENTS ────────────────────────────────────────────────────

INSERT INTO students (user_id, room_id, admission_number, price, joined_at)
SELECT
    uid  AS user_id,
    rid  AS room_id,
    CONCAT('DM', LPAD(uid, 4, '0'), '2025') AS admission_number,
    150.00                                  AS price,
    joined_at
FROM (
  SELECT id AS uid, '2025-10-15' AS joined_at, NULL AS rid FROM users WHERE username = 'demo_priya'
  UNION ALL
  SELECT id,             '2025-11-10',          NULL        FROM users WHERE username = 'demo_raj'
  UNION ALL
  SELECT id,             '2026-01-08',          NULL        FROM users WHERE username = 'demo_sita'
  UNION ALL
  SELECT id,             '2026-02-20',          NULL        FROM users WHERE username = 'demo_arjun'
  UNION ALL
  SELECT id,             '2025-12-03',          NULL        FROM users WHERE username = 'demo_maya'
  UNION ALL
  SELECT id,             '2026-03-15',          NULL        FROM users WHERE username = 'demo_vikram'
  UNION ALL
  SELECT id,             '2026-04-22',          NULL        FROM users WHERE username = 'demo_anita'
  UNION ALL
  SELECT id,             '2026-05-01',          NULL        FROM users WHERE username = 'demo_rohan'
) AS t;

-- ─── 5. ASSIGN ROOMS ───────────────────────────────────────────────────────

UPDATE students SET room_id = (SELECT id FROM rooms WHERE room_number = '101')
WHERE user_id IN (SELECT id FROM users WHERE username IN ('demo_priya','demo_raj'));
UPDATE rooms SET current_occupancy = 2, status = 'full' WHERE room_number = '101';

UPDATE students SET room_id = (SELECT id FROM rooms WHERE room_number = '102')
WHERE user_id IN (SELECT id FROM users WHERE username IN ('demo_sita','demo_arjun'));
UPDATE rooms SET current_occupancy = 2, status = 'full' WHERE room_number = '102';

UPDATE students SET room_id = (SELECT id FROM rooms WHERE room_number = '103')
WHERE user_id IN (SELECT id FROM users WHERE username IN ('demo_maya','demo_vikram'));
UPDATE rooms SET current_occupancy = 2, status = 'full' WHERE room_number = '103';

UPDATE students SET room_id = (SELECT id FROM rooms WHERE room_number = '104')
WHERE user_id IN (SELECT id FROM users WHERE username IN ('demo_anita','demo_rohan'));
UPDATE rooms SET current_occupancy = 2, status = 'full' WHERE room_number = '104';

-- ─── 6. PAYMENT SCHEDULE  — TWO payable rows per student per calendar month
--
-- First INSERT: one `completed` row for every (student, month) where the
--   student was enrolled in that calendar month.  This creates the
--   "Received" line — intentionally heterogeneous:
--     Oct 2025  only 1 student enrolled  → paid $150
--     Nov 2025  2 students enrolled     → paid $600  (both pay)
--     Dec 2025  3 students enrolled     → paid $450  (only 3 pay!)
--     Jan 2026  4 students enrolled     → paid $600  (4 payers)
--     Feb 2026  4 students enrolled     → paid $300  (only 2 pay)
--     Mar 2026  5 students enrolled     → paid $900  (6 payers)
--     Apr 2026  6 students enrolled     → paid $450  (only 3 pay)
--     May 2026  7 students enrolled     → paid $750  (5 payers)
--
-- Then UPDATE each completed row to "pending" for the months that student DIDNT
-- pay.  undone  Row by which student decision is: made the status flipped to
-- pending for the months they skipped — only the "skipped" ones, not all.

DROP TEMPORARY TABLE IF EXISTS month_schedule;
CREATE TEMPORARY TABLE month_schedule (ym VARCHAR(7) NOT NULL);
INSERT INTO month_schedule VALUES
    ('2025-10'),('2025-11'),('2025-12'),
    ('2026-01'),('2026-02'),('2026-03'),
    ('2026-04'),('2026-05');

-- ── Step A: one row per (student, month) — defaults to 'completed'
INSERT INTO payments (student_id, amount, payment_method, transaction_id, status, paid_month)
SELECT
    s.id,
    150.00,
    'esewa',
    CONCAT('ESW-DEMO-', s.id, '-', ms.ym),
    'completed',
    ms.ym
FROM month_schedule ms
JOIN students s
    ON DATE_FORMAT(s.joined_at, '%Y-%m') <= ms.ym
   AND s.user_id IN (SELECT id FROM users WHERE username LIKE 'demo_%');

-- ── Step B: flip specific rows to 'pending' to create ups & downs
--  Selected (student_id, paid_month) keys — IDs come from students table,
--  not users, so the JOIN hits payments.student_id correctly.

UPDATE payments p
JOIN (
    SELECT s.id AS sid, '2025-12' AS ym FROM students s JOIN users u ON s.user_id=u.id WHERE u.username='demo_priya'   UNION ALL
    SELECT s.id,             '2025-12'       FROM students s JOIN users u ON s.user_id=u.id WHERE u.username='demo_raj'     UNION ALL
    SELECT s.id,             '2026-02'       FROM students s JOIN users u ON s.user_id=u.id WHERE u.username='demo_priya'   UNION ALL
    SELECT s.id,             '2026-02'       FROM students s JOIN users u ON s.user_id=u.id WHERE u.username='demo_sita'    UNION ALL
    SELECT s.id,             '2026-04'       FROM students s JOIN users u ON s.user_id=u.id WHERE u.username='demo_priya'   UNION ALL
    SELECT s.id,             '2026-04'       FROM students s JOIN users u ON s.user_id=u.id WHERE u.username='demo_raj'     UNION ALL
    SELECT s.id,             '2026-04'       FROM students s JOIN users u ON s.user_id=u.id WHERE u.username='demo_maya'    UNION ALL
    SELECT s.id,             '2026-04'       FROM students s JOIN users u ON s.user_id=u.id WHERE u.username='demo_sita'    UNION ALL
    SELECT s.id,             '2026-05'       FROM students s JOIN users u ON s.user_id=u.id WHERE u.username='demo_raj'     UNION ALL
    SELECT s.id,             '2026-05'       FROM students s JOIN users u ON s.user_id=u.id WHERE u.username='demo_sita'    UNION ALL
    SELECT s.id,             '2026-05'       FROM students s JOIN users u ON s.user_id=u.id WHERE u.username='demo_arjun'
) flips ON flips.sid = p.student_id AND flips.ym = p.paid_month
SET p.status = 'pending';

DROP TEMPORARY TABLE IF EXISTS month_schedule;

-- ─── 7. SAMPLE NOTICES ─────────────────────────────────────────────────────

INSERT INTO notices (title, content, posted_by, priority) VALUES
  ('Welcome New Students',
   'A warm welcome to all students who joined this semester. Please check your room allocation and complete the registration process at the admin office.',
   1, 'important'),
  ('Maintenance Notice',
   'Water supply will be interrupted on the 3rd floor from 10 AM to 2 PM this Saturday due to scheduled maintenance work.',
   1, 'normal');

-- ─── 8. VERIFICATION ───────────────────────────────────────────────────────

-- 8a. Students per joined month
SELECT
    DATE_FORMAT(joined_at, '%Y-%m') AS month,
    COUNT(*)                        AS new_students
FROM students
WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo_%')
GROUP BY month
ORDER BY month;

-- 8b. Payment counts per month (both statuses)
SELECT
    paid_month,
    status,
    COUNT(*)     AS payment_count,
    SUM(amount)  AS total_usd
FROM payments
WHERE student_id IN (SELECT id FROM students WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'demo_%'))
GROUP BY paid_month, status
ORDER BY paid_month, status;

-- 8c. Global row counts
SELECT
    (SELECT COUNT(*) FROM users   WHERE username LIKE 'demo_%')   AS demo_users,
    (SELECT COUNT(*) FROM students WHERE user_id IN
        (SELECT id FROM users WHERE username LIKE 'demo_%'))      AS demo_students,
    (SELECT COUNT(*) FROM payments p
       JOIN students s ON p.student_id = s.id
       JOIN users    u ON s.user_id   = u.id
       WHERE u.username LIKE 'demo_%')                            AS demo_payments;
