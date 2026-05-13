// ============================================
// Hostel Management System - Main JavaScript
// ============================================

const API_BASE_URL = 'http://127.0.0.1:3000/api/auth';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    checkAuth();
});

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
    
    if (!username || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showError(data.error || 'Login failed');
            return;
        }
        
        const session = {
            username: data.user.username,
            name: data.user.name,
            role: data.user.role,
            email: data.user.email,
            token: data.token,
            loginTime: new Date().toISOString()
        };
        
        const rememberMe = document.getElementById('remember')?.checked;
        
        if (rememberMe) {
            localStorage.setItem('hms_session', JSON.stringify(session));
        } else {
            sessionStorage.setItem('hms_session', JSON.stringify(session));
        }
        
        if (data.user.role === 'admin') {
            window.location.href = 'frontend/dashboard_admin.html#dashboard';
        } else {
            window.location.href = 'frontend/dashboard_user.html';
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Unable to connect to server. Please try again.');
    }
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    const loginCard = document.querySelector('.login-card');
    loginCard.style.animation = 'none';
    setTimeout(() => {
        loginCard.style.animation = 'shake 0.5s ease';
    }, 10);
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
    } else {
        passwordInput.type = 'password';
        eyeIcon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        `;
    }
}

function checkAuth() {
    let session = localStorage.getItem('hms_session') || sessionStorage.getItem('hms_session');
    
    if (!session) {
        const currentPage = window.location.pathname;
        if (currentPage.includes('dashboard')) {
            window.location.href = '../index.html';
        }
        return;
    }
    
    const userData = JSON.parse(session);
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('index.html') || currentPage.endsWith('/')) {
        if (userData.role === 'admin') {
            window.location.href = 'frontend/dashboard_admin.html#dashboard';
        } else {
            window.location.href = 'frontend/dashboard_user.html';
        }
    } else if (currentPage.includes('dashboard')) {
        if (!window.location.hash) {
            window.location.hash = 'dashboard';
        }
    }
}

function logout() {
    localStorage.removeItem('hms_session');
    sessionStorage.removeItem('hms_session');
    window.location.href = '../index.html';
}

function getCurrentUser() {
    let session = localStorage.getItem('hms_session') || sessionStorage.getItem('hms_session');
    if (!session) {
        window.location.href = '../index.html';
        return null;
    }
    return JSON.parse(session);
}

function getAuthToken() {
    let session = localStorage.getItem('hms_session') || sessionStorage.getItem('hms_session');
    if (!session) return null;
    const userData = JSON.parse(session);
    return userData.token || null;
}

function initDashboard() {
    const user = getCurrentUser();
    if (!user) return;
    
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userInitials = document.getElementById('userInitials');
    
    if (userName) userName.textContent = user.name;
    if (userRole) userRole.textContent = user.role === 'admin' ? 'Administrator' : 'Student';
    if (userInitials) userInitials.textContent = getInitials(user.name);
    
    initSidebar();
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function initSidebar() {
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const sidebarCloseBtn = document.querySelector('.sidebar-close-btn');
    
    function toggleSidebar(show) {
        if (!sidebar) return;
        
        if (show === undefined) {
            sidebar.classList.toggle('active');
        } else {
            sidebar.classList.toggle('active', show);
        }
        
        const isActive = sidebar.classList.contains('active');
        
        if (menuToggle) {
            menuToggle.classList.toggle('active', isActive);
        }
        
        if (sidebarOverlay) {
            sidebarOverlay.classList.toggle('active', isActive);
        }
        
        document.body.style.overflow = isActive ? 'hidden' : '';
    }
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => toggleSidebar());
    }
    
    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', () => toggleSidebar(false));
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => toggleSidebar(false));
    }
    
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                toggleSidebar(false);
            }
        }
    });
    
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && sidebar) {
            toggleSidebar(false);
        }
    });
    
    const navItems = document.querySelectorAll('.nav-item');
    const currentPage = window.location.pathname.split('/').pop();
    
    navItems.forEach(item => {
        const href = item.getAttribute('href') || '';
        if (href === currentPage || (currentPage === '' && href.includes('dashboard'))) {
            item.classList.add('active');
        }
    });
}

function showToast(message, type = 'success') {
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = getToastIcon(type);
    
    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlide 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function getToastIcon(type) {
    const icons = {
        success: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        error: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        warning: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
    };
    return icons[type] || icons.success;
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        
        // Reset form and room dropdown when opening add student modal
        if (modalId === 'addStudentModal') {
            const form = document.getElementById('addStudentForm');
            if (form) form.reset();
            const roomSelect = document.getElementById('studentRoom');
            if (roomSelect) {
                roomSelect.innerHTML = '<option value="">Select Room</option>';
            }
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAllModals();
    }
});

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(date) {
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// ============================================
// Theme Management System
// ============================================

/**
 * Initialize theme on page load - called from dashboard JS files
 * Theme is loaded from backend preferences; fall back to light
 */
function initTheme() {
    applyTheme('light');
}

/**
 * Apply theme to document
 * @param {string} theme - 'light', 'dark', or 'auto'
 */
function applyTheme(theme) {
    const root = document.documentElement;
    
    if (theme === 'auto') {
        // Check system preference
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
    }
    
    if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
    } else {
        root.removeAttribute('data-theme');
    }
}

/**
 * Get current effective theme - reads from DOM attribute
 * @returns {string} 'light' or 'dark'
 */
function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

/**
 * Apply theme to document (previously saved to localStorage, now handled via backend)
 * @param {string} theme - 'light', 'dark', or 'auto'
 */
function saveTheme(theme) {
    applyTheme(theme);
}

// Close sidebar on mobile when nav item is clicked
function closeSidebarMobile() {
    if (window.innerWidth <= 1024) {
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.querySelector('.sidebar-overlay');
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}
