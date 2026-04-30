// ============================================
// Admin Dashboard Specific JavaScript
// ============================================

const DATA_API_BASE_URL = 'http://127.0.0.1:3000/api/data';
let roomsData = []; // Store rooms data for dropdown

document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
    
    // Initialize theme
    initTheme();
    
    // Setup floor change listener for room dropdown
    const floorSelect = document.getElementById('studentFloor');
    const roomSelect = document.getElementById('studentRoom');
    
    if (floorSelect && roomSelect) {
        floorSelect.addEventListener('change', function() {
            const selectedFloor = this.value;
            filterRoomsByFloor(selectedFloor, roomSelect);
        });
    }
    
    // Theme selector change handler
    const themeSelect = document.getElementById('settingsTheme');
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            saveTheme(this.value);
            showToast('Theme updated!', 'success');
        });
    }
    
    loadAdminData();
    const hash = window.location.hash.slice(1) || 'dashboard';
    showSection(hash);
});

window.addEventListener('hashchange', function() {
    const hash = window.location.hash.slice(1) || 'dashboard';
    showSection(hash);
});

function filterRoomsByFloor(floor, roomSelect) {
    if (!floor) {
        roomSelect.innerHTML = '<option value="">Select Room</option>';
        return;
    }
    
    // Filter rooms by floor and available status
    const filteredRooms = roomsData.filter(r => r.floor === parseInt(floor) && r.status === 'available');
    
    roomSelect.innerHTML = '<option value="">Select Room</option>' +
        filteredRooms.map(room => 
            `<option value="${room.id}">Room ${room.room_number} (Capacity: ${room.capacity})</option>`
        ).join('');
}

async function loadAdminData() {
    const user = getCurrentUser();
    if (!user) return;
    
    await Promise.all([
        loadStats(),
        loadStudents(),
        loadRooms(),
        loadComplaints(),
        loadNotices()
    ]);
}

