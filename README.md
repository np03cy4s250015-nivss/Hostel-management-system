# Hostel Management System

A web-based application for managing hostel operations including student admissions, room allocations, payments, notices, and complaints.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MySQL

## Project Structure

```
hostel-management-system/
├── frontend/           # Frontend files (HTML, CSS, JS)
│   ├── index.html             # Login page
│   ├── dashboard_admin.html  # Admin dashboard
│   ├── dashboard_user.html   # Student dashboard
│   └── logo.png              # Application logo
│
├── backend/           # Backend API (Node.js + Express)
│   ├── config/         # Configuration files
│   │   └── database.js      # MySQL database connection
│   │
│   ├── controllers/  # Business logic (待添加)
│   │
│   ├── routes/       # API route definitions
│   │   └── index.js         # Main route handler
│   │
│   ├── middleware/  # Custom middleware (待添加)
│   │
│   ├── models/       # Data models (待添加)
│   │
│   ├── .env          # Environment variables
│   ├── database.sql # MySQL database setup script
│   ├── package.json # Node.js dependencies
│   └── server.js     # Express server entry point
│
└── README.md         # This file
```

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
   mysql -u root -p < database.sql
   ```

3. **Configure Environment**
   - Edit `.env` file in `backend/` folder
   - Update `DB_PASSWORD` with your MySQL password

4. **Start the Server**
   ```bash
   cd backend
   npm start
   ```
   Server will run on http://localhost:3000

5. **Open Frontend**
   - Open `frontend/index.html` in a browser
   - Or serve it with a local server (e.g., Live Server in VS Code)

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `users` | Admin and student accounts |
| `blocks` | Hostel blocks (Block A, B, C) |
| `rooms` | Individual rooms in each block |
| `students` | Student profile details |
| `room_allocations` | Room assignment history |
| `notices` | Notice board posts |
| `payments` | Monthly payment records |
| `complaints` | Student complaints |
| `amenities` | Hostel amenities |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api | API health check |

More endpoints to be added.

## Frontend Pages

| File | Description |
|------|-------------|
| `index.html` | Login page for admin and students |
| `dashboard_admin.html` | Admin dashboard with management features |
| `dashboard_user.html` | Student dashboard with personal info |

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test locally
4. Submit a pull request

## Notes

- Default admin credentials need to be set up manually in the database
- Use proper password hashing in production
- Add authentication middleware before deploying