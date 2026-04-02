// ============================================
// User Dashboard Specific JavaScript
// ============================================

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
    loadUserData();
});

// Load user-specific data
function loadUserData() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Simulate loading user data
    console.log('Loading user data for:', user.username);
}

// Submit complaint function
function submitComplaint() {
    const category = document.getElementById('complaintCategory').value;
    const description = document.getElementById('complaintDescription').value;
    
    if (!category || !description) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    // Simulate complaint submission
    console.log('Submitting complaint:', { category, description });
    
    // Show success message
    showToast('Complaint submitted successfully!', 'success');
    
    // Close modal and reset form
    closeModal('complaintModal');
    document.getElementById('complaintForm').reset();
}

// Make payment function
function makePayment() {
    // Simulate payment process
    showToast('Payment processed successfully!', 'success');
}

// View notice details
function viewNotice(id) {
    // Simulate viewing notice
    console.log('Viewing notice:', id);
}

// Request maintenance
function requestMaintenance() {
    openModal('maintenanceModal');
}

// Submit maintenance request
function submitMaintenance() {
    const type = document.getElementById('maintenanceType').value;
    const description = document.getElementById('maintenanceDescription').value;
    
    if (!type || !description) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    showToast('Maintenance request submitted!', 'success');
    closeModal('maintenanceModal');
    document.getElementById('maintenanceForm').reset();
}
