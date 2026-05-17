// ============================================
// User Dashboard Specific JavaScript
// ============================================

// Use existing DATA_API_BASE_URL from script.js
const API_ORIGIN = (window._env_ && window._env_.API_BASE_URL) || 'http://127.0.0.1:3000';
const DATA_API_BASE_URL = API_ORIGIN + '/api/data';
const UPLOAD_BASE_URL = API_ORIGIN;

function imageUrl(url) {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return UPLOAD_BASE_URL + url;
}

document.addEventListener('DOMContentLoaded', async function() {
    initDashboard();
    await loadPreferences();
    
    // Theme selector change handler - theme changes are immediate
    const themeSelect = document.getElementById('settingsTheme');
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            saveTheme(this.value);
            savePreferencesToBackend({ theme: this.value });
            showToast('Theme updated!', 'success');
        });
    }
    
    await loadUserData();
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
            // On dashboard, show complaints, payments and notices, hide profile and settings
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
                if (section === 'payments') {
                    loadUserPaymentStatus();
                    loadUserPaymentHistory();
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
    } catch (e) {
        // Preferences not critical
    }
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

async function loadUserData() {
    const user = getCurrentUser();
    if (!user) return;
    
    await Promise.all([
        loadUserProfile(),
        loadUserComplaints(),
        loadNotices(),
        loadUserPaymentStatus(),
        loadUserPaymentHistory()
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
            const match = String(profile.room_number).match(/^(\d)/);
            if (match) floor = parseInt(match[1]);
        }
        
        // Populate floor stat card
        document.getElementById('floorStat').textContent = floor ? `${floor}${getOrdinal(floor)} Floor` : '-';
        
        // Profile image
        const container = document.getElementById('profileImageContainer');
        if (profile.image_url) {
            container.innerHTML = `<img src="${imageUrl(profile.image_url)}" class="student-avatar-lg" alt="Profile Photo">`;
        } else {
            const initials = ((profile.first_name || '')[0] + (profile.last_name || '')[0]).toUpperCase() || '?';
            container.innerHTML = `<div class="student-avatar-lg" style="display:flex;align-items:center;justify-content:center;background:var(--gray-200);color:var(--gray-500);font-weight:700;font-size:1.5rem;">${initials}</div>`;
        }
        
        // Profile header
        document.getElementById('profileName').textContent = `${profile.first_name} ${profile.last_name}`;
        document.getElementById('profileAdmission').textContent = profile.admission_number || '-';
        
        // Populate profile fields
        document.getElementById('email').textContent = profile.email || '-';
        document.getElementById('phone').textContent = profile.phone || '-';
        document.getElementById('roomNumberDisplay').textContent = profile.room_number || 'Not Assigned';
        document.getElementById('floorNum').textContent = floor ? `${floor}${getOrdinal(floor)} Floor` : '-';
        document.getElementById('profilePrice').textContent = profile.price ? '$' + parseFloat(profile.price).toFixed(2) : '-';
        document.getElementById('profileJoinedDate').textContent = profile.joined_at ? new Date(profile.joined_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
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
        
        tbody.innerHTML = complaints.map((c, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(c.category)}</td>
                <td>${escapeHtml(c.description.substring(0, 40))}...</td>
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
                    <h4>${escapeHtml(n.title)}</h4>
                    <p>${escapeHtml(n.content.substring(0, 80))}...</p>
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
    const submitBtn = document.querySelector('#complaintModal .btn-primary');
    
    if (!category || !description) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
    }
    
    try {
        const profileRes = await fetch(`${DATA_API_BASE_URL}/my-profile`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!profileRes.ok) {
            showToast('Student record not found', 'error');
            return;
        }
        const profile = await profileRes.json();

        await fetch(`${DATA_API_BASE_URL}/complaints`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                studentId: profile.id,
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
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Complaint';
        }
    }
}

// ============================================
// Payment System (eSewa Integration)
// ============================================

const PAYMENT_API_BASE_URL = DATA_API_BASE_URL.replace('/data', '/payment');

async function loadUserPaymentStatus() {
    try {
        const response = await fetch(`${PAYMENT_API_BASE_URL}/my-status`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch payment status');
        const data = await response.json();

        const monthEl = document.getElementById('paymentMonth');
        const amountEl = document.getElementById('paymentAmount');
        const statusBadge = document.getElementById('paymentStatusBadge');
        const payBtn = document.getElementById('payNowBtn');
        const credsNote = document.getElementById('testCredsNote');
        const feeStat = document.getElementById('feeStatusStat');
        const totalCountEl = document.getElementById('totalPaymentsCount');
        const totalAmtEl = document.getElementById('totalAmountPaid');

        if (monthEl) monthEl.textContent = data.month || '-';
        if (amountEl) amountEl.textContent = data.amount ? '$' + parseFloat(data.amount).toFixed(2) : '$0.00';
        if (totalCountEl) totalCountEl.textContent = data.totalPayments || 0;
        if (totalAmtEl) totalAmtEl.textContent = data.totalAmount ? '$' + parseFloat(data.totalAmount).toFixed(2) : '$0.00';

        if (data.status === 'paid') {
            if (statusBadge) {
                statusBadge.textContent = 'Paid';
                statusBadge.className = 'badge badge-success';
            }
            if (payBtn) payBtn.style.display = 'none';
            if (credsNote) credsNote.style.display = 'none';
            if (feeStat) {
                feeStat.textContent = 'Paid';
                feeStat.style.color = 'var(--success-color)';
            }
        } else if (data.status === 'pending') {
            if (statusBadge) {
                statusBadge.textContent = 'Pending';
                statusBadge.className = 'badge badge-warning';
            }
            if (payBtn) {
                payBtn.style.display = 'inline-flex';
                payBtn.disabled = false;
                payBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg> Retry Payment`;
            }
            if (credsNote) credsNote.style.display = 'block';
            if (feeStat) {
                feeStat.textContent = 'Pending';
                feeStat.style.color = 'var(--warning-color)';
            }
        } else {
            if (statusBadge) {
                statusBadge.textContent = 'Due';
                statusBadge.className = 'badge badge-danger';
            }
            if (payBtn) {
                payBtn.style.display = 'inline-flex';
                payBtn.disabled = false;
                payBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg> Pay Now with eSewa`;
            }
            if (credsNote) credsNote.style.display = 'block';
            if (feeStat) {
                feeStat.textContent = 'Due';
                feeStat.style.color = 'var(--danger-color)';
            }
        }
    } catch (error) {
        console.error('Error loading payment status:', error);
    }
}

async function loadUserPaymentHistory() {
    try {
        const response = await fetch(`${PAYMENT_API_BASE_URL}/history`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) throw new Error('Failed to fetch payment history');
        const payments = await response.json();

        const tbody = document.getElementById('userPaymentsTableBody');
        if (!tbody) return;

        if (payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No payment history found</td></tr>';
            return;
        }

        const statusMap = {
            'completed': '<span class="badge badge-success">Completed</span>',
            'pending': '<span class="badge badge-warning">Pending</span>',
            'failed': '<span class="badge badge-danger">Failed</span>'
        };

        tbody.innerHTML = payments.map((p, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>$${parseFloat(p.amount).toFixed(2)}</td>
                <td>${p.paid_month || '-'}</td>
                <td>${p.payment_method || '-'}</td>
                <td>${statusMap[p.status] || p.status}</td>
                <td>${p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '-'}</td>
                <td style="max-width:100px;overflow:hidden;text-overflow:ellipsis;" title="${p.transaction_id || ''}">${p.transaction_id ? p.transaction_id.substring(0, 15) + '...' : '-'}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading payment history:', error);
        const tbody = document.getElementById('userPaymentsTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Failed to load history</td></tr>';
    }
}

async function initiatePayment() {
    const studentId = await getUserStudentId();
    if (!studentId) {
        showToast('Student record not found', 'error');
        return;
    }

    const response = await fetch(`${DATA_API_BASE_URL}/my-profile`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    if (!response.ok) {
        showToast('Failed to load profile', 'error');
        return;
    }
    const profile = await response.json();
    const amount = profile.price;
    if (!amount || amount <= 0) {
        showToast('No monthly fee amount set. Contact admin.', 'error');
        return;
    }

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    showToast('Initiating payment with eSewa...', 'info');

    try {
        const initResponse = await fetch(`${PAYMENT_API_BASE_URL}/initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ studentId, amount, month })
        });

        if (!initResponse.ok) {
            const err = await initResponse.json();
            throw new Error(err.error || 'Failed to initiate payment');
        }

        const paymentData = await initResponse.json();

        // Create and submit eSewa v2 form in new tab
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = paymentData.esewaUrl;
        form.style.display = 'none';

        const params = paymentData.params;
        Object.keys(params).forEach(key => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = params[key];
            form.appendChild(input);
        });

        document.body.appendChild(form);
        showToast('Redirecting to eSewa...', 'info');

        localStorage.setItem('hms_pending_payment', JSON.stringify({
            transactionUuid: paymentData.transactionUuid,
            paymentId: paymentData.paymentId,
            amount: amount,
            month: month
        }));

        form.submit();
    } catch (error) {
        console.error('Payment initiation error:', error);
        showToast(error.message || 'Failed to initiate payment', 'error');
    }
}

async function getUserStudentId() {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/my-profile`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!response.ok) return null;
        const profile = await response.json();
        return profile.id || null;
    } catch (e) {
        return null;
    }
}

// Check for payment return from eSewa (redirected via backend)
function checkPaymentReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const transactionUuid = urlParams.get('transaction_uuid');
    const refId = urlParams.get('refId');
    const paymentResult = urlParams.get('payment');
    const reason = urlParams.get('reason');

    if (paymentResult === 'success' && transactionUuid) {
        verifyPayment(transactionUuid, refId);
    } else if (paymentResult === 'failed') {
        const msg = reason ? `Payment failed: ${reason.replace('_', ' ')}` : 'Payment was cancelled or failed';
        showToast(msg, 'error');
        localStorage.removeItem('hms_pending_payment');
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }
}

async function verifyPayment(transactionUuid, refId) {
    showToast('Verifying payment with eSewa...', 'info');

    try {
        const response = await fetch(`${PAYMENT_API_BASE_URL}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                transactionUuid: transactionUuid,
                refId: refId || undefined
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Verification failed');
        }

        const data = await response.json();
        showToast('Payment successful! Thank you.', 'success');
        localStorage.removeItem('hms_pending_payment');

        loadUserPaymentStatus();
        loadUserPaymentHistory();

        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    } catch (error) {
        console.error('Payment verification error:', error);
        showToast(error.message || 'Payment verification failed. Contact admin.', 'error');
        localStorage.removeItem('hms_pending_payment');
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }
}

// Run payment return check on page load
document.addEventListener('DOMContentLoaded', function() {
    checkPaymentReturn();
});

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
    const themeSelect = document.getElementById('settingsTheme');
    if (themeSelect) {
        themeSelect.value = getCurrentTheme();
    }
}

/**
 * Handle settings form submission - Submit change request for admin approval
 * Note: Username changes are not allowed (removed from form)
 * Theme changes are applied immediately via dropdown, not through this form submission.
 */
async function saveSettings() {
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
    
    // Verify current password before submitting request
    try {
        const verifyRes = await fetch(`${DATA_API_BASE_URL}/verify-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ currentPassword })
        });
        if (!verifyRes.ok) {
            const err = await verifyRes.json();
            showToast(err.error || 'Current password is incorrect', 'error');
            return;
        }
    } catch (error) {
        console.error('Error verifying password:', error);
        showToast('Failed to verify current password', 'error');
        return;
    }

    // Submit password change request
    const submitRequests = async () => {
        try {
            showToast('Submitting password change request for approval...', 'info');
            
            const res = await fetch(`${DATA_API_BASE_URL}/settings-requests`, {
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

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to submit request');
            }
            
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

// ============================================
// Notification System for User
// ============================================

let userNotifications = [];
let userNotificationCheckInterval = null;
let previousNotices = [];
let previousComplaints = [];

function getUserNotificationStorageKey() {
    return 'hms_user_notifications';
}

async function initUserNotifications() {
    const stored = localStorage.getItem(getUserNotificationStorageKey());
    if (stored) {
        userNotifications = JSON.parse(stored);
    }
    renderUserNotifications();
    updateUserNotificationBadge();
    
    await checkForUserNotifications();
    // Poll for new notifications every 15 seconds
    userNotificationCheckInterval = setInterval(checkForUserNotifications, 5000);
}

async function checkForUserNotifications() {
    try {
        const response = await fetch(`${DATA_API_BASE_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch notifications');
        
        const apiNotifications = await response.json();
        
        // Detect new notifications and status changes
        let needsComplaintReload = false;
        let needsNoticeReload = false;
        
        apiNotifications.forEach(n => {
            const existing = userNotifications.find(en => en.id === n.id);
            if (!existing) {
                // Skip if previously dismissed and status hasn't changed
                const dismissed = JSON.parse(localStorage.getItem('hms_user_dismissed_notifications') || '{}');
                if (dismissed[n.id] === n.status) return;
                if (dismissed[n.id] && dismissed[n.id] !== n.status) {
                    delete dismissed[n.id];
                    localStorage.setItem('hms_user_dismissed_notifications', JSON.stringify(dismissed));
                }
                if (n.type === 'complaint') needsComplaintReload = true;
                if (n.type === 'notice') needsNoticeReload = true;
                addUserNotification({
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
                userNotifications = userNotifications.filter(en => en.id !== n.id);
                addUserNotification({
                    type: n.type,
                    title: n.title,
                    message: n.message,
                    refId: n.refId,
                    timestamp: n.timestamp,
                    status: n.status,
                    id: n.id
                });
                showToast(n.title, 'info');
            }
        });
        
        if (needsComplaintReload) { loadUserComplaints(); loadUserPaymentStatus(); }
        if (needsNoticeReload) { loadNotices(); }
        
        // Remove notifications for notices that no longer exist (deleted by admin)
        const activeNoticeIds = apiNotifications.filter(n => n.type === 'notice').map(n => n.refId);
        if (activeNoticeIds.length > 0) {
            const removedCount = userNotifications.filter(n => n.type === 'notice' && !activeNoticeIds.includes(n.refId)).length;
            if (removedCount > 0) {
                userNotifications = userNotifications.filter(n => n.type !== 'notice' || activeNoticeIds.includes(n.refId));
                localStorage.setItem(getUserNotificationStorageKey(), JSON.stringify(userNotifications));
                renderUserNotifications();
                updateUserNotificationBadge();
            }
        }
        
    } catch (error) {
        console.error('Error checking for user notifications:', error);
    }
}

function addUserNotification(notification) {
    if (!notification.id) notification.id = Date.now();
    if (!notification.timestamp) notification.timestamp = new Date().toISOString();
    notification.read = false;
    
    if (userNotifications.some(n => n.id === notification.id)) return;
    
    userNotifications.unshift(notification);
    
    if (userNotifications.length > 50) {
        userNotifications = userNotifications.slice(0, 50);
    }
    
    localStorage.setItem(getUserNotificationStorageKey(), JSON.stringify(userNotifications));
    
    renderUserNotifications();
    updateUserNotificationBadge();
    
    showToast(notification.title, 'info');
}

function toggleNotificationPopup() {
    const popup = document.getElementById('notificationPopup');
    if (popup) {
        popup.classList.toggle('active');
    }
}

function markUserNotificationsAsRead(event) {
    if (event) event.stopPropagation();
    userNotifications.forEach(n => n.read = true);
    localStorage.setItem(getUserNotificationStorageKey(), JSON.stringify(userNotifications));
    renderUserNotifications();
    updateUserNotificationBadge();
}

function clearUserNotifications(event) {
    if (event) event.stopPropagation();
    const dismissed = {};
    userNotifications.forEach(n => { dismissed[n.id] = n.status; });
    localStorage.setItem('hms_user_dismissed_notifications', JSON.stringify(dismissed));
    userNotifications = [];
    localStorage.removeItem(getUserNotificationStorageKey());
    renderUserNotifications();
    updateUserNotificationBadge();
}

function renderUserNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;
    
    if (userNotifications.length === 0) {
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
    
    list.innerHTML = userNotifications.map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}">
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

function getNotificationTypeLabel(type) {
    const labels = {
        'complaint': 'Complaint',
        'request': 'Request',
        'notice': 'Notice',
        'request-approved': 'Approved',
        'request-rejected': 'Rejected',
        'complaint-resolved': 'Resolved',
        'complaint-progress': 'In Progress'
    };
    return labels[type] || 'Notice';
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

function updateUserNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const bell = document.getElementById('notificationBell');
    if (!badge || !bell) return;
    
    const unreadCount = userNotifications.filter(n => !n.read).length;
    badge.textContent = unreadCount;
    
    if (unreadCount > 0) {
        bell.classList.add('has-notifications');
    } else {
        bell.classList.remove('has-notifications');
    }
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
    initUserNotifications();
}

// Mobile menu toggle - always add this listener
document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.getElementById('menuToggleBtn');
    const closeBtn = document.getElementById('sidebarCloseBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function toggleMenu(show) {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) {
            console.log('Sidebar not found');
            return;
        }
        
        const shouldShow = show === undefined ? !sidebar.classList.contains('active') : show;
        sidebar.classList.toggle('active', shouldShow);
        if (sidebarOverlay) sidebarOverlay.classList.toggle('active', shouldShow);
        document.body.style.overflow = shouldShow ? 'hidden' : '';
    }

    if (menuBtn) {
        console.log('Menu button found, adding click listener');
        menuBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
        });
    } else {
        console.log('Menu button NOT found');
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            toggleMenu(false);
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function(e) {
            e.preventDefault();
            toggleMenu(false);
        });
    }
    
    // Also handle window resize to ensure visibility
    window.addEventListener('resize', function() {
        console.log('Window width:', window.innerWidth);
    });
});

// Close sidebar on mobile when nav item is clicked
function closeSidebarOnMobile() {
    if (window.innerWidth <= 1024) {
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}