async function loadStats() {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/stats`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch stats');
        const stats = await response.json();
        
        const totalStudentsEl = document.getElementById('totalStudents');
        const occupiedRoomsEl = document.getElementById('occupiedRooms');
        const pendingComplaintsEl = document.getElementById('pendingComplaints');
        
        if (totalStudentsEl) totalStudentsEl.textContent = stats.totalStudents || 0;
        if (occupiedRoomsEl) occupiedRoomsEl.textContent = stats.occupiedRooms || 0;
        if (pendingComplaintsEl) pendingComplaintsEl.textContent = stats.pendingComplaints || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadStudents() {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/students`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch students');
        const students = await response.json();
        studentsData = students;
        
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;
        
        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No students found</td></tr>';
            return;
        }
        
        tbody.innerHTML = students.map(s => `
            <tr>
                <td>#${s.admission_number}</td>
                <td>${s.first_name} ${s.last_name}</td>
                <td>${s.room_number || '-'}</td>
                <td>${s.email}</td>
                <td><span class="badge badge-success">Active</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn view" title="View" onclick="viewStudent(${s.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="7" r="3"></circle>
                            </svg>
                        </button>
                        <button class="action-btn edit" title="Edit" onclick="editStudent(${s.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="action-btn delete" title="Delete" onclick="deleteStudent(${s.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

async function loadRooms() {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/rooms`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch rooms');
        const rooms = await response.json();
        
        // Store rooms globally for student form dropdown
        roomsData = rooms;
        
        const tbody = document.getElementById('roomsTableBody');
        if (!tbody) return;
        
        if (rooms.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No rooms found</td></tr>';
            return;
        }
        
        const statusMap = {
            'available': '<span class="badge badge-info">Available</span>',
            'full': '<span class="badge badge-success">Occupied</span>',
            'maintenance': '<span class="badge badge-warning">Maintenance</span>'
        };
        
        tbody.innerHTML = rooms.map(r => `
            <tr>
                <td>${r.room_number}</td>
                <td>${r.floor}${getOrdinal(r.floor)} Floor</td>
                <td>${r.capacity === 1 ? 'Single' : r.capacity === 2 ? 'Double' : 'Triple'}</td>
                <td>${r.capacity}</td>
                <td>${r.current_occupancy}</td>
                <td>${statusMap[r.status] || r.status}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit" title="Edit" onclick="editRoom(${r.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="action-btn delete" title="Delete" onclick="deleteRoom(${r.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

async function loadComplaints() {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/complaints`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch complaints');
        const complaints = await response.json();
        
        const tbody = document.getElementById('complaintsTableBody');
        if (!tbody) return;
        
        if (complaints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No complaints found</td></tr>';
            return;
        }
        
        const statusMap = {
            'pending': '<span class="badge badge-danger">Pending</span>',
            'in_progress': '<span class="badge badge-warning">In Progress</span>',
            'resolved': '<span class="badge badge-success">Resolved</span>',
            'rejected': '<span class="badge badge-secondary">Rejected</span>'
        };
        
        tbody.innerHTML = complaints.map(c => `
            <tr>
                <td>#C${c.id}</td>
                <td>${c.first_name} ${c.last_name}</td>
                <td>${c.category}</td>
                <td>${c.description.substring(0, 30)}...</td>
                <td>${new Date(c.created_at).toLocaleDateString()}</td>
                <td>${statusMap[c.status]}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn view" title="View" onclick="viewComplaint(${c.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        <button class="action-btn edit" title="Update" onclick="updateComplaint(${c.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading complaints:', error);
    }
}

async function loadNotices() {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/notices`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch notices');
        const notices = await response.json();
        
        const noticeList = document.getElementById('noticesList');
        if (!noticeList) return;
        
        if (notices.length === 0) {
            noticeList.innerHTML = '<p style="text-align:center;padding:20px;color:#999;">No notices found</p>';
            return;
        }
        
        noticeList.innerHTML = notices.map(n => `
            <div class="notice-item-admin">
                <div class="notice-content">
                    <h4>${n.title}</h4>
                    <p>${n.content}</p>
                    <span class="notice-meta">Posted on: ${new Date(n.created_at).toLocaleDateString()}</span>
                </div>
                <div class="action-btns">
                    <button class="action-btn edit" title="Edit" onclick="editNotice(${n.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="action-btn delete" title="Delete" onclick="deleteNotice(${n.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading notices:', error);
    }
}

function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

async function addStudent() {
    const name = document.getElementById('studentName').value;
    const phone = document.getElementById('studentPhone').value;
    const roomId = document.getElementById('studentRoom').value;
    const username = document.getElementById('studentUsername').value;
    const password = document.getElementById('studentPassword').value;
    
    if (!name || !phone || !roomId || !username || !password) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;
    
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                username,
                password,
                firstName,
                lastName,
                email: `${username}@hms.local`, // Auto-generate email from username
                phone,
                admissionNumber: 'STU' + Date.now(),
                roomId: parseInt(roomId)
            })
        });
        
        if (!response.ok) throw new Error('Failed to add student');
        
        showToast('Student added successfully! Student can now login with provided credentials', 'success');
        closeModal('addStudentModal');
        document.getElementById('addStudentForm').reset();
        loadStudents();
    } catch (error) {
        console.error('Error adding student:', error);
        showToast('Failed to add student', 'error');
    }
}

let confirmCallback = null;

function showConfirm(title, message, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = callback;
    openModal('confirmModal');
}

function executeConfirmAction() {
    closeModal('confirmModal');
    if (confirmCallback) {
        confirmCallback();
        confirmCallback = null;
    }
}

async function deleteStudent(studentId) {
    showConfirm('Delete Student', 'Are you sure you want to delete this student?', async () => {
        try {
            const response = await fetch(`${DATA_API_BASE_URL}/students/${studentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            
            if (!response.ok) throw new Error('Failed to delete student');
            
            showToast('Student deleted successfully!', 'success');
            loadStudents();
            loadStats();
        } catch (error) {
            console.error('Error deleting student:', error);
            showToast('Failed to delete student', 'error');
        }
    });
}

async function addRoom() {
    const roomNumber = document.getElementById('roomNumber').value;
    const floor = document.getElementById('roomFloor').value;
    const capacity = document.getElementById('roomCapacity').value;
    const status = document.getElementById('roomStatus').value;
    
    if (!roomNumber || !floor || !capacity || !status) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/rooms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                roomNumber,
                floor: parseInt(floor),
                capacity: parseInt(capacity),
                status
            })
        });
        
        if (!response.ok) throw new Error('Failed to add room');
        
        showToast('Room added successfully!', 'success');
        closeModal('addRoomModal');
        document.getElementById('addRoomForm').reset();
        loadRooms();
    } catch (error) {
        console.error('Error adding room:', error);
        showToast('Failed to add room', 'error');
    }
}

