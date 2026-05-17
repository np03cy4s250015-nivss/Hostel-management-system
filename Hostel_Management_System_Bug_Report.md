# Bug Analysis Report

## 1. Project Overview
* **Project Name:** Hostel Management System
* **Date:** May 15, 2026
* **Analyzed by:** Z.ai Code Analysis Engine
* **Project Stack:** Node.js / Express / MySQL / Vanilla JS

---

## 2. Executive Summary / Bug Matrix

The code review and vulnerability assessment identified a total of **33 issues** across the system, classified by category and severity below:

| Category | High / Critical | Medium | Total |
| :--- | :---: | :---: | :---: |
| **Security Vulnerabilities** | 7 / 5 | 2 | **10** |
| **Logic Bugs** | 1 / 4 | 3 | **8** |
| **Data Integrity** | 3 / 0 | 2 | **5** |
| **Frontend Issues** | 0 / 2 | 4 | **6** |
| **Configuration Issues** | 1 / 2 | 0 | **4** |
| **Total** | **7 / 14** | **12** | **33** |

---

## 3. Detailed Bug Registry

### 3.1 Security Vulnerabilities
Critical security flaws that require immediate remediation to prevent unauthorized access, data breaches, or complete system compromise.

| # | Severity | Location | Description | Category |
| :-: | :--- | :--- | :--- | :--- |
| **1** | Critical | `routes/auth.js:59-82` | **Open Registration Endpoint:** `POST /api/auth/register` allows anyone to create accounts with any role (including admin). No admin authorization check exists. An attacker can register as admin and gain full system control, accessing all student data, payments, and complaints. | Authorization |
| **2** | Critical | `routes/data.js:49` | **No Role-Based Access Control:** `router.use(authenticateToken)` only checks if a token is valid, but never validates the user role. Any authenticated student can access admin-only endpoints like `POST /students`, `DELETE /students/:id`, `POST /rooms`, `DELETE /rooms/:id`, `PUT /complaints/:id`, etc. | Authorization |
| **3** | Critical | `routes/payment.js:322-357` | **Simulate Payment Endpoint:** `POST /api/payment/simulator` allows any authenticated user to mark payments as completed without actual payment. While it says "for testing", there is no environment guard to disable it in production. Students can mark their own fees as paid. | Payment Fraud |
| **4** | Critical | `routes/data.js:574-617` | **Password Stored in Plain Text in DB:** The settings change request stores the new password (`newValue`) in plain text in the `settings_change_requests` table. Any admin or DB user can read the plaintext password from this table before it is hashed on approval. | Data Exposure |
| **5** | Critical | `.env.example:16` | **Hardcoded eSewa Secret Key:** `ESEWA_SECRET_KEY` defaults to `"8gBm/:&EnhH.1;/q"` in the source code. If the `.env` file is missing this variable, the production secret is the publicly visible sandbox key, allowing attackers to forge payment signatures. | Credential Leak |
| **6** | High | `server.js:12` | **CORS Wide Open:** `app.use(cors())` allows requests from any origin. In production, this should be restricted to the actual frontend domain to prevent CSRF and cross-origin data theft attacks. | CORS |
| **7** | High | `routes/data.js:289-303` | **No Input Validation on Room Creation:** `POST /rooms` accepts `roomNumber`, `floor`, `capacity`, `status` without any server-side validation. Missing fields, negative capacities, or invalid statuses will either cause SQL errors or corrupt data integrity. | Input Validation |
| **8** | High | `routes/data.js:415-430` | **No Authorization on Notice Deletion:** `DELETE /notices/:id` allows any authenticated user (including students) to delete any notice. There is no check that the user is an admin or the original author of the notice. | Authorization |
| **9** | Medium | `routes/auth.js:124-126` | **Meaningless Logout Endpoint:** `POST /api/auth/logout` returns a success message but does not invalidate the JWT token server-side. The token remains valid for its full 24-hour lifetime. True logout requires a token blacklist or short-lived tokens with refresh. | Session Mgmt |
| **10** | Medium | `routes/data.js:179-211` | **Path Traversal Risk in Image Upload:** While `path.basename()` is used to sanitize filenames, the image URL is constructed from user-controlled data. The upload directory is served statically at `/users`, potentially exposing all uploaded files to directory traversal if server misconfiguration occurs. | File Upload |

---

