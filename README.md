# Hostel Management System

A full-stack web application for managing hostel operations including student management, room allocation, complaints, payments, and notices.

## Features

- **User Dashboard**
  - View room details and allocation
  - Submit and track complaints
  - Payment history
  - View notices and announcements

- **Admin Dashboard**
  - Student management (add, edit, delete)
  - Room management
  - Complaint tracking and resolution
  - Payment overview
  - Notice board management

- **Authentication**
  - Secure login system
  - Role-based access (Student/Admin)
  - Session management

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MySQL with Sequelize ORM
- **Data Storage:** Local Storage (demo) / MySQL (production)

## Database Schema

### Tables Created:
| Table | Description |
|-------|-------------|
| `users` | User accounts (admin, student, warden) |
| `blocks` | Hostel blocks |
| `rooms` | Room details and availability |
| `bookings` | Room booking records |
| `payments` | Payment transactions |
| `complaints` | Student complaints |
| `maintenance_requests` | Room maintenance requests |
| `notices` | Announcements and notices |
| `room_allocations` | Active room assignments |

### ER Diagram
```
users (1) ──────< bookings
rooms (1) ──────< bookings
users (1) ──────< payments
bookings (1) ───< payments
users (1) ──────< complaints
rooms (1) ──────< complaints
users (1) ──────< room_allocations
rooms (1) ──────< room_allocations
```

## Project Structure

```
Hostel-management-system/
├── frontend/              # Frontend files
│   ├── index.html       # Login page
│   ├── dashboard_admin.html
│   ├── dashboard_user.html
│   ├── css/            # Stylesheets
│   └── js/             # Client-side scripts
├── server/              # Backend code
│   ├── index.js        # Server entry point
│   ├── config/         # Configuration files
│   │   └── database.js
│   ├── models/         # Data models (Sequelize)
│   ├── routes/        # API routes
│   └── middleware/    # Custom middleware
├── database/           # Database files
│   ├── schema.sql     # MySQL schema
│   └── .env.example   # Database config template
├── package.json
├── .env               # Environment variables
├── .gitignore
├── README.md
└── robots.txt
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Database Setup

1. Create the database:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

2. Update `.env` with your MySQL credentials:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=hostel_management
   DB_PORT=3306
   ```

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open browser and navigate to:
   ```
   http://localhost:3000
   ```

### Demo Credentials

| Role  | Username | Password    |
|-------|----------|-------------|
| Admin | admin    | admin123    |
| User  | student  | student123  |

## API Endpoints

- `GET /api/health` - Health check endpoint
- (More endpoints to be added)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.