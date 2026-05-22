// ============================================
// Admin Dashboard Specific JavaScript
// ============================================

const API_ORIGIN = (window._env_ && window._env_.API_BASE_URL) || 'http://127.0.0.1:3000';
const DATA_API_BASE_URL = API_ORIGIN + '/api/data';

let roomsData = []; // Store rooms data for dropdown
let studentsData = []; // Store students data for filtering
let complaintsData = []; // Store complaints data for filtering

document.addEventListener('DOMContentLoaded', async function() {
    initDashboard();
    await loadPreferences();
    
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
            savePreferencesToBackend({ theme: this.value, studentView: studentViewMode, roomView: roomViewMode, complaintView: complaintViewMode, paymentView: paymentViewMode });
            showToast('Theme updated!', 'success');
        });
    }
    
    await loadAdminData();
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
    
    // Filter rooms by floor and actual availability (occupancy < capacity)
    const filteredRooms = roomsData.filter(r => r.floor === parseInt(floor) && r.current_occupancy < r.capacity && r.status !== 'maintenance');
    
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
        loadNotices(),
        loadPayments()
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

        // Load payment stats
        try {
            const payResp = await fetch(`${DATA_API_BASE_URL.replace('/data', '/payment')}/stats`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            if (payResp.ok) {
                const payStats = await payResp.json();
                const revenueEl = document.querySelector('.stat-card:nth-child(4) .stat-details h3');
                if (revenueEl) {
                    revenueEl.textContent = 'Rs. ' + parseFloat(payStats.monthlyRevenue || 0).toFixed(2);
                }
            }
        } catch (e) {
            console.error('Error loading payment stats:', e);
        }
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
        filterStudents();
    } catch (error) {
        console.error('Error loading students:', error);
        const tbody = document.getElementById('studentsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--danger-color)">Failed to load students</td></tr>';
        }
    }
}

function filterStudents() {
    const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
    
    let filtered = studentsData.filter(s => {
        const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
        const matchesSearch = fullName.includes(searchTerm);
        return matchesSearch;
    });
    
    filtered.sort((a, b) => {
        const idA = parseInt(a.admission_number.replace(/\D/g, '')) || 0;
        const idB = parseInt(b.admission_number.replace(/\D/g, '')) || 0;
        return currentSortOrder === 'asc' ? idA - idB : idB - idA;
    });
    
    if (studentViewMode === 'table') {
        renderStudentsTable(filtered);
    } else {
        renderStudentsCardViewWithData(filtered);
    }
}

let paymentsData = [];
let paymentsFilter = 'all';
let paymentViewMode = 'table';