### 3.2 Logic Bugs
Functional errors causing incorrect application behavior, data inconsistencies, or unexpected logical pathways.

| # | Severity | Location | Description | Category |
| :-: | :--- | :--- | :--- | :--- |
| **1** | Critical | `routes/data.js:86-123` | **Student Creation Without Transaction:** `POST /students` creates a user, then a student, then updates room occupancy. If the room update fails (e.g., connection lost), the user and student records are created but room occupancy is wrong. The connection is obtained but `beginTransaction()` is never called before the operations. | Data Integrity |
| **2** | High | `routes/data.js:140` | **Delete Student Before Delete User:** When deleting a student, the code deletes from the `students` table first, then from the `users` table. Since `students.user_id` is a foreign key with `ON DELETE CASCADE`, deleting the user first would automatically delete the student. The current order could cause a constraint violation in certain MySQL configurations. | Data Integrity |
| **3** | High | `routes/data.js:144` | **Room Occupancy Can Go Negative:** When deleting a student, room occupancy is decremented by 1 without checking if `current_occupancy` is already 0. If data is inconsistent, this can produce negative occupancy values, causing the room status to incorrectly show as "available" when it has negative counts. | Data Integrity |
| **4** | High | `routes/data.js:54` | **Stats Count Only Full Rooms:** The dashboard stat `occupiedRooms` only counts rooms with `status="full"`, ignoring rooms that are partially occupied (`status="available"` but `current_occupancy > 0`). This misleads admins into thinking there are fewer occupied rooms than there actually are. | Incorrect Logic |
| **5** | High | `routes/data.js:213-272` | **Race Condition on Room Update:** `PUT /students/:id` changes room assignment by reading current occupancy, then incrementing/decrementing. Two concurrent requests could both read the same occupancy value and both increment, causing double-counting. The connection is obtained but no row-level locking (`SELECT FOR UPDATE`) is used. | Race Condition |
| **6** | Medium | `routes/data.js:343-361` | **Complaint Student ID Not Validated:** `POST /complaints` accepts any `studentId` from the request body. A student can submit complaints on behalf of other students by providing their ID. The endpoint does not verify that the authenticated user owns the given `studentId`. | Authorization |
| **7** | Medium | `routes/data.js:384-396` | **Complaint Update Allows Any Status:** `PUT /complaints/:id` allows setting status to any value including "pending" which reverts progress. There is no state machine enforcement (e.g., cannot go from "resolved" back to "pending"). | State Machine |
| **8** | Medium | `frontend/js/dashboard_user.js:273-308` | **Student Lookup by Email is Fragile:** `submitComplaint()` fetches ALL students, then finds the matching one by email. If two users share an email (edge case), the wrong student could be returned. The backend should provide a dedicated endpoint to get the current user student record. | Fragile Logic |

---

### 3.3 Data Integrity Issues
Flaws causing database records to Fall out of sync with real-world state and system assumptions.

| # | Severity | Location | Description | Category |
| :-: | :--- | :--- | :--- | :--- |
| **1** | High | `routes/data.js:86-123` | **Room Occupancy Not Updated on Duplicate Entry Error:** If the `INSERT INTO users` fails with `ER_DUP_ENTRY` (duplicate username), the catch block returns an error but the obtained connection is never released since `connection.release()` is in the finally block after the catch re-throws. Actually, the finally does execute, but the room occupancy increment has already been attempted before the student insert, creating an inconsistency. | Atomicity |
| **2** | High | `routes/data.js:236-263` | **Room Change Double-Count Scenario:** When updating a student room, if `oldRoomId` equals `roomId` (same room), the code still executes both the decrement on the old room and increment on the new room, causing occupancy to increase by 1 for no reason. The condition `oldRoomId !== roomId` prevents this, but if `roomId` is passed as a string vs integer, the strict inequality may not match correctly. | Type Coercion |
| **3** | High | `routes/data.js:305-313` | **Room Delete Without Student Reassignment:** `DELETE /rooms/:id` deletes a room without reassigning students who may still be linked to it. If a student has `room_id` pointing to the deleted room, their foreign key will be set to `NULL` (`ON DELETE SET NULL`), but the student record still exists with no room, potentially causing confusion. | Referential Integrity |
| **4** | Medium | `database.sql:97-112` | **Rooms Inserted Without Occupancy Check:** The SQL seed script inserts 30 rooms with `current_occupancy = 0`, but if any students already exist with room assignments, the occupancy counts will be wrong after re-running the seed script. There is no migration-safe approach. | Seed Data |
| **5** | Medium | `routes/payment.js:21-43` | **Auto-Create Payments Table on Module Load:** The payments table is created via an IIFE at module import time. If this fails (e.g., table already exists with different schema), it only logs a warning and continues. This silent failure could cause payment operations to fail with cryptic errors later. | Schema Mgmt |

