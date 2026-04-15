# Frontend Page Activity Diagrams

These diagrams model user interactions with each frontend page as a single-entry, single-exit flow with multiple decision branches.

---

## 1. Login Page (`index.html`) - Activity Diagram

```
START
 │
 ▼
┌──────────────────────────────┐
│ Page Load (index.html)       │
│ - Display login form         │
│ - Check for existing session │
│   (localStorage/session)     │
└─────────────┬────────────────┘
              │
    ┌─────────┴──────────┐
    │ Has valid session? │
    └────┬───────────────┘
         │ Yes               No
         ▼                   ▼
┌─────────────────────┐   ┌──────────────────────────┐
│ Redirect to         │   │ User enters:             │
│ appropriate         │   │ - Username               │
│ dashboard based     │   │ - Password               │
│ on role             │   │ - "Remember me" checkbox │
│ (admin → admin      │   └───────────┬───────────────┘
│  dashboard,         │               │
│  student → user     │               ▼
│  dashboard)         │   ┌──────────────────────────┐
└──────────┬──────────┘   │ Click "Login" button     │
           │              └───────────┬───────────────┘
           ▼                          │
    ┌──────────────┐                ┌─┴─┐
    │  END         │   Validation:   │   │
    └──────────────┘   All fields?   │   ▼
                        ┌─────┴─────┐
                        │  Empty?    │
                        └─────┬─────┘
                              │ Yes
                              ▼
                    ┌──────────────────────┐
                    │ Show error:          │
                    │ "Please fill in all  │
                    │  fields"             │
                    └──────────┬───────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  END (Error) │
                        └──────────────┘
                              │ No
                              ▼
                    ┌──────────────────────┐
                    │ POST /api/auth/login │
                    │ {username, password} │
                    └──────────┬───────────┘
                               │
                    ┌──────────┴───────────┐
                    │ Response?            │
                    └────┬────────────┬────┘
                         │ OK (200)    │ Error (4xx/5xx)
                         ▼             ▼
            ┌──────────────────┐  ┌──────────────────────┐
            │ Credentials valid│  │ Invalid credentials  │
            │ Server returns:  │  │ or server error      │
            │ { token, user }   │  │ Response contains:   │
            └──────────┬────────┘  │ { error: "..." }     │
                       │           └──────────┬───────────┘
                       ▼                      │
            ┌──────────────────────┐         ▼
            │ Store session:       │  ┌──────────────────────┐
            │ - localStorage if    │  │ Show error message   │
            │   rememberMe checked │  │ in red below form    │
            │ - sessionStorage     │  └──────────┬───────────┘
            │   otherwise          │             │
            │ Session object:      │             ▼
            │ { username, name,    │  ┌──────────────┐
            │   role, email,       │  │  END (Error) │
            │   token, loginTime } │  └──────────────┘
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ Redirect based on    │
            │ user.role:           │
            │ - admin →            │
            │   dashboard_admin.html │
            │ - student →          │
            │   dashboard_user.html │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  END (Success →      │
            │  Dashboard Load)     │
            └──────────────────────┘
```

---

## 2. Admin Dashboard (`dashboard_admin.html`) - Activity Diagram

