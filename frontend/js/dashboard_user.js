// ============================================
// User Dashboard Specific JavaScript
// ============================================

// Use existing DATA_API_BASE_URL from script.js
const DATA_API_BASE_URL = 'http://127.0.0.1:3000/api/data';

document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
    
    // Initialize theme
    initTheme();
    
    // Theme selector change handler - theme changes are immediate (stored in localStorage)
    const themeSelect = document.getElementById('settingsTheme');
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            saveTheme(this.value);
            showToast('Theme updated!', 'success');
        });
    }
    
    loadUserData();
    const hash = window.location.hash.slice(1) || 'dashboard';
    showSection(hash);
});

window.addEventListener('hashchange', function() {
    const hash = window.location.hash.slice(1) || 'dashboard';
    showSection(hash);
});

function showSection(section) {
    if (!section) section = 'dashboard';
    
    window.location.hash = section;
    
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const activeNav = document.querySelector(`.nav-item[onclick*="'${section}'"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
    
    // Show/hide sections based on active section
    document.querySelectorAll('.section').forEach(sec => {
        const secSection = sec.getAttribute('data-section');
        
        if (section === 'dashboard') {
            // On dashboard, show complaints and notices, hide profile and settings
            if (secSection === 'profile' || secSection === 'settings') {
                sec.style.display = 'none';
            } else {
                sec.style.display = 'block';
            }
        } else {
            // On specific section, show only that, hide others
            if (secSection === section) {
                sec.style.display = 'block';
                // Load settings when settings section is shown
                if (section === 'settings') {
                    loadUserSettings();
                }
            } else {
                sec.style.display = 'none';
            }
        }
    });
}

function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

async function loadUserData() {
    const user = getCurrentUser();
    if (!user) return;
    
    await Promise.all([
        loadUserProfile(),
        loadUserComplaints(),
        loadNotices()
    ]);
}

async function loadUserProfile() {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/my-profile`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        
        if (!response.ok) {
            // Profile not found - student not allocated a room yet
            document.getElementById('roomNumberStat').textContent = 'Not Assigned';
            document.getElementById('floorStat').textContent = '-';
            return;
        }
        
        const profile = await response.json();
        
        // Populate room number stat card
        document.getElementById('roomNumberStat').textContent = profile.room_number || 'Not Assigned';
        
        // Determine floor: from profile.floor, or fallback to extracting from room_number
        let floor = profile.floor;
        if (floor === undefined && profile.room_number) {
            // Extract first digit from room number (e.g., "101" -> 1, "204" -> 2)
            const match = String(profile.room_number).match(/^(\d)/);
            if (match) floor = parseInt(match[1]);
        }
        
        // Populate floor stat card
        document.getElementById('floorStat').textContent = floor ? `${floor}${getOrdinal(floor)} Floor` : '-';
        
        // Populate profile fields
        document.getElementById('admissionNumber').textContent = profile.admission_number || '-';
        document.getElementById('fullName').textContent = `${profile.first_name} ${profile.last_name}`;
        document.getElementById('email').textContent = profile.email || '-';
        document.getElementById('phone').textContent = profile.phone || '-';
        document.getElementById('roomNumberDisplay').textContent = profile.room_number || 'Not Assigned';
        document.getElementById('floorNum').textContent = floor ? `${floor}${getOrdinal(floor)} Floor` : '-';
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function loadUserComplaints() {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/complaints`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch complaints');
        const complaints = await response.json();
        
        const tbody = document.getElementById('userComplaintsTableBody');
        if (!tbody) return;
        
        // Count active complaints (pending or in_progress)
        const activeComplaints = complaints.filter(c => c.status === 'pending' || c.status === 'in_progress');
        const countEl = document.getElementById('openComplaintsCount');
        if (countEl) {
            countEl.textContent = `${activeComplaints.length} Active`;
        }
        
        if (complaints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No complaints found</td></tr>';
            return;
        }
        
        const statusMap = {
            'pending': '<span class="badge badge-danger">Pending</span>',
            'in_progress': '<span class="badge badge-warning">In Progress</span>',
            'resolved': '<span class="badge badge-success">Resolved</span>'
        };
        
        tbody.innerHTML = complaints.map(c => `
            <tr>
                <td>#C${c.id}</td>
                <td>${c.category}</td>
                <td>${c.description.substring(0, 40)}...</td>
                <td>${new Date(c.created_at).toLocaleDateString()}</td>
                <td>${statusMap[c.status]}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading complaints:', error);
        const tbody = document.getElementById('userComplaintsTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Failed to load complaints</td></tr>';
    }
}

function loadNotices() {
    fetch(`${DATA_API_BASE_URL}/notices`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
    .then(res => res.json())
    .then(notices => {
        const noticeList = document.getElementById('userNoticesList');
        if (!noticeList) return;
        
        if (notices.length === 0) {
            noticeList.innerHTML = '<p style="text-align:center;padding:20px;color:#999;">No notices available</p>';
            return;
        }
        
        noticeList.innerHTML = notices.map(n => `
            <div class="notice-item">
                <div class="notice-date">${new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div class="notice-content">
                    <h4>${n.title}</h4>
                    <p>${n.content.substring(0, 80)}...</p>
                </div>
            </div>
        `).join('');
    })
    .catch(error => {
        console.error('Error loading notices:', error);
        const noticeList = document.getElementById('userNoticesList');
        if (noticeList) noticeList.innerHTML = '<p style="text-align:center;padding:20px;color:#999;">Failed to load notices</p>';
    });
}

async function submitComplaint() {
    const category = document.getElementById('complaintCategory').value;
    const description = document.getElementById('complaintDescription').value;
    
    if (!category || !description) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    const user = getCurrentUser();
    
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/students`, {
            headers: { 
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });
        
        const students = await response.json();
        const student = students.find(s => s.email === user.email);
        
        if (!student) {
            showToast('Student record not found', 'error');
            return;
        }
        
        await fetch(`${DATA_API_BASE_URL}/complaints`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                studentId: student.id,
                category,
                description
            })
        });
        
        showToast('Complaint submitted successfully!', 'success');
        closeModal('complaintModal');
        document.getElementById('complaintForm').reset();
        loadUserComplaints();
    } catch (error) {
        console.error('Error submitting complaint:', error);
        showToast('Failed to submit complaint', 'error');
    }
}

function makePayment() {
    showToast('Payment processed successfully!', 'success');
}

function viewNotice(id) {
    console.log('Viewing notice:', id);
}

// ============================================
// Settings Form Handler
// ============================================

/**
 * Load current user settings
 */
function loadUserSettings() {
    // Theme preference from localStorage
    const savedTheme = localStorage.getItem('hms_theme') || 'light';
    const themeSelect = document.getElementById('settingsTheme');
    if (themeSelect) {
        themeSelect.value = savedTheme;
    }
}

/**
 * Handle settings form submission - Submit change request for admin approval
 * Note: Username changes are not allowed (removed from form)
 * Theme changes are applied immediately via dropdown, not through this form submission.
 */
function saveSettings() {
    const currentPassword = document.getElementById('settingsCurrentPassword').value;
    const newPassword = document.getElementById('settingsNewPassword').value;
    const confirmPassword = document.getElementById('settingsConfirmPassword').value;
    const theme = document.getElementById('settingsTheme').value; // Already saved immediately

    // Validate passwords match if changing password
    if (newPassword && newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
    }

    const user = getCurrentUser();
    if (!user) {
        showToast('User not authenticated', 'error');
        return;
    }

    // Only password changes require admin approval
    // Theme is handled immediately via dropdown change listener
    if (!newPassword) {
        showToast('No password changes to submit', 'info');
        return;
    }
    
    // Submit password change request
    const submitRequests = async () => {
        try {
            showToast('Submitting password change request for approval...', 'info');
            
            await fetch(`${DATA_API_BASE_URL}/settings-requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    settingType: 'password',
                    oldValue: '********',
                    newValue: newPassword,
                    reason: 'Change password to new secure password'
                })
            });
            
            // Clear password fields
            document.getElementById('settingsCurrentPassword').value = '';
            document.getElementById('settingsNewPassword').value = '';
            document.getElementById('settingsConfirmPassword').value = '';
            
            showToast('Password change request submitted! Awaiting admin approval.', 'success');
        } catch (error) {
            console.error('Error submitting request:', error);
            showToast('Failed to submit password change request', 'error');
        }
    };
    
    submitRequests();
}

// Initialize settings form on DOM load
document.addEventListener('DOMContentLoaded', function() {
    // Settings form submission
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveSettings();
        });
    }
});