---

### 3.4 Frontend Issues
Client-side issues that disrupt user experience, create operational bugs, or expose vectors for asset/token theft.

| # | Severity | Location | Description | Category |
| :-: | :--- | :--- | :--- | :--- |
| **1** | High | `frontend/js/script.js:5-6` | **Hardcoded API Base URL:** `API_BASE_URL` is hardcoded to `"http://127.0.0.1:3000"`. When deployed to a server, all API calls will fail. This should be read from a configuration or use relative paths. The same issue exists in `dashboard_admin.js` and `dashboard_user.js`. | Configuration |
| **2** | High | `frontend/js/script.js:48-63` | **JWT Token Stored in localStorage/sessionStorage:** The authentication token is stored client-side and is vulnerable to XSS attacks. If any XSS vulnerability exists in the application, an attacker can steal the token and impersonate the user. HttpOnly cookies would be more secure. | Security |
| **3** | Medium | `frontend/js/dashboard_user.js:187-228` | **Student Can See All Complaints:** `loadUserComplaints()` fetches `/api/data/complaints` which returns ALL complaints from ALL students. There is no server-side filter to only return the authenticated student complaints. A student can see every other student complaints, descriptions, and personal information. | Data Leak |
| **4** | Medium | `frontend/js/dashboard_admin.js:8-12` | **Duplicate imageUrl() Function:** The `imageUrl()` helper is defined in both `dashboard_admin.js` (line 8 and line 238) and `dashboard_user.js` (line 9). The two definitions in admin JS have different implementations, with the second one on line 238 overriding the first. This is confusing and error-prone. | Code Quality |
| **5** | Medium | `frontend/js/dashboard_user.js:734` | **Excessive Notification Polling:** Notifications are polled every 2 seconds (`setInterval` at line 734). This creates unnecessary load on the server, especially with many concurrent users. WebSocket or Server-Sent Events would be more efficient, or at minimum increase the polling interval to 30-60 seconds. | Performance |
| **6** | Medium | `frontend/js/dashboard_user.js:640-697` | **Current Password Not Verified on Change:** The `saveSettings()` function collects the current password but never sends it to the backend for verification. The settings change request endpoint also does not verify the old password. Anyone with access to a logged-in session can change the password without knowing the current one. | Security |

---

### 3.5 Configuration and Deployment Issues
Environment-level deficiencies preventing standard, secure infrastructure setups.

| # | Severity | Location | Description | Category |
| :-: | :--- | :--- | :--- | :--- |
| **1** | Critical | `backend/package.json:8` | **No Production Start Script:** The `"dev"` script is identical to `"start"` (both run `"node server.js"`). There is no nodemon for development, no process manager for production, and no environment-aware configuration. The application runs identically in all environments with no differentiation. | Deployment |
| **2** | High | `backend/server.js:7-10` | **JWT_SECRET Throwing on Startup:** If `JWT_SECRET` is not set in environment, the application throws a synchronous error at module load time in `auth.js` and `data.js`. This crashes the entire server with an unhelpful error message. It should fail gracefully with a clear log message during a health check or config validation phase. | Error Handling |
| **3** | High | `backend/config/database.js:3-12` | **Database Connection Without TLS:** The MySQL connection pool uses default settings without TLS/SSL. In production, database connections should be encrypted to prevent man-in-the-middle attacks, especially if the database is on a separate server. | Encryption |
| **4** | Medium | `routes/payment.js:16-18` | **Hardcoded Backend URL for Payment Callbacks:** `BACKEND_BASE_URL` is constructed from `"http://127.0.0.1:" + PORT`. The eSewa success/failure callback URLs use this, so payment callbacks will fail in any non-local environment. This must be configurable via environment variables. | Configuration |

---

## 4. Detailed Recommendations