```
START
 │
 ▼
┌──────────────────────────────┐
│ Page Load (dashboard_admin) │
│ - Check authentication      │
│   (getCurrentUser())        │
└─────────────┬────────────────┘
              │
    ┌─────────┴──────────┐
    │ Authenticated?     │
    └────┬───────────────┘
         │ Yes             No → Redirect to index.html
         ▼
┌──────────────────────────────┐
│ Initialize Dashboard:        │
│ 1. initDashboard()           │
│    - Set userName, userRole  │
│    - Set userInitials        │
│    - initSidebar()           │
│ 2. Show section based on     │
│    URL hash (default:        │
│    'dashboard')              │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│ loadAdminData()              │
│ - Promise.all([              │
│     loadStats(),             │
│     loadStudents(),          │
│     loadRooms(),             │
│     loadComplaints(),        │
│     loadNotices()            │
│   ])                         │
└─────────────┬────────────────┘
              │
        ┌─────┴─────┐
        │All loads  │
        │succeeded? │
        └─────┬─────┘
              │ Yes              No (any fails)
              ▼                  ▼
    ┌─────────────────┐   ┌──────────────┐
    │ Dashboard ready │   │ Show toast   │
    │ - Stats cards   │   │ error for   │
    │   populated     │   │ failed load │
    │ - Students table│   │ (console.log)│
    │   populated     │   └──────┬───────┘
    │ - Rooms table   │          │
    │   populated     │          ▼
    │ - Complaints    │   ┌──────────────┐
    │   table         │   │ Dashboard    │
    │ - Notices list  │   │ still loads  │
    │   populated     │   │ (partial     │
    └────────┬────────┘   │  data shown) │
             │            └──────┬───────┘
             ▼                   │
    ┌──────────────────────┐    │
    │ User can now interact│    │
    │ with UI elements     │    │
    └──────────┬───────────┘    │
               │                │
    ┌──────────┴────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ USER INTERACTION BRANCHES                │
├─────────────────────────────────────────┤
│                                          │
│ A) NAVIGATION (Sidebar clicks)          │
│   ┌─────────────────────────────┐       │
│   │ User clicks nav item:       │       │
│   │ - Dashboard (overview)      │       │
│   │ - Students                  │       │
│   │ - Rooms                     │       │
│   │ - Complaints                │       │
│   │ - Notices                   │       │
│   └──────────┬──────────────────┘       │
│              │                           │
│              ▼                           │
│   ┌─────────────────────────────┐       │
│   │ showSection(sectionName)   │       │
│   │ - Hide all sections        │       │
│   │ - Show selected section    │       │
│   │ - Update URL hash          │       │
│   │ - Update active nav state  │       │
│   └──────────┬──────────────────┘       │
│              │                           │
│              ▼                           │
│   ┌─────────────────────────────┐       │
│   │ Section visible            │       │
│   └──────────┬──────────────────┘       │
│              │                           │
│   ┌──────────┴───────────────────────────┘
│   │
│   ▼
│
│ B) STUDENT MANAGEMENT
│   ┌─────────────────────────────┐
│   │ Click "Add Student" button │
│   └──────────┬──────────────────┘
│              │
│              ▼
│   ┌─────────────────────────────┐
│   │ openModal('addStudentModal')│
│   │ - Reset form fields        │
│   │ - Clear room dropdown      │
│   └──────────┬──────────────────┘
│              │
│              ▼
│   ┌─────────────────────────────┐
│   │ User fills form:           │
│   │ - Full Name                │
│   │ - Phone                    │
│   │ - Floor (select)           │
│   │ - Room (filtered by floor) │
│   │ - Username                 │
│   │ - Password                 │
│   └──────────┬──────────────────┘
│              │
│              ▼
│   ┌─────────────────────────────┐
│   │ Click "Add Student" modal  │
│   │ button                     │
│   └──────────┬──────────────────┘
│              │
│    ┌─────────┴──────────┐
│    │ All required       │
│    │ fields filled?     │
│    └────┬───────────────┘
│         │ Yes           No
│         ▼                ▼
│   ┌─────────────┐  ┌─────────────┐
│   │ Call        │  │ Show toast  │
│   │ addStudent()│  │ "Please fill│
│   │             │  │  all fields"│
│   └──────┬──────┘  │ error       │
│          │         └──────┬──────┘
│          ▼                │
│   ┌─────────────────────┐ │
│   │ POST /api/data/    │ │
│   │ students           │ │
│   │ {formData}         │ │
│   └──────┬─────────────┘ │
│          │                │
│    ┌─────┴────────────┐  │
│    │ Response OK?      │  │
│    └────┬──────────────┘  │
│         │ Yes      No      │
│         ▼         ▼        │
│   ┌─────────┐ ┌─────────┐ │
│   │Close    │ │Show toast│ │
│   │modal,   │ │"Failed"  │ │
│   │reset &  │ │error     │ │
│   │refresh  │ └────┬─────┘ │
│   │list     │      │       │
│   └─────────┘      │       │
│        │           │       │
│        └───────────┴───────┘
│                     │
│
│ C) ROOM OPERATIONS
│   ┌─────────────────────────────┐
│   │ Click "Add Room" button     │
│   └──────────┬──────────────────┘
│              │
│              ▼
│   ┌─────────────────────────────┐
│   │ openModal('addRoomModal')  │
│   │ - Reset form               │
│   └──────────┬──────────────────┘
│              │
│              ▼
│   ┌─────────────────────────────┐
│   │ Fill: room number, floor,  │
│   │ capacity, status           │
│   └──────────┬──────────────────┘
│              │
│              ▼
│   ┌─────────────────────────────┐
│   │ Click "Add Room"           │
│   └──────────┬──────────────────┘
│              │
│    ┌─────────┴──────────┐
│    │ All required filled?│
│    └────┬───────────────┘
│         │ Yes           No
│         ▼                ▼
│   ┌─────────────┐  ┌─────────────┐
│   │ POST        │  │ Show toast  │
│   │ /api/data/  │  │ error       │
│   │ rooms       │  └──────┬──────┘
│   └──────┬──────┘         │
│          │                 │
│    ┌─────┴────────────┐    │
│    │ Response OK?      │    │
│    └────┬──────────────┘    │
│         │ Yes      No       │
│         ▼         ▼         │
│   ┌─────────┐ ┌─────────┐   │
│   │Close    │ │Show toast│   │
│   │modal,   │ │"Failed"  │   │
│   │reset &  │ │error     │   │
│   │refresh  │ └────┬─────┘   │
│   │list     │      │          │
│   └─────────┘      │          │
│        │           │          │
│        └───────────┴──────────┘
│                     │
│
│ D) COMPLAINT MANAGEMENT
│   ┌─────────────────────────────┐
│   │ View complaints table      │
│   │ - Each row has buttons     │
│   └──────────┬──────────────────┘
│              │
│    ┌─────────┴─────────────┐
│    │ Click "View" button?  │
│    └────┬──────────────┬───┘
│         │ Yes          │ No
│         ▼              ▼
│   ┌─────────────┐  ┌─────────────┐
│   │ viewComplaint│ │ Click       │
│   │ (id)        │  │ "Update"    │
│   │             │  │ button      │
│   │ GET /api/   │  └──────┬──────┘
│   │ data/       │         │
│   │ complaints/ │         ▼
│   │ :id         │  ┌─────────────┐
│   │             │  │ updateComplaint│
│   │ Show details│  │ (id)        │
│   │ in modal    │  │            │
│   └──────┬──────┘  │ GET /api/ │
│          │          │ data/     │
│          │          │ complaints│
│          │          │ /:id      │
│          │          └─────┬─────┘
│          │                │
│          │                ▼
│          │          ┌─────────────┐
│          │          │ Open modal  │
│          │          │ with form:  │
│          │          │ - Status    │
│          │          │   (select) │
│          │          │ - Resolution│
│          │          │   notes    │
│          │          └─────┬─────┘
│          │                │
│          │                ▼
│          │          ┌─────────────┐
│          │          │ Click "Save"│
│          │          └─────┬───────┘
│          │                │
│          │                ▼
│          │          ┌─────────────┐
│          │          │ Validate    │
│          │          │ status is   │
│          │          │ selected    │
│          │          └─────┬───────┘
│          │                │
│          │        ┌───────┴───────┐
│          │        │ Valid?        │
│          │        └───────┬───────┘
│          │                │ Yes
│          │                ▼
│          │          ┌─────────────┐
│          │          │ PUT /api/   │
│          │          │ data/       │
│          │          │ complaints/│
│          │          │ :id         │
│          │          │ {status,    │
│          │          │  resolution│
│          │          │  notes}     │
│          │          └─────┬───────┘
│          │                │
│          │         ┌───────┴────────┐
│          │         │ Response OK?   │
│          │         └───────┬────────┘
│          │                 │ Yes      No
│          │                 ▼          ▼
│          │           ┌─────────┐  ┌─────────┐
│          │           │ Close   │  │ Show    │
│          │           │ modal & │  │ toast   │
│          │           │ refresh │  │ error   │
│          │           │ list    │  └────┬────┘
│          │           └────┬────┘       │
│          │                │            │
│          └────────────────┴────────────┘
│
│ E) NOTICE MANAGEMENT
│   ┌─────────────────────────────┐
│   │ View notices list           │
│   └──────────┬──────────────────┘
│              │
│    ┌─────────┴─────────────┐
│    │ Click "Add Notice"    │
│    │ button?               │
│    └────┬──────────────┬───┘
│         │ Yes          │ No
│         ▼              ▼
│   ┌─────────────┐  ┌─────────────┐
│   │ openModal(  │  │ (other UI   │
│   │ 'addNotice  │  │  actions)   │
│   │  Modal')    │  └──────┬──────┘
│   │             │         │
│   │ - Reset form│         │
│   └──────┬──────┘         │
│          │                 │
│          ▼                 │
│   ┌─────────────┐          │
│   │ Fill form:  │          │
│   │ - Title     │          │
│   │ - Content   │          │
│   │ - Priority  │          │
│   │   (normal/  │          │
│   │   important/│          │
│   │   urgent)   │          │
│   └──────┬──────┘          │
│          │                  │
│          ▼                  │
│   ┌─────────────┐          │
│   │ Click       │          │
│   │ "Publish    │          │
│   │  Notice"    │          │
│   │ button      │          │
│   └──────┬──────┘          │
│          │                  │
│    ┌─────┴──────────┐       │
│    │ All required   │       │
│    │ fields?        │       │
│    └────┬───────────┘       │
│         │ Yes    No          │
│         ▼         ▼          │
│   ┌─────────┐ ┌─────────┐    │
│   │POST     │ │Show toast│   │
│   │/api/data│ │"Please   │   │
│   │/notices │ │fill all" │   │
│   └────┬────┘ └────┬────┘    │
│         │           │         │
│   ┌─────┴───────────┴─────┐   │
│   │ Response OK?           │   │
│   └────┬───────────────────┘   │
│         │ Yes       No         │
│         ▼          ▼           │
│   ┌─────────┐  ┌─────────┐    │
│   │Close    │  │Show toast│   │
│   │modal,   │  │"Failed"  │   │
│   │reset    │  │error     │   │
│   │& refresh│  └────┬─────┘   │
│   │list     │       │          │
│   └─────────┘       │          │
│        │            │          │
│        └────────────┴──────────┘
│                     │
│
│ F) LOGOUT
│   ┌─────────────────────────────┐
│   │ Click "Logout" button       │
│   └──────────┬──────────────────┘
│              │
│              ▼
│   ┌─────────────────────┐
│   │ logout() function  │
│   │ - Remove hms_session│
│   │   from localStorage │
│   │   & sessionStorage │
│   └──────────┬──────────┘
│              │
│              ▼
│   ┌─────────────────────┐
│   │ Redirect to:        │
│   │ ../index.html       │
│   │ (login page)        │
│   └──────────┬──────────┘
│              │
│              ▼
│   ┌──────────────┐
│   │  END         │
│   └──────────────┘
└───────────────────────┘
```