async function deleteRoom(roomId) {
    showConfirm('Delete Room', 'Are you sure you want to delete this room?', async () => {
        try {
            const response = await fetch(`${DATA_API_BASE_URL}/rooms/${roomId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            
            if (!response.ok) throw new Error('Failed to delete room');
            
            showToast('Room deleted successfully!', 'success');
            loadRooms();
            loadStats();
        } catch (error) {
            console.error('Error deleting room:', error);
            showToast('Failed to delete room', 'error');
        }
    });
}

async function addNotice() {
    const title = document.getElementById('noticeTitle').value;
    const content = document.getElementById('noticeContent').value;
    
    if (!title || !content) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const user = getCurrentUser();
    
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/notices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                title,
                content,
                priority: 'normal'
            })
        });
        
        if (!response.ok) throw new Error('Failed to add notice');
        
        showToast('Notice published successfully!', 'success');
        closeModal('addNoticeModal');
        document.getElementById('addNoticeForm').reset();
        loadNotices();
    } catch (error) {
        console.error('Error adding notice:', error);
        showToast('Failed to add notice', 'error');
    }
}

async function deleteNotice(noticeId) {
    showConfirm('Delete Notice', 'Are you sure you want to delete this notice?', async () => {
        try {
            const response = await fetch(`${DATA_API_BASE_URL}/notices/${noticeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            
            if (!response.ok) throw new Error('Failed to delete notice');
            
            showToast('Notice deleted successfully!', 'success');
            loadNotices();
        } catch (error) {
            console.error('Error deleting notice:', error);
            showToast('Failed to delete notice', 'error');
        }
    });
}

async function updateComplaint(complaintId) {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/complaints/${complaintId}`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch complaint');
        const complaint = await response.json();
        
        document.getElementById('updateComplaintId').value = complaint.id;
        document.getElementById('updateComplaintStatus').value = complaint.status;
        openModal('updateComplaintModal');
    } catch (error) {
        console.error('Error updating complaint:', error);
        showToast('Failed to load complaint data', 'error');
    }
}

async function saveComplaintStatus() {
    const complaintId = document.getElementById('updateComplaintId').value;
    const status = document.getElementById('updateComplaintStatus').value;
    const resolutionNotes = document.getElementById('resolutionNotes').value;
    
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/complaints/${complaintId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ status, resolutionNotes })
        });
        
        if (!response.ok) throw new Error('Failed to update complaint');
        
        showToast('Complaint status updated!', 'success');
        closeModal('updateComplaintModal');
        loadComplaints();
        loadStats();
    } catch (error) {
        console.error('Error updating complaint:', error);
        showToast('Failed to update complaint', 'error');
    }
}

async function viewStudent(studentId) {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/students/${studentId}`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch student');
        const student = await response.json();
        
        const content = document.getElementById('viewStudentContent');
        content.innerHTML = `
            <div class="detail-item">
                <label>Admission Number</label>
                <span>${student.admission_number}</span>
            </div>
            <div class="detail-item">
                <label>Full Name</label>
                <span>${student.first_name} ${student.last_name}</span>
            </div>
            <div class="detail-item">
                <label>Email</label>
                <span>${student.email}</span>
            </div>
            <div class="detail-item">
                <label>Phone</label>
                <span>${student.phone}</span>
            </div>
            <div class="detail-item">
                <label>Room Number</label>
                <span>${student.room_number || 'Not Assigned'}</span>
            </div>
            <div class="detail-item">
                <label>Floor</label>
                <span>${student.floor ? student.floor + getOrdinal(student.floor) + ' Floor' : 'Not Assigned'}</span>
            </div>
            <div class="detail-item">
                <label>Status</label>
                <span><span class="badge badge-success">Active</span></span>
            </div>
        `;
        openModal('viewStudentModal');
    } catch (error) {
        console.error('Error viewing student:', error);
        showToast('Failed to load student details', 'error');
    }
}

async function editStudent(studentId) {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/students/${studentId}`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch student');
        const student = await response.json();
        
        document.getElementById('editStudentId').value = student.id;
        document.getElementById('editStudentName').value = `${student.first_name} ${student.last_name}`;
        document.getElementById('editStudentPhone').value = student.phone;
        document.getElementById('editStudentStatus').value = 'active';
        
        const floorSelect = document.getElementById('editStudentFloor');
        const roomSelect = document.getElementById('editStudentRoom');
        
        floorSelect.innerHTML = '<option value="">Select Floor</option>';
        for (let i = 1; i <= 3; i++) {
            floorSelect.innerHTML += `<option value="${i}">${i}${getOrdinal(i)} Floor</option>`;
        }
        
        if (student.floor) {
            floorSelect.value = student.floor;
            const currentFloor = student.floor;
            const availableRooms = roomsData.filter(r => r.floor === currentFloor && r.status === 'available');
            const currentRoom = roomsData.find(r => r.room_number === student.room_number);
            if (currentRoom && currentRoom.status === 'full') {
                availableRooms.push(currentRoom);
            }
            roomSelect.innerHTML = '<option value="">Select Room</option>' +
                availableRooms.map(r => `<option value="${r.id}">Room ${r.room_number} (${r.capacity})</option>`).join('');
            roomSelect.value = currentRoom ? currentRoom.id : '';
        } else {
            filterRoomsByFloor('', roomSelect);
        }
        
        floorSelect.addEventListener('change', function() {
            filterRoomsByFloor(this.value, roomSelect);
        });
        
        openModal('editStudentModal');
    } catch (error) {
        console.error('Error editing student:', error);
        showToast('Failed to load student data', 'error');
    }
}

async function saveStudent() {
    const studentId = document.getElementById('editStudentId').value;
    const name = document.getElementById('editStudentName').value;
    const phone = document.getElementById('editStudentPhone').value;
    const roomId = document.getElementById('editStudentRoom').value;
    const status = document.getElementById('editStudentStatus').value;
    
    if (!name || !phone) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;
    
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/students/${studentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                firstName,
                lastName,
                phone,
                roomId: roomId ? parseInt(roomId) : null,
                status
            })
        });
        
        if (!response.ok) throw new Error('Failed to update student');
        
        showToast('Student updated successfully!', 'success');
        closeModal('editStudentModal');
        loadStudents();
        loadStats();
    } catch (error) {
        console.error('Error saving student:', error);
        showToast('Failed to update student', 'error');
    }
}

function editRoom(roomId) {
    console.log('Editing room:', roomId);
    showToast('Edit functionality coming soon', 'warning');
}

async function viewComplaint(complaintId) {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/complaints/${complaintId}`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch complaint');
        const complaint = await response.json();
        
        const statusMap = {
            'pending': '<span class="badge badge-danger">Pending</span>',
            'in_progress': '<span class="badge badge-warning">In Progress</span>',
            'resolved': '<span class="badge badge-success">Resolved</span>',
            'rejected': '<span class="badge badge-secondary">Rejected</span>'
        };
        
        const content = document.getElementById('viewComplaintContent');
        content.innerHTML = `
            <div class="detail-item">
                <label>Complaint ID</label>
                <span>#C${complaint.id}</span>
            </div>
            <div class="detail-item">
                <label>Student Name</label>
                <span>${complaint.first_name} ${complaint.last_name}</span>
            </div>
            <div class="detail-item">
                <label>Email</label>
                <span>${complaint.email}</span>
            </div>
            <div class="detail-item">
                <label>Category</label>
                <span>${complaint.category}</span>
            </div>
            <div class="detail-item" style="grid-column: span 2;">
                <label>Description</label>
                <span>${complaint.description}</span>
            </div>
            <div class="detail-item">
                <label>Status</label>
                <span>${statusMap[complaint.status]}</span>
            </div>
            <div class="detail-item">
                <label>Date</label>
                <span>${new Date(complaint.created_at).toLocaleDateString()}</span>
            </div>
            ${complaint.resolution_notes ? `
            <div class="detail-item" style="grid-column: span 2;">
                <label>Resolution Notes</label>
                <span>${complaint.resolution_notes}</span>
            </div>
            ` : ''}
        `;
        openModal('viewComplaintModal');
    } catch (error) {
        console.error('Error viewing complaint:', error);
        showToast('Failed to load complaint details', 'error');
    }
}