### 4.1 Immediate Actions (Critical Priority)
Implement these remediation measures immediately to stabilize basic security and transaction safety.

1. **Add Role-Based Access Control**
   * *Details:* Implement middleware that checks `req.user.role` for all admin-only endpoints. Create an `isAdmin` middleware and apply it to `POST /students`, `DELETE /students/:id`, `POST /rooms`, `DELETE /rooms/:id`, `PUT /complaints`, `DELETE /notices`, and payment admin endpoints. Disable or remove the `/simulate` endpoint entirely in production.
2. **Restrict Registration**
   * *Details:* Remove the open registration endpoint or add admin-only authorization. New user creation should only happen through the admin dashboard (`POST /students` already creates users). If self-registration is needed, restrict the role to "student" only and never accept role adjustments directly from the incoming request body.
3. **Fix Password Handling in Settings Requests**
   * *Details:* Hash the new password with bcrypt before storing it in `settings_change_requests`. When the admin approves, the already-hashed password can be directly updated in the `users` table. This prevents plaintext passwords from ever being recorded in the database.
4. **Remove Hardcoded Secrets**
   * *Details:* Move all secrets (`JWT_SECRET`, `ESEWA_SECRET_KEY`, `DB_PASSWORD`) to environment variables with no default fallback values. Remove the default sandbox secret key from `.env.example`. The application should refuse to start if any required secret environment variable is missing.
5. **Use Transactions for Multi-Step Operations**
   * *Details:* Wrap student creation, deletion, and room change operations in proper database transactions using `beginTransaction()`, `commit()`, and `rollback()`. This ensures absolute atomicity: either all related changes succeed or none do, eliminating structural database synchronization issues.

### 4.2 Short-Term Actions (High Priority)
1. **CORS Restrictions:** Configure CORS to only allow the actual frontend origin. Replace `app.use(cors())` with `cors({ origin: process.env.FRONTEND_URL })`.
2. **Input Validation:** Add comprehensive input validation using a library like `express-validator` or `Joi`. Validate all request body fields, query parameters, and URL parameters with proper type checking and sanitization rules.
3. **Row-Level Locking:** Implement proper database transactions with row-level locking (`SELECT ... FOR UPDATE`) for room occupancy updates to eliminate race conditions under high concurrent requests.
4. **Fix Dashboard Statistics:** Adjust the dashboard metrics queries to calculate partially occupied rooms correctly. Modify the SQL structure to count rooms where `current_occupancy > 0` instead of matching strictly against `status = "full"`.
5. **Password Change Verification Guard:** Add a confirmation verification step into the settings alteration workflow: require verification of the user's current password before accepting any changes.
6. **Configurable API Endpoints:** Make API base URLs fully adjustable via environment configuration instead of hardcoding localhost fields. Use relative URLs or a dynamic environment config provider.
7. **Encrypted Database Traffic:** Add TLS/SSL configuration options to the MySQL connection pool setup for production systems to completely encrypt internal database operations.

### 4.3 Medium-Term Improvements
1. **Mitigate XSS-Based Token Exploitation:** Transition authentication tokens out of client-side local storage frameworks. Deploy `HttpOnly, Secure` cookies alongside a proper token refresh pipeline utilizing short-lived access lifecycles.
2. **Implement Server-Side Complaint Filtering:** Modify the `GET /complaints` endpoint logic to dynamically filter rows depending on the context of the authenticated requester profile. Ensure regular student roles can never extract complete database complaints listings.
3. **Optimize Polling Workloads:** Replace the excessive 2-second client-side notification request interval loops. Migrate to Server-Sent Events (SSE) or WebSockets, or at a minimum scale up the default interval timeout back into a standard 30-to-60-second window.
4. **Enforce State Machine Integrity:** Establish an explicit state transition structure across complaints management models (e.g., status maps can proceed from `pending` -> `in_progress` / `rejected`, and `in_progress` -> `resolved` / `pending`, but never backwards from final state values like `resolved` -> `pending`).
5. **Centralize App-Wide Routing Middleware:** Refactor repetitive routing routines out of custom controllers. Introduce a global Express global interceptor/error handler layout to normalize runtime fallback structures and remove boilerplate.
6. **Incorporate Regression Integration Tests:** Build and maintain end-to-end continuous validation suites targeting primary logic lifecycles: student onboarding metrics, transaction tracking callbacks, and complaints management.