---

## 2. Admin Dashboard Decision Tree Summary

```
Main Flow:
Page Load → Auth Check → Load All Data → Ready for Interaction

Interaction Branches:
├─ Navigation (5 sections)
│  ├─ Dashboard (overview only)
│  ├─ Students (list + CRUD)
│  │  ├─ View student details
│  │  ├─ Add new student
│  │  ├─ Edit student (change room/phone)
│  │  └─ Delete student
│  ├─ Rooms (list + CRUD)
│  │  ├─ View room list
│  │  ├─ Add new room
│  │  └─ Delete room
│  ├─ Complaints (view only)
│  │  ├─ View complaint details
│  │  └─ Update status/resolution
│  ├─ Notices (CRUD)
│  │  ├─ View notices
│  │  ├─ Add new notice
│  │  └─ Delete notice
│  └─ Settings (placeholder)
└─ Logout → Return to login
```

---

## 3. Student Dashboard (`dashboard_user.html`) - Activity Diagram

```
START
 │
 ▼
┌──────────────────────────────┐
│ Page Load                    │
│ (dashboard_user.html)        │
└─────────────┬────────────────┘
              │
    ┌─────────┴──────────┐
    │ Auth check:        │
    │ getCurrentUser()   │
    └────┬───────────────┘
         │ Authenticated?
         ▼ Yes             No → Redirect to index.html
┌──────────────────────────────┐
│ initDashboard()              │
│ - Display user name/role     │
│ - initSidebar()              │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│ loadUserData()               │
│ - Promise.all([              │
│     loadUserProfile(),       │
│     loadUserComplaints(),    │
│     loadNotices()            │
│   ])                         │
└─────────────┬────────────────┘
              │
        ┌─────┴─────┐
        │All loads  │
        │succeeded? │
        └─────┬─────┘
              │ Yes              No (any fails)
              ▼                  ▼
    ┌─────────────────┐   ┌──────────────┐
    │ Dashboard ready │   │ Show toast   │
    │ - Profile stats │   │ error for    │
    │   (room #,      │   │ failed load  │
    │   floor, fee)   │   │ (console.log)│
    │ - Recent        │   └──────┬───────┘
    │   complaints    │          │
    │   list          │          ▼
    │ - Notices       │   ┌──────────────┐
    │   list          │   │ Dashboard    │
    └────────┬────────┘   │ still loads  │
             │            │ (partial     │
             │            │  data shown) │
             │            └──────┬───────┘
             │                   │
             ▼                   │
    ┌──────────────────────────────┐
    │ User can now interact       │
    │ with UI elements            │
    └──────────┬───────────────────┘
               │
    ┌──────────┴────────────────────────────┐
    │                                        │
    ▼                                        ▼
┌──────────────────┐                ┌──────────────────────┐
│ NAVIGATION       │                │ PROFILE VIEW         │
│ Branches:        │                │ (default on load)    │
│                  │                │ - Admission number   │
│ • Dashboard      │                │ - Full name          │
│   (shows all     │                │ - Email              │
│    except profile)│                │ - Phone              │
│                  │                │ - Room + Floor       │
│ • Profile        │                │ - Fee status: Paid   │
│   (show detailed│                └──────────┬───────────┘
│    profile)     │                           │
│                  │                           │
│ • Notices        │                           ▼
│   (view list)   │                ┌──────────────────────┐
│                  │                │ User sees their      │
│ • Complaints     │                │ allocated room and   │
│   (view + add)  │                │ floor information    │
│                  │                └──────────────────────┘
│ OR click sidebar │
│ items to switch  │
│ sections         │
└────────┬─────────┘                ┌──────────────────────┐
         │                           │ COMPLAINT OPERATIONS │
         ▼                           └──────────┬───────────┘
┌─────────────────────────────┐                │
│ SECTION CHANGE LOGIC        │                │
│ showSection('profile')      │                ▼
│ showSection('notices')      │   ┌─────────────────────────────┐
│ showSection('complaints')   │   │ View "My Complaints" table  │
│ showSection('dashboard')    │   └──────────┬──────────────────┘
└────────────┬────────────────┘              │
             │                               │
    ┌────────┴────────┐                      │
    │ Section         │                      ▼
    │ visibility      │   ┌─────────────────────────────┐
    │ toggled via     │   │ Click "New Complaint"       │
    │ display: none   │   │ button?                     │
    │ or block        │   └──────────┬──────────────────┘
    └────────┬────────┘              │ Yes                 No
             │                       ▼                     ▼
             ▼              ┌──────────────┐      ┌──────────────┐
    ┌─────────────────────┐│ openModal(   │      │ (no action,  │
    │ Section content     ││ 'complaint   │      │ just view)   │
    │ visible to user     ││  Modal')     │      └──────────────┘
    └─────────────────────┘└──────┬───────┘
             │                    │
             │                    ▼
             │          ┌─────────────────────┐
             │          │ Modal shows form:   │
             │          │ - Category select   │
             │          │   · Plumbing        │
             │          │   · Electrical      │
             │          │   · Furniture       │
             │          │   · Cleaning        │
             │          │   · Noise           │
             │          │   · Other           │
             │          │ - Description text  │
             │          │   area              │
             │          └──────┬───────────────┘
             │                 │
             │                 ▼
             │          ┌─────────────────────┐
             │          │ Fill form & click   │
             │          │ "Submit Complaint"   │
             │          └──────┬───────────────┘
             │                 │
             │        ┌─────────┴─────────┐
             │        │ All required      │
             │        │ fields filled?    │
             │        └────┬──────────────┘
             │             │ Yes            No
             │             ▼                ▼
             │       ┌───────────┐   ┌───────────┐
             │       │ Call      │   │ Show toast│
             │       │           │   │ "Please   │
             │       │ submitCom-│   │ fill all" │
             │       │ plaint()  │   │ error     │
             │       │           │   └─────┬─────┘
             │       └─────┬─────┘         │
             │             │                │
             │       ┌─────┴────────────┐   │
             │       │ Inside           │   │
             │       │ submitComplaint: │   │
             │       │ 1. GET /api/data/│   │
             │       │    students      │   │
             │       │ 2. Find student  │   │
             │       │    by user.email │   │
             │       │ 3. POST /api/data│   │
             │       │    /complaints   │   │
             │       └─────┬────────────┘   │
             │             │                  │
             │       ┌─────┴───────────┐      │
             │       │ Response OK?     │      │
             │       └────┬─────────────┘      │
             │            │ Yes       No       │
             │            ▼           ▼        │
             │      ┌───────────┐ ┌───────────┐│
             │      │ Close     │ │ Show toast││
             │      │ modal,    │ │ "Failed"  ││
             │      │ reset &   │ │ error     ││
             │      │ refresh   │ └─────┬─────┘│
             │      │ list      │       │      │
             │      └───────────┘       │      │
             │           │              │      │
             │           └──────────────┴──────┘
             │                         │
             ▼                         ▼
    ┌─────────────────────┐   ┌──────────────────────┐
    │ Other interactions  │   │ LOGOUT               │
    │ - View notice       │   │ (if clicked)         │
    │   details (future)  │   └──────────┬───────────┘
    │ - Edit profile      │              │
    │   (future)          │              ▼
    │ - Make payment      │   ┌─────────────────────┐
    │   (future)          │   │ logout()            │
    └─────────────────────┘   │ - Clear localStorage│
                              │ - Clear sessionStorage│
                              │ - Redirect to        │
                              │   index.html         │
                              └──────────┬───────────┘
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │  END         │
                                  └──────────────┘
└───────────────────────────────────────────────┘
```

