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
- **Data Storage:** Local Storage (demo) / MongoDB (production ready)

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
│   ├── models/         # Data models
│   ├── routes/        # API routes
│   └── middleware/    # Custom middleware
├── package.json
└── .env               # Environment variables
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

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