async function loadPayments() {
    try {
        const response = await fetch(`${DATA_API_BASE_URL.replace('/data', '/payment')}/history`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch payments');
        paymentsData = await response.json();
        filterPayments(paymentsFilter);
    } catch (error) {
        console.error('Error loading payments:', error);
        const tbody = document.getElementById('paymentsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--danger-color)">Failed to load payments</td></tr>';
        }
    }
}

function filterPayments(filter) {
    paymentsFilter = filter;

    const sel = document.getElementById('paymentStatusFilter');
    if (sel) sel.value = filter;

    const searchQuery = (document.getElementById('paymentSearch').value || '').toLowerCase().trim();

    let filtered = paymentsData;

    if (filter !== 'all') {
        filtered = filtered.filter(p => p.status === filter);
    }

    if (searchQuery) {
        filtered = filtered.filter(p => {
            const name = `${p.first_name || ''} ${p.last_name || ''} ${p.username || ''}`.toLowerCase();
            return name.includes(searchQuery);
        });
    }

    if (paymentViewMode === 'table') {
        renderPaymentsTable(filtered);
    } else {
        renderPaymentsCards(filtered);
    }
}

function renderPaymentsTable(filtered) {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--gray-500);padding:20px;">No payments found</td></tr>';
        return;
    }

    const statusMap = {
        'completed': '<span class="badge badge-success">Completed</span>',
        'pending': '<span class="badge badge-warning">Pending</span>',
        'failed': '<span class="badge badge-danger">Failed</span>'
    };

    tbody.innerHTML = filtered.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${p.first_name || ''} ${p.last_name || ''} (${p.username || ''})</td>
            <td>${p.room_number || '-'}</td>
            <td>Rs. ${parseFloat(p.amount).toFixed(2)}</td>
            <td>${p.paid_month || '-'}</td>
            <td>${p.payment_method || '-'}</td>
            <td>${statusMap[p.status] || p.status}</td>
            <td>${p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '-'}</td>
            <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;" title="${p.transaction_id || ''}">${p.transaction_id || '-'}</td>
        </tr>
    `).join('');
}

function renderPaymentsCards(filtered) {
    const container = document.getElementById('paymentsCardView');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:20px;color:#999;grid-column:1/-1">No payments found</p>';
        return;
    }

    const statusMap = {
        'completed': 'badge badge-success',
        'pending': 'badge badge-warning',
        'failed': 'badge badge-danger'
    };

    container.innerHTML = filtered.map((p, i) => `
        <div class="management-card">
            <div class="management-card-top">
                <span class="management-card-id">#${i + 1}</span>
                <span class="${statusMap[p.status] || 'badge'}">${p.status}</span>
            </div>
            <div class="management-card-body">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    ${p.image_url
                        ? `<img src="${imageUrl(p.image_url)}" class="management-card-avatar" alt="">`
                        : `<div class="student-avatar-placeholder">${((p.first_name || '?')[0] + (p.last_name || '?')[0]).toUpperCase()}</div>`
                    }
                    <div>
                        <div class="management-card-title" style="margin-bottom:2px;">${p.first_name || ''} ${p.last_name || ''}</div>
                        <div style="font-size:0.8rem;color:var(--gray-500);">${p.username || ''} · ${p.email || ''}</div>
                    </div>
                </div>
                <div class="management-card-info">
                    <div class="info-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                        <span class="info-label">Amount</span>
                        <span style="font-weight:600;color:var(--success-color);">Rs. ${parseFloat(p.amount).toFixed(2)}</span>
                    </div>
                    <div class="info-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        <span class="info-label">Month</span>
                        <span>${p.paid_month || '-'}</span>
                    </div>
                    <div class="info-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                        <span class="info-label">Room</span>
                        <span>${p.room_number || '-'}</span>
                    </div>
                    <div class="info-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></polyline></svg>
                        <span class="info-label">Method</span>
                        <span>${p.payment_method || '-'}</span>
                    </div>
                    <div class="info-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        <span class="info-label">Date</span>
                        <span>${p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '-'}</span>
                    </div>
                    <div class="info-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                        <span class="info-label">Ref</span>
                        <span style="font-size:0.78rem;word-break:break-all;">${p.transaction_id ? p.transaction_id.substring(0, 24) + (p.transaction_id.length > 24 ? '...' : '') : '-'}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function setPaymentView(view) {
    paymentViewMode = view;

    document.querySelectorAll('#payments .view-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    document.getElementById('paymentsTableView').style.display = view === 'table' ? 'block' : 'none';
    document.getElementById('paymentsCardView').style.display = view === 'card' ? 'grid' : 'none';

    savePreferencesToBackend({
        theme: getCurrentTheme(),
        studentView: studentViewMode,
        roomView: roomViewMode,
        complaintView: complaintViewMode,
        paymentView: view
    });

    filterPayments(paymentsFilter);
}

async function markPaymentCompleted(paymentId) {
    if (!confirm('Mark this payment as completed? This is for testing purposes.')) return;

    try {
        const response = await fetch(`${DATA_API_BASE_URL.replace('/data', '/payment')}/mark-completed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ paymentId, transactionRef: 'manual-' + Date.now() })
        });

        if (!response.ok) throw new Error('Failed to update payment');

        showToast('Payment marked as completed!', 'success');
        loadPayments();
        loadStats();
    } catch (error) {
        console.error('Error marking payment:', error);
        showToast('Failed to update payment', 'error');
    }
}

function filterRooms() {
    const floorFilter = document.getElementById('roomFloorFilter').value;
    const statusFilter = document.getElementById('roomStatusFilter').value;
    
    let filtered = roomsData.filter(r => {
        const matchesFloor = !floorFilter || r.floor === parseInt(floorFilter);
        const matchesStatus = !statusFilter || r.status === statusFilter;
        return matchesFloor && matchesStatus;
    });
    
    if (roomViewMode === 'table') {
        renderRoomsTable(filtered);
    } else {
        renderRoomsCardViewWithData(filtered);
    }
}

function filterComplaints() {
    const statusFilter = document.getElementById('complaintStatusFilter').value;
    
    let filtered = complaintsData.filter(c => {
        return !statusFilter || c.status === statusFilter;
    });
    
    if (complaintViewMode === 'table') {
        renderComplaintsTable(filtered);
    } else {
        renderComplaintsCardViewWithData(filtered);
    }
}

function renderStudentsCardViewWithData(students) {
    const container = document.getElementById('studentsCardView');
    
    if (students.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:20px;color:#999;grid-column:1/-1">No students found</p>';
        return;
    }
    
    container.innerHTML = students.map(s => `
        <div class="management-card">
            <div class="management-card-top">
                <span class="management-card-id">#${escapeHtml(s.admission_number)}</span>
                <span class="badge badge-success">${s.status || 'Active'}</span>
            </div>
            <div class="management-card-body">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    ${s.image_url
                        ? `<img src="${imageUrl(s.image_url)}" class="management-card-avatar" alt="">`
                        : `<div class="student-avatar-placeholder">${(s.first_name[0] + s.last_name[0]).toUpperCase()}</div>`
                    }
                    <div>
                        <div class="management-card-title" style="margin-bottom:2px;">${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</div>
                    </div>
                </div>
                <div class="management-card-info">
                    <div class="info-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        <span class="info-label">Email</span>
                        <span>${escapeHtml(s.email)}</span>
                    </div>
                    <div class="info-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                        <span class="info-label">Room</span>
                        <span>${escapeHtml(s.room_number) || '-'}</span>
                    </div>
                    <div class="info-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        <span class="info-label">Price</span>
                        <span>${s.price ? 'Rs. ' + parseFloat(s.price).toFixed(2) : '-'}</span>
                    </div>
                </div>
            </div>
            <div class="management-card-actions">
                <button class="btn btn-secondary" onclick="viewStudent(${s.id})">View</button>
                <button class="btn btn-primary" onclick="editStudent(${s.id})">Edit</button>
                <button class="btn btn-danger" onclick="deleteStudent(${s.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function renderRoomsCardViewWithData(rooms) {
    const container = document.getElementById('roomsCardView');
    
    if (rooms.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:20px;color:#999;grid-column:1/-1">No rooms found</p>';
        return;
    }
    
    const statusMap = {
        'available': 'badge-info',
        'full': 'badge-success',
        'maintenance': 'badge-warning'
    };
    
    container.innerHTML = rooms.map(r => `
        <div class="management-card">
            <div class="management-card-top">
                <span class="management-card-id">Room ${r.room_number}</span>
                <span class="badge ${statusMap[r.status]}">${r.status === 'full' ? 'Occupied' : r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span>
            </div>
            <div class="management-card-body">
                <div class="management-card-title">${r.floor}${getOrdinal(r.floor)} Floor</div>
                <div class="management-card-info">
                    <div class="info-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                        <span class="info-label">Capacity</span>
                        <span>${r.capacity}</span>
                    </div>
                    <div class="info-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        <span class="info-label">Occupied</span>
                        <span>${r.current_occupancy}</span>
                    </div>
                    <div class="info-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                        <span class="info-label">Type</span>
                        <span>${r.capacity === 1 ? 'Single' : r.capacity === 2 ? 'Double' : 'Triple'}</span>
                    </div>
                </div>
            </div>
            <div class="management-card-actions">
                <button class="btn btn-primary" onclick="viewRoom(${r.id})">View</button>
            </div>
        </div>
    `).join('');
}

function renderComplaintsCardViewWithData(complaints) {
    const container = document.getElementById('complaintsCardView');
    
    if (complaints.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:20px;color:#999;grid-column:1/-1">No complaints found</p>';
        return;
    }
    
    const statusMap = {
        'pending': { class: 'badge-danger', label: 'Pending' },
        'in_progress': { class: 'badge-warning', label: 'In Progress' },
        'resolved': { class: 'badge-success', label: 'Resolved' },
        'rejected': { class: 'badge-secondary', label: 'Rejected' }
    };
    
    container.innerHTML = complaints.map((c, i) => `
        <div class="management-card">
            <div class="management-card-top">
                <span class="management-card-id">#${i + 1}</span>
                <span class="badge ${statusMap[c.status].class}">${statusMap[c.status].label}</span>
            </div>
            <div class="management-card-body">
                <div class="management-card-title">${escapeHtml(c.category)}</div>
                <div class="management-card-info">
                    <div class="info-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        <span class="info-label">Student</span>
                        <span>${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}</span>
                    </div>
                    <div class="info-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span class="info-label">Date</span>
                        <span>${new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="info-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        <span class="info-label">Desc</span>
                        <span>${escapeHtml(c.description.substring(0, 50))}...</span>
                    </div>
                </div>
            </div>
            <div class="management-card-actions">
                <button class="btn btn-secondary" onclick="viewComplaint(${c.id})">View</button>
                <button class="btn btn-primary" onclick="updateComplaint(${c.id})">Update</button>
            </div>
        </div>
    `).join('');
}

let currentSortOrder = 'asc';
let studentViewMode = 'table';
let roomViewMode = 'table';
let complaintViewMode = 'table';

function toggleSortOrder() {
    currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    const btn = document.getElementById('sortToggle');
    const svg = btn.querySelector('svg line');
    const polyline = btn.querySelector('svg polyline');
    
    if (currentSortOrder === 'asc') {
        svg.setAttribute('y1', '19');
        svg.setAttribute('y2', '5');
        polyline.setAttribute('points', '5 12 12 5 19 12');
    } else {
        svg.setAttribute('y1', '5');
        svg.setAttribute('y2', '19');
        polyline.setAttribute('points', '19 12 12 19 5 12');
    }
    
    filterStudents();
}

function setStudentView(view) {
    studentViewMode = view;
    document.getElementById('studentsTableView').style.display = view === 'table' ? 'block' : 'none';
    document.getElementById('studentsCardView').style.display = view === 'card' ? 'grid' : 'none';
    document.querySelectorAll('#students .view-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    filterStudents();
    savePreferencesToBackend({ studentView: view, roomView: roomViewMode, complaintView: complaintViewMode, paymentView: paymentViewMode, theme: getCurrentTheme() });
}

function setRoomView(view) {
    roomViewMode = view;
    document.getElementById('roomsTableView').style.display = view === 'table' ? 'block' : 'none';
    document.getElementById('roomsCardView').style.display = view === 'card' ? 'grid' : 'none';
    document.querySelectorAll('#rooms .view-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    filterRooms();
    savePreferencesToBackend({ studentView: studentViewMode, roomView: view, complaintView: complaintViewMode, paymentView: paymentViewMode, theme: getCurrentTheme() });
}

function setComplaintView(view) {
    complaintViewMode = view;
    document.getElementById('complaintsTableView').style.display = view === 'table' ? 'block' : 'none';
    document.getElementById('complaintsCardView').style.display = view === 'card' ? 'grid' : 'none';
    document.querySelectorAll('#complaints .view-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    filterComplaints();
    savePreferencesToBackend({ studentView: studentViewMode, roomView: roomViewMode, complaintView: view, paymentView: paymentViewMode, theme: getCurrentTheme() });
}

function renderStudentsTable(students) {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No students found</td></tr>';
        return;
    }
    
    tbody.innerHTML = students.map(s => `
        <tr>
            <td>#${escapeHtml(s.admission_number)}</td>
            <td><div style="display:flex;align-items:center;gap:8px;">${s.image_url ? `<img src="${imageUrl(s.image_url)}" class="student-avatar-sm" alt="">` : `<div class="student-avatar-placeholder" style="width:32px;height:32px;font-size:0.75rem;">${(s.first_name[0] + s.last_name[0]).toUpperCase()}</div>`}<span>${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</span></div></td>
            <td>${escapeHtml(s.room_number) || '-'}</td>
            <td>${escapeHtml(s.email)}</td>
            <td>${s.price ? 'Rs. ' + parseFloat(s.price).toFixed(2) : '-'}</td>
            <td><span class="badge badge-success">${s.status || 'Active'}</span></td>
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
}

async function loadRooms() {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/rooms`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch rooms');
        const rooms = await response.json();
        
        roomsData = rooms;
        filterRooms();
    } catch (error) {
        console.error('Error loading rooms:', error);
        const tbody = document.getElementById('roomsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--danger-color)">Failed to load rooms</td></tr>';
        }
    }
}

function renderRoomsTable(rooms) {
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
                    <button class="action-btn view" title="View Occupants" onclick="viewRoom(${r.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadComplaints() {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/complaints`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch complaints');
        const complaints = await response.json();
        complaintsData = complaints;
        filterComplaints();
    } catch (error) {
        console.error('Error loading complaints:', error);
        const tbody = document.getElementById('complaintsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--danger-color)">Failed to load complaints</td></tr>';
        }
    }
}

function renderComplaintsTable(complaints) {
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
    
    tbody.innerHTML = complaints.map((c, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(c.first_name)} ${escapeHtml(c.last_name)}</td>
            <td>${escapeHtml(c.category)}</td>
            <td>${escapeHtml(c.description.substring(0, 30))}...</td>
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
}

async function loadNotices(maxItems) {
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
        
        let displayNotices = notices;
        let showViewAll = false;
        if (maxItems && notices.length > maxItems) {
            displayNotices = notices.slice(0, maxItems);
            showViewAll = true;
        }
        
        noticeList.innerHTML = displayNotices.map(n => `
            <div class="notice-item-admin">
                <div class="notice-content">
                    <h4>${escapeHtml(n.title)}</h4>
                    <p>${escapeHtml(n.content.substring(0, 120))}${n.content.length > 120 ? '...' : ''}</p>
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
        `).join('') + (showViewAll ? `
            <div class="view-all-notices" style="text-align:center;padding:16px;">
                <a href="#" onclick="showSection('notices');return false;" class="btn btn-sm btn-secondary">View All Notices (${notices.length})</a>
            </div>
        ` : '');
    } catch (error) {
        console.error('Error loading notices:', error);
    }
}

function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    if (v >= 11 && v <= 13) return s[0];
    return s[(v - 20) % 10] || s[v] || s[0];
}

async function loadPreferences() {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/my-preferences`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) return;
        const prefs = await response.json();
        
        if (prefs.theme) {
            saveTheme(prefs.theme);
        }
        if (prefs.studentView) studentViewMode = prefs.studentView;
        if (prefs.roomView) roomViewMode = prefs.roomView;
        if (prefs.paymentView) paymentViewMode = prefs.paymentView;
        if (prefs.complaintView) complaintViewMode = prefs.complaintView;
        
        applyViewModes();
    } catch (e) {
        // Preferences not critical
    }
}

function applyViewModes() {
    document.getElementById('studentsTableView').style.display = studentViewMode === 'table' ? 'block' : 'none';
    document.getElementById('studentsCardView').style.display = studentViewMode === 'card' ? 'grid' : 'none';
    document.querySelectorAll('#students .view-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === studentViewMode);
    });

    document.getElementById('roomsTableView').style.display = roomViewMode === 'table' ? 'block' : 'none';
    document.getElementById('roomsCardView').style.display = roomViewMode === 'card' ? 'grid' : 'none';
    document.querySelectorAll('#rooms .view-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === roomViewMode);
    });

    document.getElementById('paymentsTableView').style.display = paymentViewMode === 'table' ? 'block' : 'none';
    document.getElementById('paymentsCardView').style.display = paymentViewMode === 'card' ? 'grid' : 'none';
    document.querySelectorAll('#payments .view-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === paymentViewMode);
    });

    document.getElementById('complaintsTableView').style.display = complaintViewMode === 'table' ? 'block' : 'none';
    document.getElementById('complaintsCardView').style.display = complaintViewMode === 'card' ? 'grid' : 'none';
    document.querySelectorAll('#complaints .view-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === complaintViewMode);
    });
}

async function savePreferencesToBackend(preferences) {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/my-preferences`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ preferences })
        });
        if (!response.ok) throw new Error('Failed to save');
    } catch (e) {
        console.error('Failed to save preferences:', e);
    }
}

