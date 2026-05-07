# Hostel Management System

A web-based application for managing hostel operations including student admissions, room allocations, notices, and complaints.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MySQL

## Project Structure

```
hostel-management-system/
├── frontend/              # Frontend files (HTML, CSS, JS)
│   ├── index.html                    # Login page
│   ├── dashboard_admin.html         # Admin dashboard
│   ├── dashboard_user.html          # Student dashboard
│   ├── css/
│   │   └── style.css                 # Application styles
│   └── js/
│       ├── script.js                 # Shared utilities
│       ├── dashboard_admin.js        # Admin dashboard logic
│       └── dashboard_user.js         # Student dashboard logic
│   └── assets/
│       └── icons/                    # Icon images
│
├── backend/              # Backend API (Node.js + Express)
│   ├── config/
│   │   └── database.js              # MySQL database connection
│   ├── routes/
│   │   ├── auth.js                  # Authentication routes
│   │   └── data.js                  # CRUD routes for entities
│   ├── database.sql                 # MySQL schema & seed data
│   ├── server.js                    # Express server entry point
│   ├── package.json                 # Node dependencies
│   └── .env                         # Environment variables
│
└── README.md                         # This file
```

## Database Schema

### Cleaned Schema (Removed Unused Columns)

After audit, the following unused columns were removed to streamline the database:

**Removed columns:**
- `users.created_at` - not used
- `rooms.created_at` - not used
- `rooms.block_id` - blocks concept removed
- `complaints.resolved_by` - never used
- `complaints.updated_at` - never queried
- `notices.expires_at` - never used

### Tables

| Table | Columns | Description |
|-------|---------|-------------|
| `users` | id, username, password, role, first_name, last_name, email, phone | Admin & student accounts |
| `rooms` | id, room_number, floor, capacity, current_occupancy, status | Room master data |
| `students` | id, user_id, room_id, admission_number | Student profiles linked to users |
| `notices` | id, title, content, posted_by, priority, created_at | Notice board posts |
| `complaints` | id, student_id, category, description, status, resolution_notes, created_at | Student complaints |

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

## Getting Started

- **Role-based Access Control:** Separate dashboards for Admin and Students
- **Room Management:** Add/delete rooms, track capacity and occupancy
- **Student Management:** Create, update, delete student accounts with automatic room assignment
- **Complaint System:** Students submit complaints, admins track and resolve them
- **Notice Board:** Admins publish notices visible to all students
- **Responsive Design:** Works on desktop and mobile

## Security Notes

- All sensitive configuration (API keys, secrets, database credentials) stored in `backend/.env` - never in frontend code
- Passwords are hashed using bcrypt before storing
- JWT tokens used for authentication (24h expiry)
- API endpoints protected with Bearer token middleware
- SQL injection prevented using parameterized queries