---

## 4. Notice Display (Read-Only View) - Activity Diagram

```
START (User on any dashboard page)
 │
 ▼
┌──────────────────────────────┐
│ Dashboard loads              │
│ - Notices API called:        │
│   GET /api/data/notices      │
└─────────────┬────────────────┘
              │
         ┌────┴────┐
         │Response │
         │received?│
         └────┬────┘
              │ Yes           No (error)
              ▼               ▼
    ┌─────────────────┐  ┌──────────────┐
    │ Parse notices   │  │ Show empty   │
    │ array from      │  │ state or     │
    │ response        │  │ error msg    │
    └────────┬────────┘  └──────┬───────┘
             │                  │
             ▼                  │
    ┌─────────────────────┐     │
    │ For each notice,    │     │
    │ render HTML:        │     │
    │ - Notice date       │     │
    │ - Title             │     │
    │ - Content snippet   │     │
    │   (truncated)       │     │
    │ - Action buttons    │     │
    │   (if admin: edit   │     │
    │    & delete)        │     │
    └──────────┬──────────┘     │
               │                │
               ▼                │
    ┌─────────────────────┐     │
    │ User can:           │     │
    │ - Read notice       │     │
    │ - Scroll through    │     │
    │   list              │     │
    └──────────┬──────────┘     │
               │                │
    ┌──────────┴───────────────┘
    │
    ▼
┌──────────────────────────────┐
│ Are there action buttons?    │
│ (Admin only: edit/delete)    │
└──────┬───────────────────────┘
       │ Yes                     No
       ▼                         ▼
┌──────────────┐         ┌──────────────┐
│ Admin clicks │         │ Student view │
│ "Edit" or    │         │ only - read  │
│ "Delete"?    │         │ only        │
└──────┬───────┘         └──────┬──────┘
       │                        │
       ▼                        │
┌──────────────┐                │
│ Edit opens   │                │
│ "coming soon"│                │
│ toast        │                │
└──────┬───────┘                │
       │                        │
└──────┴────────────────────────┘
       │
       ▼
┌──────────────┐
│  END         │
└──────────────┘
```

