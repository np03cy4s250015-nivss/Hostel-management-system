// ============================================
// Admin Dashboard Specific JavaScript
// ============================================

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
    loadAdminData();
});

// Load admin-specific data
function loadAdminData() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Simulate loading admin data
    console.log('Loading admin data for:', user.username);
}

// Add Student function
function addStudent() {
    const name = document.getElementById('studentName').value;
    const email = document.getElementById('studentEmail').value;
    const phone = document.getElementById('studentPhone').value;
    const room = document.getElementById('studentRoom').value;
    const block = document.getElementById('studentBlock').value;
    const status = document.getElementById('studentStatus').value;
    
    if (!name || !email || !phone || !room || !block) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Simulate adding student
    console.log('Adding student:', { name, email, phone, room, block, status });
    
    showToast('Student added successfully!', 'success');
    closeModal('addStudentModal');
    document.getElementById('addStudentForm').reset();
}

// Add Room function
function addRoom() {
    const roomNumber = document.getElementById('roomNumber').value;
    const block = document.getElementById('roomBlock').value;
    const floor = document.getElementById('roomFloor').value;
    const type = document.getElementById('roomType').value;
    const capacity = document.getElementById('roomCapacity').value;
    
    if (!roomNumber || !block || !floor || !type || !capacity) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Simulate adding room
    console.log('Adding room:', { roomNumber, block, floor, type, capacity });
    
    showToast('Room added successfully!', 'success');
    closeModal('addRoomModal');
    document.getElementById('addRoomForm').reset();
}

// Add Notice function
function addNotice() {
    const title = document.getElementById('noticeTitle').value;
    const content = document.getElementById('noticeContent').value;
    const block = document.getElementById('noticeBlock').value;
    
    if (!title || !content) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Simulate adding notice
    console.log('Adding notice:', { title, content, block });
    
    showToast('Notice published successfully!', 'success');
    closeModal('addNoticeModal');
    document.getElementById('addNoticeForm').reset();
}

// Edit Student function
function editStudent(studentId) {
    console.log('Editing student:', studentId);
    showToast('Edit functionality coming soon', 'warning');
}

// Delete Student function
function deleteStudent(studentId) {
    if (confirm('Are you sure you want to delete this student?')) {
        console.log('Deleting student:', studentId);
        showToast('Student deleted successfully!', 'success');
    }
}

// Edit Room function
function editRoom(roomId) {
    console.log('Editing room:', roomId);
    showToast('Edit functionality coming soon', 'warning');
}

// Delete Room function
function deleteRoom(roomId) {
    if (confirm('Are you sure you want to delete this room?')) {
        console.log('Deleting room:', roomId);
        showToast('Room deleted successfully!', 'success');
    }
}

// Update Complaint Status
function updateComplaint(complaintId) {
    console.log('Updating complaint:', complaintId);
    showToast('Complaint status updated!', 'success');
}

// Edit Notice function
function editNotice(noticeId) {
    console.log('Editing notice:', noticeId);
    showToast('Edit functionality coming soon', 'warning');
}

// Delete Notice function
function deleteNotice(noticeId) {
    if (confirm('Are you sure you want to delete this notice?')) {
        console.log('Deleting notice:', noticeId);
        showToast('Notice deleted successfully!', 'success');
    }
}

// Export Report function
function exportReport() {
    console.log('Exporting report...');
    showToast('Report exported successfully!', 'success');
}

// View Student Details
function viewStudent(studentId) {
    console.log('Viewing student details:', studentId);
    openModal('viewStudentModal');
}

// View Complaint Details
function viewComplaint(complaintId) {
    console.log('Viewing complaint:', complaintId);
    openModal('viewComplaintModal');
}
