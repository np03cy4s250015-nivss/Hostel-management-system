# Hostel Management System

A web-based application for managing hostel operations including student admissions, room allocations, notices, complaints, profile management, and payments.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MySQL

## Project Structure

```
hostel-management-system/
├── index.html                       # Login page (root, not frontend/)
├── robots.txt
├── frontend/                        # Frontend files (HTML, CSS, JS)
│   ├── dashboard_admin.html         # Admin dashboard
│   ├── dashboard_user.html          # Student dashboard
│   ├── css/
│   │   ├── style.css                # Application styles
│   │   └── dark-theme.css           # Dark mode theme overrides
│   └── js/
│       ├── script.js                # Shared utilities (auth, theme, toast, escapeHtml)
│       ├── dashboard_admin.js       # Admin dashboard logic
│       └── dashboard_user.js        # Student dashboard logic
│
├── backend/                         # Backend API (Node.js + Express)
│   ├── config/
│   │   └── database.js             # MySQL connection pool (promise-based)
│   ├── middleware/
│   │   └── auth.js                 # JWT auth, token blacklist, isAdmin
│   ├── routes/
│   │   ├── auth.js                 # Login (rate-limited), register, logout
│   │   ├── data.js                 # CRUD for students, rooms, complaints, notices, settings
│   │   ├── payment.js              # eSewa integration, initiate/verify/simulate
│   │   └── index.js                # Root API route
│   ├── users/                      # Uploaded student profile images (gitignored)
│   ├── database.sql               # MySQL schema & seed data
│   ├── server.js                   # Express entry point, CORS, CSRF middleware
│   ├── .env                        # Environment variables (not committed)
│   └── package.json               # Node dependencies
│
├── AGENTS.md                       # Agent instructions (gitignored)
└── README.md                       # This file
```

## Database Schema

### Tables

| Table | Columns | Description |
|-------|---------|-------------|
| `users` | id, username, password, role, first_name, last_name, email, phone, image_url, preferences | Admin & student accounts |
| `rooms` | id, room_number, floor, capacity, current_occupancy, status | Room master data |
| `students` | id, user_id, room_id, admission_number, price, joined_at | Student profiles linked to users |
| `notices` | id, title, content, posted_by, priority, created_at | Notice board posts |
| `complaints` | id, student_id, category, description, status, resolution_notes, created_at | Student complaints |
| `payments` | id, student_id, amount, payment_method, transaction_id, status, paid_month, paid_at | Payment records (auto-created) |
| `settings_change_requests` | id, user_id, setting_type, old_value, new_value, reason, status, reviewed_by, review_notes, created_at, updated_at | Admin-approved change requests |
| `user_settings` | id, user_id, theme | Per-user theme preference |

### Room Capacity Rules
- Each room has a fixed capacity (1-4 persons)
- `current_occupancy` tracks how many students are assigned
- `status` is derived: 'available' if `current_occupancy < capacity`, 'full' if `current_occupancy >= capacity`
- Room status automatically updates on student add/delete/transfer

## API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login (rate-limited: 10 req/min) |
| POST | `/api/auth/register` | User registration |
| GET | `/api/auth/me` | Get current user profile |
| POST | `/api/auth/logout` | User logout (revokes token server-side) |

### Data Operations (`/api/data`) - Requires Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data/stats` | Get dashboard statistics |
| GET | `/api/data/students` | List all students |
| POST | `/api/data/students` | Add new student |
| GET | `/api/data/students/:id` | Get single student (students can only view own) |
| PUT | `/api/data/students/:id` | Update student |
| DELETE | `/api/data/students/:id` | Delete student |
| POST | `/api/data/students/:id/image` | Upload/replace student profile image |
| GET | `/api/data/rooms` | List all rooms |
| POST | `/api/data/rooms` | Add new room |
| DELETE | `/api/data/rooms/:id` | Delete room |
| GET | `/api/data/complaints` | List complaints |
| POST | `/api/data/complaints` | Submit complaint (max 2000 chars) |
| GET | `/api/data/complaints/:id` | Get single complaint |
| PUT | `/api/data/complaints/:id` | Update complaint status |
| GET | `/api/data/notices` | List notices |
| POST | `/api/data/notices` | Publish notice (title max 200, content max 5000) |
| PUT | `/api/data/notices/:id` | Update notice |
| DELETE | `/api/data/notices/:id` | Delete notice |
| GET | `/api/data/my-profile` | Get logged-in student profile |
| GET | `/api/data/my-preferences` | Get user preferences (theme, view mode) |
| PUT | `/api/data/my-preferences` | Update user preferences |
| GET | `/api/data/settings-requests` | List settings change requests |
| POST | `/api/data/settings-requests` | Submit settings change request |
| PUT | `/api/data/settings-requests/:id` | Approve/reject request (admin) |
| GET | `/api/data/notifications` | Get notifications (live-generated from DB) |