---

## 5. Error & Edge Cases - Universal Branches

All pages share these common error branches:

```
┌─────────────────────────────────────────────────────┐
│ ANY PAGE with API calls                            │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ API Request Made                                   │
└────────────────┬────────────────────────────────────┘
                 │
         ┌───────┴────────┐
         │ Network error? │
         └───────┬────────┘
                 │ Yes              No
                 ▼                  ▼
    ┌───────────────────┐  ┌──────────────────┐
    │ No internet /     │  │ Response status  │
    │ server down       │  │ < 200 or >= 300? │
    │ → Show toast:     │  └──────┬───────────┘
    │ "Unable to connect│         │ Yes           No
    │  to server"       │         ▼               ▼
    └───────────────────┘ ┌─────────────┐  ┌─────────────┐
                          │Show error   │  │Process      │
                          │from         │  │response     │
                          │response.err │  │data         │
                          └──────┬──────┘  └──────┬──────┘
                                 │                 │
                                 └────────┬────────┘
                                          │
                                          ▼
                                 ┌──────────────────┐
                                 │ Update UI:       │
                                 │ - Show toast     │
                                 │ - Log to console │
                                 │ - Display fallback│
                                 └──────────────────┘
```

---

## Legend

- **┌─────┐** - Start/End of process
- **│** - Flow line
- **└──┬─┘** - Connector or decision diamond
- **▼** - Flow direction
- **├─ / └─** - Branch connectors
- **Decision nodes** (e.g., "Authenticated?", "All required fields?") split flow into Yes/No paths
- **API calls** are shown as actions (POST/GET/PUT)
- **UI actions** (clicks, form fills) are user-triggered events
- **Toast messages** provide feedback to user

## Design Principles Applied

1. **Single Entry, Single Exit** - Each diagram starts at `START` and ends at `END`
2. **Tree Structure** - Main vertical flow with horizontal branching at decision points
3. **Human-Readable** - Clear English descriptions, not code
4. **Complete Coverage** - All user interactions represented
5. **Error Paths** - Invalid inputs and failures handled separately
6. **Merge Points** - Branches converge back to main flow