function editNotice(noticeId) {
    console.log('Editing notice:', noticeId);
    showToast('Edit functionality coming soon', 'warning');
}

function exportReport() {
    console.log('Exporting report...');
    showToast('Report exported successfully!', 'success');
}

function showSection(section) {
    if (!section) return;
    
    window.location.hash = section;
    
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const activeNav = document.querySelector(`.nav-item[onclick*="'${section}'"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
    
    const statsGrid = document.querySelector('.stats-grid');
    const noticesSection = document.getElementById('notices');
    const studentsSection = document.getElementById('students');
    const roomsSection = document.getElementById('rooms');
    const complaintsSection = document.getElementById('complaints');
    const settingsRequestsSection = document.getElementById('settings-requests');
    const settingsSection = document.getElementById('settings');
    
    if (section === 'dashboard') {
        if (statsGrid) statsGrid.style.display = 'grid';
        if (noticesSection) noticesSection.style.display = 'block';
        if (studentsSection) studentsSection.style.display = 'none';
        if (roomsSection) roomsSection.style.display = 'none';
        if (complaintsSection) complaintsSection.style.display = 'none';
        if (settingsRequestsSection) settingsRequestsSection.style.display = 'none';
        if (settingsSection) settingsSection.style.display = 'none';
    } else {
        if (statsGrid) statsGrid.style.display = 'none';
        if (noticesSection) noticesSection.style.display = 'none';
        if (studentsSection) studentsSection.style.display = 'none';
        if (roomsSection) roomsSection.style.display = 'none';
        if (complaintsSection) complaintsSection.style.display = 'none';
        if (settingsRequestsSection) settingsRequestsSection.style.display = 'none';
        if (settingsSection) settingsSection.style.display = 'none';
        
        if (section === 'students' && studentsSection) {
            studentsSection.style.display = 'block';
        } else if (section === 'rooms' && roomsSection) {
            roomsSection.style.display = 'block';
        } else if (section === 'complaints' && complaintsSection) {
            complaintsSection.style.display = 'block';
        } else if (section === 'notices' && noticesSection) {
            noticesSection.style.display = 'block';
        } else if (section === 'settings-requests' && settingsRequestsSection) {
            settingsRequestsSection.style.display = 'block';
            // Set filter to pending by default and load
            filterRequests('pending');
        } else if (section === 'settings' && settingsSection) {
            settingsSection.style.display = 'block';
            loadAdminSettings();
        }
    }
}

// ============================================
// Settings Requests Management
// ============================================

/**
 * Load all settings change requests
 * @param {string} filter - 'pending' or 'all'
 */
async function loadSettingsRequests(filter = 'pending') {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/settings-requests`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch requests');
        }
        
        const requests = await response.json();
        
        // Update pending count badge
        const pendingCount = requests.filter(r => r.status === 'pending').length;
        const pendingBadge = document.getElementById('pendingCount');
        if (pendingBadge) {
            pendingBadge.textContent = pendingCount;
            pendingBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
        }
        
        renderSettingsRequests(requests, filter);
    } catch (error) {
        console.error('Error loading settings requests:', error);
        document.getElementById('settingsRequestsTableBody').innerHTML = 
            '<tr><td colspan="9" style="text-align:center;color:var(--danger-color)">Failed to load requests</td></tr>';
    }
}