async function uploadStudentImage(studentId, fileInput) {
    const file = fileInput.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/students/${studentId}/image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` },
            body: formData
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.warn('Image upload returned', response.status, err.error || '');
        }
    } catch (e) {
        console.error('Image upload failed:', e);
    }
}

document.addEventListener('change', function(e) {
    if (e.target.id === 'studentImage') {
        const preview = document.getElementById('addStudentImagePreview');
        preview.innerHTML = '';
        if (e.target.files[0]) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(e.target.files[0]);
            preview.appendChild(img);
        }
    }
    if (e.target.id === 'editStudentImage') {
        const preview = document.getElementById('editStudentImagePreview');
        preview.innerHTML = '';
        if (e.target.files[0]) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(e.target.files[0]);
            preview.appendChild(img);
        }
    }
});

async function addStudent() {
    const name = document.getElementById('studentName').value;
    const email = document.getElementById('studentEmail').value;
    const phone = document.getElementById('studentPhone').value;
    const price = document.getElementById('studentPrice').value;
    const roomId = document.getElementById('studentRoom').value;
    const username = document.getElementById('studentUsername').value;
    const password = document.getElementById('studentPassword').value;
    const submitBtn = document.querySelector('#addStudentModal .btn-primary');
    
    if (!name || !email || !phone || !username || !password) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Adding...';
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
                email,
                phone,
                price: price ? parseFloat(price) : null,
                admissionNumber: 'STU' + Date.now(),
                roomId: parseInt(roomId)
            })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to add student');
        }
        const result = await response.json();
        
        await uploadStudentImage(result.studentId, document.getElementById('studentImage'));
        
        showToast('Student added successfully! Student can now login with provided credentials', 'success');
        closeModal('addStudentModal');
        document.getElementById('addStudentForm').reset();
        document.getElementById('addStudentImagePreview').innerHTML = '';
        loadStudents();
        loadRooms();
    } catch (error) {
        console.error('Error adding student:', error);
        showToast(error.message || 'Failed to add student', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Add Student';
        }
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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Failed to delete student');

            showToast('Student deleted successfully!', 'success');
            loadStudents();
            loadRooms();
            loadStats();
        } catch (error) {
            console.error('Error deleting student:', error);
            showToast(error.message || 'Failed to delete student', 'error');
        }
    });
}

function viewRoom(roomId) {
    const room = roomsData.find(r => r.id === roomId);
    if (!room) return;

    const occupants = studentsData.filter(s => s.room_number === room.room_number);

    const statusMap = {
        'available': '<span class="badge badge-info">Available</span>',
        'full': '<span class="badge badge-success">Occupied</span>',
        'maintenance': '<span class="badge badge-warning">Maintenance</span>'
    };

    const content = document.getElementById('viewRoomContent');
    content.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <label>Room Number</label>
                <span>${room.room_number}</span>
            </div>
            <div class="detail-item">
                <label>Floor</label>
                <span>${room.floor}${getOrdinal(room.floor)} Floor</span>
            </div>
            <div class="detail-item">
                <label>Type</label>
                <span>${room.capacity === 1 ? 'Single' : room.capacity === 2 ? 'Double' : 'Triple'}</span>
            </div>
            <div class="detail-item">
                <label>Capacity</label>
                <span>${room.capacity}</span>
            </div>
            <div class="detail-item">
                <label>Occupied</label>
                <span>${room.current_occupancy}</span>
            </div>
            <div class="detail-item">
                <label>Status</label>
                <span>${statusMap[room.status] || room.status}</span>
            </div>
        </div>
        <h4 style="margin-top: 24px; margin-bottom: 12px;">Occupants (${occupants.length})</h4>
        ${occupants.length === 0 ? '<p style="color: #999;">No occupants in this room.</p>' : occupants.map(s => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-color);">
            <span style="font-weight:500;">${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</span>
            <button class="btn btn-primary" style="padding:6px 14px;font-size:13px;" onclick="closeModal('viewRoomModal');viewStudent(${s.id})">View All</button>
        </div>
        `).join('')}
    `;

    document.getElementById('viewRoomModal').classList.add('active');
}

document.addEventListener('DOMContentLoaded', function() {
    const noticeForm = document.getElementById('addNoticeForm');
    if (noticeForm) {
        noticeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (noticeForm._editing) {
                noticeForm._editing(e);
            } else {
                addNotice();
            }
        });
    }
});

async function addNotice() {
    const title = document.getElementById('noticeTitle').value;
    const content = document.getElementById('noticeContent').value;
    const submitBtn = document.querySelector('#addNoticeModal .btn-primary');
    
    if (!title || !content) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Publishing...';
    }
    
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
        document.getElementById('addNoticeModalLabel').textContent = 'Add New Notice';
        loadNotices();
    } catch (error) {
        console.error('Error adding notice:', error);
        showToast('Failed to add notice', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Publish Notice';
        }
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
            ${student.image_url ? `<div class="detail-item" style="grid-column: span 2; text-align: center;">
                <img src="${imageUrl(student.image_url)}" class="student-avatar-lg" alt="Student Photo">
            </div>` : ''}
            <div class="detail-item">
                <label>Admission Number</label>
                <span>${escapeHtml(student.admission_number)}</span>
            </div>
            <div class="detail-item">
                <label>Full Name</label>
                <span>${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}</span>
            </div>
            <div class="detail-item">
                <label>Email</label>
                <span>${escapeHtml(student.email)}</span>
            </div>
            <div class="detail-item">
                <label>Phone</label>
                <span>${escapeHtml(student.phone)}</span>
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
                <label>Monthly Price</label>
                <span>${student.price ? 'Rs. ' + parseFloat(student.price).toFixed(2) : '-'}</span>
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
        document.getElementById('editStudentEmail').value = student.email;
        document.getElementById('editStudentPhone').value = student.phone;
        document.getElementById('editStudentPrice').value = student.price || '';
        
        const preview = document.getElementById('editStudentImagePreview');
        const currentImg = document.getElementById('editStudentCurrentImage');
        if (student.image_url) {
            currentImg.src = imageUrl(student.image_url);
            currentImg.style.display = 'inline-block';
        } else {
            currentImg.style.display = 'none';
        }
        preview.innerHTML = '';
        preview.appendChild(currentImg);
        
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
        
        const freshFloor = floorSelect.cloneNode(true);
        floorSelect.parentNode.replaceChild(freshFloor, floorSelect);
        freshFloor.addEventListener('change', function() {
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
    const email = document.getElementById('editStudentEmail').value;
    const phone = document.getElementById('editStudentPhone').value;
    const price = document.getElementById('editStudentPrice').value;
    const roomId = document.getElementById('editStudentRoom').value;
    
    if (!name || !email || !phone) {
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
                email,
                phone,
                price: price ? parseFloat(price) : null,
                roomId: roomId ? parseInt(roomId) : null
            })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to update student');
        }
        
        const preview = document.getElementById('editStudentImagePreview');
        await uploadStudentImage(studentId, document.getElementById('editStudentImage'));
        
        showToast('Student updated successfully!', 'success');
        closeModal('editStudentModal');
        preview.innerHTML = '';
        loadStudents();
        loadRooms();
        loadStats();
    } catch (error) {
        console.error('Error saving student:', error);
        showToast(error.message || 'Failed to update student', 'error');
    }
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
                <label>Student Name</label>
                <span>${escapeHtml(complaint.first_name)} ${escapeHtml(complaint.last_name)}</span>
            </div>
            <div class="detail-item">
                <label>Email</label>
                <span>${escapeHtml(complaint.email)}</span>
            </div>
            <div class="detail-item">
                <label>Category</label>
                <span>${escapeHtml(complaint.category)}</span>
            </div>
            <div class="detail-item" style="grid-column: span 2;">
                <label>Description</label>
                <span>${escapeHtml(complaint.description)}</span>
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
                <span>${escapeHtml(complaint.resolution_notes)}</span>
            </div>
            ` : ''}
        `;
        openModal('viewComplaintModal');
    } catch (error) {
        console.error('Error viewing complaint:', error);
        showToast('Failed to load complaint details', 'error');
    }
}

async function editNotice(noticeId) {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/notices`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch notices');
        const notices = await response.json();
        const notice = notices.find(n => n.id === noticeId);
        if (!notice) throw new Error('Notice not found');

        document.getElementById('noticeTitle').value = notice.title;
        document.getElementById('noticeContent').value = notice.content;
        document.getElementById('addNoticeModalLabel').textContent = 'Edit Notice';

        const form = document.getElementById('addNoticeForm');
        form._editing = async function(e) {
            const title = document.getElementById('noticeTitle').value;
            const content = document.getElementById('noticeContent').value;
            if (!title || !content) {
                showToast('Please fill in all fields', 'error');
                return;
            }
            try {
                const res = await fetch(`${DATA_API_BASE_URL}/notices/${noticeId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: JSON.stringify({ title, content, priority: 'normal' })
                });
                if (!res.ok) throw new Error('Failed to update notice');
                showToast('Notice updated successfully!', 'success');
                closeModal('addNoticeModal');
                form._editing = null;
                document.getElementById('addNoticeModalLabel').textContent = 'Add New Notice';
                form.reset();
                loadNotices();
            } catch (error) {
                console.error('Error updating notice:', error);
                showToast('Failed to update notice', 'error');
            }
        };
        openModal('addNoticeModal');
    } catch (error) {
        console.error('Error editing notice:', error);
        showToast('Failed to load notice data', 'error');
    }
}

function exportReport() {
    if (!studentsData || studentsData.length === 0) {
        showToast('No student data to export', 'warning');
        return;
    }

    const headers = ['Admission No', 'First Name', 'Last Name', 'Email', 'Phone', 'Room', 'Floor', 'Monthly Price'];
    const rows = studentsData.map(s => [
        s.admission_number || '',
        s.first_name || '',
        s.last_name || '',
        s.email || '',
        s.phone || '',
        s.room_number || 'Not Assigned',
        s.floor || '',
        s.price ? parseFloat(s.price).toFixed(2) : ''
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

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
    const paymentsSection = document.getElementById('payments');
    const studentsSection = document.getElementById('students');
    const roomsSection = document.getElementById('rooms');
    const complaintsSection = document.getElementById('complaints');
    const settingsSection = document.getElementById('settings');
    const chartsSection = document.getElementById('charts');

    if (section === 'dashboard') {
        if (statsGrid) statsGrid.style.display = 'grid';
        if (noticesSection) noticesSection.style.display = 'block';
        if (paymentsSection) paymentsSection.style.display = 'none';
        if (studentsSection) studentsSection.style.display = 'none';
        if (roomsSection) roomsSection.style.display = 'none';
        if (complaintsSection) complaintsSection.style.display = 'none';
        if (settingsSection) settingsSection.style.display = 'none';
        if (chartsSection) chartsSection.style.display = 'none';
        // Show limited preview on dashboard
        loadNotices(3);
    } else {
        if (statsGrid) statsGrid.style.display = 'none';
        if (noticesSection) noticesSection.style.display = 'none';
        if (paymentsSection) paymentsSection.style.display = 'none';
        if (studentsSection) studentsSection.style.display = 'none';
        if (roomsSection) roomsSection.style.display = 'none';
        if (complaintsSection) complaintsSection.style.display = 'none';
        if (settingsSection) settingsSection.style.display = 'none';
        if (chartsSection) chartsSection.style.display = 'none';

        if (section === 'students' && studentsSection) {
            studentsSection.style.display = 'block';
        } else if (section === 'rooms' && roomsSection) {
            roomsSection.style.display = 'block';
        } else if (section === 'complaints' && complaintsSection) {
            complaintsSection.style.display = 'block';
        } else if (section === 'payments' && paymentsSection) {
            paymentsSection.style.display = 'block';
            filterPayments('all');
        } else if (section === 'notices' && noticesSection) {
            noticesSection.style.display = 'block';
            loadNotices(); // Load full list
        } else if (section === 'settings' && settingsSection) {
            settingsSection.style.display = 'block';
            loadAdminSettings();
        } else if (section === 'charts' && chartsSection) {
            chartsSection.style.display = 'block';
            loadCharts();
        }
    }
}


// ============================================
// Admin Settings (Direct Update - No Approval Needed)
// ============================================

/**
 * Load current admin settings
 */
function loadAdminSettings() {
    const themeSelect = document.getElementById('settingsTheme');
    if (themeSelect) {
        themeSelect.value = getCurrentTheme();
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
        saveTheme(theme);
        savePreferencesToBackend({ theme, studentView: studentViewMode, roomView: roomViewMode, complaintView: complaintViewMode, paymentView: paymentViewMode });
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
        saveTheme(theme);
        savePreferencesToBackend({ theme, studentView: studentViewMode, roomView: roomViewMode, complaintView: complaintViewMode, paymentView: paymentViewMode });
        
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


async function initAdminNotifications() {
    const stored = localStorage.getItem(getNotificationStorageKey());
    if (stored) {
        adminNotifications = JSON.parse(stored);
        // Remove any notifications without proper refId (legacy format from before fix)
        adminNotifications = adminNotifications.filter(n => n.refId);
        localStorage.setItem(getNotificationStorageKey(), JSON.stringify(adminNotifications));
    }
    renderNotifications();
    updateNotificationBadge();
    
    await checkForNewNotifications();
    notificationCheckInterval = setInterval(checkForNewNotifications, 5000);
}

async function checkForNewNotifications() {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch notifications');
        
        const apiNotifications = await response.json();
        
        // Detect new notifications and status changes
        let needsComplaintReload = false;
        let needsPaymentReload = false;

        apiNotifications.forEach(n => {
            const existing = adminNotifications.find(en => en.id === n.id);
            if (!existing) {
                // Skip if previously dismissed and status hasn't changed
                const dismissed = JSON.parse(localStorage.getItem('hms_dismissed_notifications') || '{}');
                if (dismissed[n.id] === n.status) return;
                if (dismissed[n.id] && dismissed[n.id] !== n.status) {
                    delete dismissed[n.id];
                    localStorage.setItem('hms_dismissed_notifications', JSON.stringify(dismissed));
                }
                if (n.type === 'complaint') needsComplaintReload = true;
                if (n.type === 'payment') needsPaymentReload = true;
                addNotification({
                    type: n.type,
                    title: n.title,
                    message: n.message,
                    refId: n.refId,
                    timestamp: n.timestamp,
                    status: n.status,
                    id: n.id
                });
            } else if (existing.status !== n.status) {
                if (n.type === 'complaint') needsComplaintReload = true;
                adminNotifications = adminNotifications.filter(en => en.id !== n.id);
                addNotification({
                    type: n.type,
                    title: n.title,
                    message: n.message,
                    refId: n.refId,
                    timestamp: n.timestamp,
                    status: n.status,
                    id: n.id
                });
            }
        });

        if (needsComplaintReload) { loadComplaints(); loadStats(); }
        if (needsPaymentReload) { loadPayments(); loadStats(); }

        // Update local storage with latest data
        localStorage.setItem(getPreviousComplaintsKey(), JSON.stringify(
            apiNotifications.filter(n => n.type === 'complaint').map(n => n.refId)
        ));
        
    } catch (error) {
        console.error('Error checking for notifications:', error);
    }
}

function addNotification(notification) {
    if (!notification.id) notification.id = Date.now();
    if (!notification.timestamp) notification.timestamp = new Date().toISOString();
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
    } else if (notification.type === 'payment') {
        showToast(`Payment: ${notification.message}`, 'success');
    }
}

function toggleNotificationPopup() {
    const popup = document.getElementById('notificationPopup');
    if (popup) {
        popup.classList.toggle('active');
    }
}

function markAllAsRead(event) {
    if (event) event.stopPropagation();
    adminNotifications.forEach(n => n.read = true);
    localStorage.setItem(getNotificationStorageKey(), JSON.stringify(adminNotifications));
    renderNotifications();
    updateNotificationBadge();
}

function clearAllNotifications(event) {
    if (event) event.stopPropagation();
    const dismissed = JSON.parse(localStorage.getItem('hms_dismissed_notifications') || '{}');
    adminNotifications.forEach(n => dismissed[n.id] = n.status);
    localStorage.setItem('hms_dismissed_notifications', JSON.stringify(dismissed));
    adminNotifications = [];
    localStorage.removeItem(getNotificationStorageKey());
    renderNotifications();
    updateNotificationBadge();
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
                <span class="notification-type-label type-${n.type}">${getNotificationTypeLabel(n.type)}</span>
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
        'payment': 'payment',
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
        'complaint-progress': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
        'payment': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>'
    };
    return icons[type] || icons.notice;
}

function getNotificationTypeLabel(type) {
    const labels = {
        'complaint': 'Complaint',
        'request': 'Request',
        'notice': 'Notice',
        'payment': 'Payment',
        'request-approved': 'Approved',
        'request-rejected': 'Rejected',
        'complaint-resolved': 'Resolved',
        'complaint-progress': 'In Progress'
    };
    return labels[type] || 'Notice';
}

function handleNotificationClick(type, refId) {
    const popup = document.getElementById('notificationPopup');
    if (popup) popup.classList.remove('active');
    
    if (type === 'complaint') {
        showSection('complaints');
        viewComplaint(refId);
    } else if (type === 'payment') {
        showSection('payments');
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

// ============================================
// Charts — Bar & Line (Chart.js)
// ============================================

let barChartInstance = null;
let lineChartInstance = null;

function destroyCharts() {
    if (barChartInstance) { barChartInstance.destroy(); barChartInstance = null; }
    if (lineChartInstance) { lineChartInstance.destroy(); lineChartInstance = null; }
}

async function loadCharts() {
    destroyCharts();

    const chartCanvas = document.getElementById('mainChart');
    if (!chartCanvas) {
        console.error('Chart canvas element not found');
        return;
    }

    // Show loading placeholder inside the canvas container
    const chartParent = chartCanvas.parentElement;
    if (!chartParent) {
        console.error('Chart container not found');
        return;
    }
    
    // Show loading placeholder
    chartParent.innerHTML = '<div class="chart-placeholder"><p>Loading…</p></div>';

    try {
        const response = await fetch(`${DATA_API_BASE_URL}/monthly-stats`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();

        // Replace loading placeholder with canvas
        chartParent.innerHTML = '<canvas id="mainChart"></canvas>';
        
        // Get the new canvas element
        const newChartCanvas = document.getElementById('mainChart');
        if (!newChartCanvas) {
            throw new Error('Failed to create chart canvas');
        }

        // abort if Chart.js still hasn't initialised
        if (typeof Chart === 'undefined') {
            throw new Error('Chart.js library not loaded');
        }

        Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        Chart.defaults.font.size = 11;
        Chart.defaults.plugins.legend.labels.padding = 16;
        Chart.defaults.layout.padding = { top: 4, bottom: 0, left: 0, right: 0 };

        const chartColors = {
            due: 'rgba(212, 107, 122, 0.85)',
            dueBorder: '#D46B7A',
            received: 'rgba(91, 154, 125, 0.85)',
            receivedBorder: '#5B9A7D'
        };

        const tickColor = getComputedStyle(document.documentElement).getPropertyValue('--gray-500').trim() || '#9A9282';
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--gray-200').trim() || '#EDE9E0';

        // --- Line Chart (Due vs Received) ---
        const chartCtx = newChartCanvas.getContext('2d');
        lineChartInstance = new Chart(chartCtx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Due (Rs.)',
                        data: data.due,
                        borderColor: chartColors.dueBorder,
                        backgroundColor: 'rgba(212, 107, 122, 0.08)',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Received (Rs.)',
                        data: data.received,
                        borderColor: chartColors.receivedBorder,
                        backgroundColor: 'rgba(91, 154, 125, 0.08)',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, pointStyleWidth: 12 } },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                if (ctx.dataset.label === 'Due (Rs.)') return '  Due  Rs. ' + ctx.raw.toFixed(0);
                                if (ctx.dataset.label === 'Received (Rs.)') return '  Received  Rs. ' + ctx.raw.toFixed(0);
                                return `  ${ctx.dataset.label}  ${ctx.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: tickColor }, grid: { color: gridColor } },
                    y: { ticks: { color: tickColor }, grid: { color: gridColor } }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    } catch (error) {
        console.error('Error loading charts:', error);
        if (chartParent) {
            chartParent.innerHTML = '<div class="chart-placeholder"><p>Failed to load chart data: ' + escapeHtml(error.message) + '</p></div>';
        }
    }
}