### Payment (`/api/payment`) - No Auth on Success/Failure Callbacks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payment/success` | eSewa success callback (no auth) |
| GET | `/api/payment/failure` | eSewa failure callback (no auth) |
| POST | `/api/payment/initiate` | Initiate eSewa payment |
| POST | `/api/payment/verify` | Verify payment after eSewa redirect |
| POST | `/api/payment/simulate` | Admin-only: simulate a payment (bypasses eSewa) |
| POST | `/api/payment/mark-completed` | Admin-only: mark payment completed |
| POST | `/api/payment/cancel-pending` | Student: cancel pending payment |
| GET | `/api/payment/history` | Payment history (student: own, admin: all) |
| GET | `/api/payment/my-status` | Student: current month payment status |
| GET | `/api/payment/stats` | Admin: payment statistics |

## Features

### Admin Dashboard
- **Student Management:** Add/edit/delete students with automatic room assignment, profile image upload, and pricing
- **Room Management:** Add/delete rooms with capacity and status tracking
- **Complaint Management:** View, filter, and resolve student complaints with status transitions
- **Notice Board:** Publish, edit, and manage notices
- **Settings Requests:** Review and approve/reject student change requests (password, theme)
- **Payment Management:** View payment history, simulate payments, mark payments completed
- **Table/Card View Toggle:** Switch between table and card views for students, rooms, and complaints
- **Search & Filter:** Real-time search and status/floor filtering
- **Sort Controls:** Sort by various columns

### Student Dashboard
- **Profile View:** See assigned room, floor, monthly price, join date, and profile image
- **Complaint Submission:** Submit and track complaint status with real-time notifications
- **Notice Board:** View published notices
- **Settings:** Change password (requires admin approval), theme preference
- **Payments:** Pay monthly fee via eSewa, view payment history

### General
- **Role-based Access Control:** Separate dashboards for Admin and Students
- **Dark Mode:** Light, dark, and system-auto themes (persisted via backend preferences)
- **Preferences Persistence:** Theme and UI view mode saved per user across sessions
- **Responsive Design:** Works on desktop and mobile with sidebar navigation
- **Notification System:** 5-second polling for updates on complaints, notices, and payments
- **CSRF Protection:** State-changing endpoints require JSON Content-Type

## Image Upload
- Student profile images are uploaded via the admin dashboard
- Images are stored in `backend/users/` directory
- Supported formats: jpg, jpeg, png, gif, webp (max 5MB)
- Each student has one image — uploading a new one replaces the old
- Images are deleted automatically when a student is removed
- Served statically at `/users/{filename}`

## Getting Started

### Prerequisites

- Node.js (v14+)
- MySQL (v5.7+)

### Installation

1. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Setup MySQL Database**
   ```bash
   mysql -u root -p < backend/database.sql
   ```
   Or manually: Open MySQL and run the commands in `backend/database.sql`

3. **Configure Environment**
   - Create `.env` file in `backend/` folder (do not commit this file):
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=hostel_management
   JWT_SECRET=your-secure-random-secret-here
   ESEWA_SECRET_KEY=your-esewa-secret-key
   PORT=3000
   BACKEND_BASE_URL=http://127.0.0.1:3000
   FRONTEND_URL=http://127.0.0.1:5500
   ```
   - **Important:** Use a strong, unique value for `JWT_SECRET`
   - `ESEWA_SECRET_KEY` is required for payment integration (sandbox: `8gBm/:&EnhH.1/q`)
   - For LAN access, update `BACKEND_BASE_URL` and `FRONTEND_URL` to your LAN IP (e.g., `http://192.168.x.x:3000`)

4. **Start the Server**
   ```bash
   cd backend
   npm start
   ```
   Server runs on http://localhost:3000

5. **Open Frontend**
   - Open `index.html` (login page) in a browser
   - Or use a local server (VS Code Live Server recommended on port 5500 serving from project root)

6. **Default Admin Login**
   - Username: `admin`
   - Password: `admin123`

## Security Notes

- All sensitive configuration stored in `backend/.env` - never in frontend code
- Passwords are hashed using bcrypt before storing
- JWT tokens used for authentication (24h expiry)
- Token blacklist stored in-memory (lost on server restart)
- API endpoints protected with Bearer token middleware
- Login rate-limited: 10 requests per minute per IP
- CSRF protection via Content-Type checking on state-changing methods
- SQL injection prevented using parameterized queries
- File uploads restricted to image types with size limits
- Old images cleaned up on replacement and deletion
- Frontend XSS prevention via `escapeHtml()` using DOM textContent