/**
 * Render settings requests table
 * @param {Array} requests - All requests from server
 * @param {string} filter - 'pending' or 'all'
 */
function renderSettingsRequests(requests, filter) {
    const tbody = document.getElementById('settingsRequestsTableBody');
    
    // Filter based on status
    let filteredRequests = requests;
    if (filter === 'pending') {
        filteredRequests = requests.filter(r => r.status === 'pending');
    }
    
    if (filteredRequests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--gray-500);padding:20px;">No requests found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredRequests.map(req => `
        <tr data-request-id="${req.id}">
            <td>#${req.id}</td>
            <td>
                <div class="user-info-cell">
                    <div class="user-avatar-small" style="width:28px;height:28px;font-size:0.7rem;background:linear-gradient(135deg,var(--primary-color),var(--secondary-color));display:flex;align-items:center;justify-content:center;border-radius:50%;color:white;font-weight:600;">
                        ${getInitials(req.requested_by_firstname + ' ' + req.requested_by_lastname)}
                    </div>
                    <span>${req.requested_by_username}</span>
                </div>
            </td>
            <td><span class="setting-type">${req.setting_type}</span></td>
            <td><code class="old-value">${req.old_value || '-'}</code></td>
            <td><code class="new-value">${req.new_value}</code></td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${req.reason || ''}">${req.reason || '-'}</td>
            <td><span class="request-status ${req.status}">${req.status}</span></td>
            <td>${new Date(req.created_at).toLocaleDateString()}</td>
            <td>
                ${req.status === 'pending' ? `
                    <div class="request-actions">
                        <button class="request-btn approve" onclick="approveRequest(${req.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Approve
                        </button>
                        <button class="request-btn reject" onclick="rejectRequest(${req.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Reject
                        </button>
                    </div>
                ` : `
                    <div class="request-processed">
                        ${req.reviewed_by_firstname ? `By: ${req.reviewed_by_firstname}` : ''}
                        ${req.review_notes ? `<br><small title="${req.review_notes}">${req.review_notes.substring(0,30)}...</small>` : ''}
                    </div>
                `}
            </td>
        </tr>
    `).join('');
}

/**
 * Approve a settings change request
 */
async function approveRequest(requestId) {
    if (!confirm('Approve this change? The user\'s settings will be updated immediately.')) {
        return;
    }
    
    const notes = prompt('Optional: Add review notes (e.g., reason for approval):', '');
    if (notes === null) return; // User cancelled
    
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/settings-requests/${requestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                status: 'approved',
                reviewNotes: notes
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to approve request');
        }
        
        showToast('Request approved successfully!', 'success');
        loadSettingsRequests(); // Refresh table
    } catch (error) {
        console.error('Error approving request:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Reject a settings change request
 */
async function rejectRequest(requestId) {
    if (!confirm('Reject this change request?')) {
        return;
    }
    
    const notes = prompt('Reason for rejection (required):', '');
    if (!notes || notes.trim() === '') {
        showToast('Please provide a reason for rejection', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/settings-requests/${requestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                status: 'rejected',
                reviewNotes: notes
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to reject request');
        }
        
        showToast('Request rejected', 'warning');
        loadSettingsRequests(); // Refresh table
    } catch (error) {
        console.error('Error rejecting request:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Filter requests by status
 * @param {string} filter - 'pending' or 'all'
 */
function filterRequests(filter) {
    // Update button active states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    loadSettingsRequests(filter);
}

// ============================================
// Admin Settings (Direct Update - No Approval Needed)
// ============================================

/**
 * Load current admin settings
 */
function loadAdminSettings() {
    // Theme preference from localStorage
    const savedTheme = localStorage.getItem('hms_theme') || 'light';
    const themeSelect = document.getElementById('settingsTheme');
    if (themeSelect) {
        themeSelect.value = savedTheme;
    }
}

/**
 * Admin can directly update their own settings
 */
function saveAdminSettings() {
    const currentPassword = document.getElementById('settingsCurrentPassword').value;
    const newPassword = document.getElementById('settingsNewPassword').value;
    const confirmPassword = document.getElementById('settingsConfirmPassword').value;
    const theme = document.getElementById('settingsTheme').value;

    // Validate passwords match
    if (newPassword && newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
    }

    const user = getCurrentUser();
    if (!user) {
        showToast('User not authenticated', 'error');
        return;
    }

    // If password change is requested, send to backend
    if (newPassword) {
        saveAdminPassword(currentPassword, newPassword, theme);
    } else {
        // Only theme change
        localStorage.setItem('hms_theme', theme);
        showToast('Settings updated successfully!', 'success');
    }
}

/**
 * Call backend to change admin password
 */
async function saveAdminPassword(currentPassword, newPassword, theme) {
    showToast('Updating password...', 'info');
    
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/change-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to change password');
        }
        
        // Save theme preference
        localStorage.setItem('hms_theme', theme);
        
        // Clear password fields
        document.getElementById('settingsCurrentPassword').value = '';
        document.getElementById('settingsNewPassword').value = '';
        document.getElementById('settingsConfirmPassword').value = '';
        
        showToast('Password and settings updated successfully!', 'success');
    } catch (error) {
        console.error('Error changing password:', error);
        showToast(error.message, 'error');
    }
}

// Initialize admin settings form on DOM load - hook into existing listener
(function() {
    // Admin settings form submission
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveAdminSettings();
        });
    }
})();

// ============================================
// Notification System for Admin
// ============================================

let adminNotifications = [];
let notificationCheckInterval = null;

function getNotificationStorageKey() {
    return 'hms_admin_notifications';
}

function getPreviousComplaintsKey() {
    return 'hms_admin_previous_complaints';
}

function getPreviousRequestsKey() {
    return 'hms_admin_previous_requests';
}

async function initAdminNotifications() {
    const stored = localStorage.getItem(getNotificationStorageKey());
    if (stored) {
        adminNotifications = JSON.parse(stored);
    }
    renderNotifications();
    updateNotificationBadge();
    
    await checkForNewNotifications();
    notificationCheckInterval = setInterval(checkForNewNotifications, 30000);
}

async function checkForNewNotifications() {
    try {
        const complaintsRes = await fetch(`${DATA_API_BASE_URL}/complaints?status=pending`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const complaints = await complaintsRes.json();
        
        const prevComplaints = JSON.parse(localStorage.getItem(getPreviousComplaintsKey()) || '[]');
        const currentComplaintIds = complaints.map(c => c.id);
        
        complaints.forEach(c => {
            if (!prevComplaints.includes(c.id)) {
                const exists = adminNotifications.some(n => n.type === 'complaint' && n.refId === c.id);
                if (!exists) {
                    addNotification({
                        type: 'complaint',
                        title: 'New Complaint Received',
                        message: `${c.first_name} ${c.last_name} filed a new ${c.category} complaint`,
                        refId: c.id
                    });
                }
            }
        });
        
        localStorage.setItem(getPreviousComplaintsKey(), JSON.stringify(currentComplaintIds));
        
        const requestsRes = await fetch(`${DATA_API_BASE_URL}/settings-requests?status=pending`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        const requests = await requestsRes.json();
        
        const prevRequests = JSON.parse(localStorage.getItem(getPreviousRequestsKey()) || '[]');
        const currentRequestIds = requests.map(r => r.id);
        
        requests.forEach(r => {
            if (!prevRequests.includes(r.id)) {
                const exists = adminNotifications.some(n => n.type === 'request' && n.refId === r.id);
                if (!exists) {
                    addNotification({
                        type: 'request',
                        title: 'New Approval Request',
                        message: `${r.requested_by_username} requested to change ${r.setting_type}`,
                        refId: r.id
                    });
                }
            }
        });
        
        localStorage.setItem(getPreviousRequestsKey(), JSON.stringify(currentRequestIds));
        
    } catch (error) {
        console.error('Error checking for notifications:', error);
    }
}

function addNotification(notification) {
    notification.id = Date.now();
    notification.timestamp = new Date().toISOString();
    notification.read = false;
    
    adminNotifications.unshift(notification);
    
    if (adminNotifications.length > 50) {
        adminNotifications = adminNotifications.slice(0, 50);
    }
    
    localStorage.setItem(getNotificationStorageKey(), JSON.stringify(adminNotifications));
    
    renderNotifications();
    updateNotificationBadge();
    
    if (notification.type === 'complaint') {
        showToast('New complaint received!', 'warning');
    } else if (notification.type === 'request') {
        showToast('New approval request!', 'info');
    }
}

function toggleNotificationPopup() {
    const popup = document.getElementById('notificationPopup');
    if (popup) {
        popup.classList.toggle('active');
        
        if (popup.classList.contains('active')) {
            markAllAsRead();
        }
    }
}

function markAllAsRead() {
    adminNotifications.forEach(n => n.read = true);
    localStorage.setItem(getNotificationStorageKey(), JSON.stringify(adminNotifications));
    updateNotificationBadge();
}

function clearAllNotifications(event) {
    if (event) event.stopPropagation();
    
    adminNotifications = [];
    localStorage.setItem(getNotificationStorageKey(), JSON.stringify(adminNotifications));
    renderNotifications();
    updateNotificationBadge();
    
    const popup = document.getElementById('notificationPopup');
    if (popup) popup.classList.remove('active');
}

function renderNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;
    
    if (adminNotifications.length === 0) {
        list.innerHTML = `
            <div class="notification-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <p>No notifications yet</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = adminNotifications.map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}" onclick="handleNotificationClick('${n.type}', '${n.refId}')">
            <div class="notification-icon ${getNotificationIconClass(n.type)}">
                ${getNotificationIcon(n.type)}
            </div>
            <div class="notification-content">
                <div class="notification-title">${n.title}</div>
                <div class="notification-message">${n.message}</div>
                <div class="notification-time">${formatTimeAgo(n.timestamp)}</div>
            </div>
        </div>
    `).join('');
}

function getNotificationIconClass(type) {
    const classes = {
        'complaint': 'complaint',
        'request': 'request',
        'notice': 'notice',
        'request-approved': 'request-approved',
        'request-rejected': 'request-rejected',
        'complaint-resolved': 'complaint-resolved',
        'complaint-progress': 'complaint-progress'
    };
    return classes[type] || 'notice';
}

function getNotificationIcon(type) {
    const icons = {
        'complaint': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
        'request': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>',
        'notice': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
        'request-approved': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        'request-rejected': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        'complaint-resolved': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        'complaint-progress': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'
    };
    return icons[type] || icons.notice;
}

function handleNotificationClick(type, refId) {
    const popup = document.getElementById('notificationPopup');
    if (popup) popup.classList.remove('active');
    
    if (type === 'complaint') {
        showSection('complaints');
        viewComplaint(refId);
    } else if (type === 'request') {
        showSection('settings-requests');
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const bell = document.getElementById('notificationBell');
    if (!badge || !bell) return;
    
    const unreadCount = adminNotifications.filter(n => !n.read).length;
    badge.textContent = unreadCount;
    
    if (unreadCount > 0) {
        bell.classList.add('has-notifications');
    } else {
        bell.classList.remove('has-notifications');
    }
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return time.toLocaleDateString();
}

document.addEventListener('click', function(e) {
    const popup = document.getElementById('notificationPopup');
    const bell = document.getElementById('notificationBell');
    
    if (popup && popup.classList.contains('active')) {
        if (!popup.contains(e.target) && (!bell || !bell.contains(e.target))) {
            popup.classList.remove('active');
        }
    }
});

if (document.getElementById('notificationBell')) {
    initAdminNotifications();
}


