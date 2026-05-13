# Hostel Management System

A web-based application for managing hostel operations including student admissions, room allocations, notices, complaints, and profile management.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MySQL

## Project Structure

```
hostel-management-system/
├── frontend/                          # Frontend files (HTML, CSS, JS)
│   ├── index.html                     # Login page
│   ├── dashboard_admin.html           # Admin dashboard
│   ├── dashboard_user.html            # Student dashboard
│   ├── css/
│   │   ├── style.css                  # Application styles
│   │   └── dark-theme.css             # Dark mode theme overrides
│   └── js/
│       ├── script.js                  # Shared utilities (auth, theme, toast)
│       ├── dashboard_admin.js         # Admin dashboard logic
│       └── dashboard_user.js          # Student dashboard logic
│
├── backend/                           # Backend API (Node.js + Express)
│   ├── config/
│   │   └── database.js               # MySQL database connection
│   ├── routes/
│   │   ├── auth.js                   # Authentication routes
│   │   └── data.js                   # CRUD routes for all entities
│   ├── users/                        # Uploaded student profile images
│   ├── database.sql                  # MySQL schema & seed data
│   ├── server.js                     # Express server entry point
│   ├── package.json                  # Node dependencies
│   └── .env                          # Environment variables
│
└── README.md                          # This file
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
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| GET | `/api/auth/me` | Get current user profile |
| POST | `/api/auth/logout` | User logout |

### Data Operations (`/api/data`) - Requires Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data/stats` | Get dashboard statistics |
| GET | `/api/data/students` | List all students |
| POST | `/api/data/students` | Add new student |
| GET | `/api/data/students/:id` | Get single student |
| PUT | `/api/data/students/:id` | Update student |
| DELETE | `/api/data/students/:id` | Delete student |
| POST | `/api/data/students/:id/image` | Upload/replace student profile image |
| GET | `/api/data/rooms` | List all rooms |
| POST | `/api/data/rooms` | Add new room |
| DELETE | `/api/data/rooms/:id` | Delete room |
| GET | `/api/data/complaints` | List complaints |
| POST | `/api/data/complaints` | Submit complaint |
| GET | `/api/data/complaints/:id` | Get single complaint |
| PUT | `/api/data/complaints/:id` | Update complaint status |
| GET | `/api/data/notices` | List notices |
| POST | `/api/data/notices` | Publish notice |
| DELETE | `/api/data/notices/:id` | Delete notice |
| GET | `/api/data/my-profile` | Get logged-in student profile |
| GET | `/api/data/my-preferences` | Get user preferences (theme, view mode) |
| PUT | `/api/data/my-preferences` | Update user preferences |
| GET | `/api/data/settings-requests` | List settings change requests |
| POST | `/api/data/settings-requests` | Submit settings change request |
| PUT | `/api/data/settings-requests/:id` | Approve/reject request (admin) |
| GET | `/api/data/notifications` | Get notifications |

## Features

### Admin Dashboard
- **Student Management:** Add/edit/delete students with automatic room assignment, profile image upload, and pricing
- **Room Management:** Add/delete rooms with capacity and status tracking
- **Complaint Management:** View, filter, and resolve student complaints
- **Notice Board:** Publish and manage notices
- **Settings Requests:** Review and approve/reject student change requests (password, theme)
- **Table/Card View Toggle:** Switch between table and card views for students, rooms, and complaints
- **Search & Filter:** Real-time search and status/floor filtering
- **Sort Controls:** Sort by various columns

### Student Dashboard
- **Profile View:** See assigned room, floor, monthly price, and join date
- **Complaint Submission:** Submit and track complaint status
- **Notice Board:** View published notices
- **Settings:** Change password (requires admin approval), theme preference
- **Notifications:** Real-time notification system for complaint updates and notices

### General
- **Role-based Access Control:** Separate dashboards for Admin and Students
- **Dark Mode:** Light, dark, and system-auto themes (persisted via backend preferences)
- **Preferences Persistence:** Theme and UI view mode saved per user across sessions
- **Responsive Design:** Works on desktop and mobile with sidebar navigation
- **Notification System:** Real-time polling for updates on complaints and notices

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
   PORT=3000
   ```
   - **Important:** Use a strong, unique value for `JWT_SECRET` (not the example value)

4. **Start the Server**
   ```bash
   cd backend
   npm start
   ```
   Server runs on http://localhost:3000

5. **Open Frontend**
   - Open `frontend/index.html` in a browser
   - Or use a local server (VS Code Live Server recommended)

6. **Default Admin Login**
   - Username: `admin`
   - Password: `admin123`

## Security Notes

- All sensitive configuration (API keys, secrets, database credentials) stored in `backend/.env` - never in frontend code
- Passwords are hashed using bcrypt before storing
- JWT tokens used for authentication (24h expiry)
- API endpoints protected with Bearer token middleware
- SQL injection prevented using parameterized queries
- File uploads restricted to image types with size limits
- Old images cleaned up on replacement and deletion