# Hostel Management System - User Manual

## Table of Contents
1. [Getting Started](#getting-started)
2. [User Roles](#user-roles)
3. [Admin Dashboard](#admin-dashboard)
4. [Student Dashboard](#student-dashboard)
5. [Payment System](#payment-system)
6. [Complaint Management](#complaint-management)
7. [Notice Board](#notice-board)
8. [Settings & Preferences](#settings--preferences)
9. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection to access the hostel management system

### Accessing the System
1. Open your web browser and navigate to the hostel management system URL (provided by your administrator)
2. You will see the login page
3. Enter your username and password
4. Click "Sign In"

### Default Credentials
- **Admin**: Username: `admin`, Password: `admin123`
- **Students**: Credentials provided by administrator

## User Roles

### Administrator
- Full access to all system features
- Can manage students, rooms, complaints, notices, and payments
- Can approve/reject settings change requests
- Can view all payment statistics and history

### Student
- Limited access to personal information and actions
- Can view own profile, room assignment, and payment status
- Can submit and track complaints
- Can view notices
- Can change password (requires admin approval)
- Can make payments via eSewa

## Admin Dashboard

### Overview
The admin dashboard provides an overview of hostel operations with quick access to all management functions.

### Navigation
- **Sidebar**: Contains navigation links to different sections
- **Header**: Shows user information, notifications, and theme selector
- **Main Content Area**: Displays selected section content

### Sections
1. **Dashboard**: Overview statistics (total students, occupied rooms, pending complaints, monthly revenue)
2. **Students**: Manage student records (add, edit, delete, view)
3. **Rooms**: Manage room inventory (add, edit, delete, view occupants)
4. **Complaints**: View and resolve student complaints
5. **Notices**: Publish and manage announcements
6. **Settings Requests**: Review and approve/reject student requests (password changes, theme preferences)
7. **Notifications**: View system notifications (complaints, requests, payments)

### Student Management
#### Adding a Student
1. Click "Students" in sidebar
2. Click "Add Student" button
3. Fill in required fields:
   - Username
   - Password (minimum 6 characters)
   - First Name
   - Last Name
   - Email
   - Phone
   - Admission Number
   - Monthly Price
   - Room Assignment
4. Optional: Upload profile image
5. Click "Add Student"

#### Editing a Student
1. Navigate to Students section
2. Find the student in the list
3. Click "Edit" button in their row/card
4. Modify desired fields
5. Click "Save Changes"

#### Deleting a Student
1. Navigate to Students section
2. Find the student in the list
3. Click "Delete" button in their row/card
4. Confirm deletion in the popup

### Room Management
#### Adding a Room
1. Click "Rooms" in sidebar
2. Click "Add Room" button
3. Fill in:
   - Room Number
   - Floor (positive number)
   - Capacity (1-4 persons)
   - Status (Available, Full, Maintenance)
4. Click "Add Room"

#### Viewing Room Occupants
1. Navigate to Rooms section
2. Find the room in the list
3. Click "View Occupants" button
4. See list of students assigned to the room

### Complaint Management
#### Viewing Complaints
1. Navigate to Complaints section
2. Use filters to show complaints by status (Pending, In Progress, Resolved, Rejected)
3. Click on a complaint to view details

#### Updating Complaint Status
1. Open a complaint from the list
2. Select new status from dropdown (based on current status)
3. Add resolution notes (if applicable)
4. Click "Update Status"

### Notice Management
#### Publishing a Notice
1. Click "Notices" in sidebar
2. Click "Add Notice" button
3. Fill in:
   - Title (max 200 characters)
   - Content (max 5000 characters)
   - Priority (Normal, Important, Urgent)
4. Click "Publish Notice"

#### Editing/Deleting a Notice
1. Navigate to Notices section
2. Find the notice in the list
3. Click "Edit" or "Delete" button
4. For edit: modify title/content/priority and save
5. For delete: confirm deletion

### Settings Change Requests
#### Reviewing Requests
1. Navigate to Settings Requests section
2. See list of pending requests (password changes, theme preferences)
3. Click on a request to view details

#### Approving/Rejecting Requests
1. Open a request from the list
2. Select "Approved" or "Rejected"
3. Add review notes (optional)
4. Click "Process Request"
5. If approved, the change will be applied automatically

## Student Dashboard

### Overview
The student dashboard provides access to personal information and actions available to students.

### Navigation
- **Sidebar**: Contains navigation links to different sections
- **Header**: Shows user information, notifications, and theme selector
- **Main Content Area**: Displays selected section content

### Sections
1. **Dashboard**: Overview (room assignment, floor, open complaints)
2. **Profile**: View and update personal information
3. **Complaints**: Submit and track complaints
4. **Notices**: View published announcements
5. **Payments**: Check payment status and make payments
6. **Settings**: Change password and theme preference

### Profile Section
#### Viewing Profile
1. Navigate to Profile section
2. See:
   - Room Number
   - Floor
   - Admission Number
   - Monthly Price
   - Join Date
   - Contact Information
   - Profile Image

### Complaint Management
#### Submitting a Complaint
1. Navigate to Complaints section
2. Click "Submit Complaint" button
3. Fill in:
   - Category (e.g., Maintenance, Food, Wi-Fi)
   - Description (max 2000 characters)
4. Click "Submit Complaint"

#### Tracking Complaints
1. Navigate to Complaints section
2. See list of your complaints with status indicators
3. Click on a complaint to view details and updates

### Notice Board
#### Viewing Notices
1. Navigate to Notices section
2. See list of published notices
3. Click on a notice to view full content
4. Notices are sorted by date (newest first)

### Payment System
#### Checking Payment Status
1. Navigate to Payments section
2. See current month status:
   - **Paid**: Payment completed for current month
   - **Pending**: Payment initiated but not completed
   - **Due**: Payment not yet initiated
3. View payment history
4. See total payments made and amount paid

#### Making a Payment
1. Navigate to Payments section
2. If status is "Due" or "Pending":
   - Click "Pay Now with eSewa" or "Retry Payment" button
   - You will be redirected to eSewa payment gateway
   - Complete the payment process
   - After successful payment, you will be redirected back to the system
   - Payment status will update automatically

### Settings
#### Changing Theme
1. Navigate to Settings section
2. Select theme from dropdown (Light, Dark, Auto)
3. Theme changes apply immediately
4. Preference is saved to your account

#### Changing Password
1. Navigate to Settings section
2. Enter current password
3. Enter new password (minimum 6 characters)
4. Confirm new password
5. Click "Save Settings"
6. Request is submitted for admin approval
7. You will be notified when approved/rejected

## Payment System

### eSewa Integration
The system uses eSewa sandbox for payment processing. All transactions are in Nepalese Rupees (Rs.).

### Payment Flow
1. Student initiates payment from dashboard
2. System creates payment record and redirects to eSewa
3. Student completes payment on eSewa platform
4. eSewa redirects back to system via backend callback
5. System verifies payment with eSewa
6. Payment status updated to "Completed" if successful
7. Student sees updated payment status

### Payment Statuses
- **Pending**: Payment initiated but not yet completed
- **Completed**: Payment successfully processed
- **Failed**: Payment failed or was cancelled

### Admin Payment Functions
Administrators can:
- View all payment history
- See monthly revenue statistics
- Simulate payments (for testing)
- Mark payments as completed manually (for testing)

## Complaint Management

### Complaint Lifecycle
1. **Pending**: New complaint submitted, awaiting action
2. **In Progress**: Complaint being addressed
3. **Resolved**: Complaint has been resolved
4. **Rejected**: Complaint has been rejected (with reason)

### Status Transition Rules
- Pending → In Progress or Rejected
- In Progress → Resolved, Pending, or Rejected
- Resolved → (terminal state)
- Rejected → (terminal state)

## Notice Board

### Notice Types
- **Normal**: Regular announcements
- **Important**: Requires attention
- **Urgent**: Immediate action needed

### Notice Limits
- Title: Maximum 200 characters
- Content: Maximum 5000 characters

## Settings & Preferences

### Theme Preferences
- **Light**: Light color scheme
- **Dark**: Dark color scheme
- **Auto**: Follows system/browser preference

### View Modes
Each management section (Students, Rooms, Complaints, Payments) can be viewed as:
- **Table**: Traditional tabular view
- **Card**: Visual card-based view

Preferences are saved per user and persist across sessions.

## Troubleshooting

### Common Issues

#### Login Problems
- **Issue**: Unable to log in with correct credentials
  **Solution**: 
  1. Check username and password for typos
  2. Ensure Caps Lock is off
  3. Try resetting password via "Forgot Password" link (if available)
  4. Contact administrator if problem persists

#### Payment Issues
- **Issue**: Payment not showing as completed after eSewa transaction
  **Solution**:
  1. Wait a few minutes and refresh the page
  2. Check payment history for status
  3. If still pending, contact administrator with transaction details
  4. Administrator can verify/manual mark payment as completed

#### Image Upload Problems
- **Issue**: Unable to upload profile image
  **Solution**:
  1. Ensure image is in JPG, JPEG, PNG, GIF, or WebP format
  2. Check file size (maximum 5MB)
  3. Try a different image file
  4. Contact administrator if problem persists

#### Notification Issues
- **Issue**: Not receiving notifications
  **Solution**:
  1. Ensure browser notifications are allowed for the site
  2. Check if you have dismissed notifications accidentally
  3. Refresh the page to re-establish connection
  4. Log out and log back in

### Getting Help
If you encounter issues not covered in this manual:
1. Contact your system administrator
2. Provide detailed description of the problem
3. Include steps to reproduce the issue
4. Mention your user role and any error messages seen

## System Features

### Security
- Passwords are hashed using bcrypt
- JWT tokens used for authentication (24-hour expiry)
- Role-based access control
- CSRF protection on state-changing requests
- SQL injection prevention via parameterized queries
- File upload restricted to safe image types

### Accessibility
- Responsive design works on desktop and mobile
- Keyboard navigation supported
- Color contrast meets accessibility guidelines
- Screen reader friendly

### Data Management
- Automatic backups recommended by administrator
- Image cleanup when students are removed
- Historical data preserved for reporting
- Preferences stored per user

## Changelog

### Version 1.0
- Initial release
- Core features: student/room management, complaints, notices, payments
- Role-based access control
- eSewa payment integration
- Theme customization
- Notification system

### Version 1.1
- Fixed currency display to show Rs. instead of $
- Improved notification system reliability
- Enhanced payment status tracking
- Various UI/UX improvements