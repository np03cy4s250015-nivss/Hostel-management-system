// Global Configuration for Hostel Management System
const CONFIG = {
    // Backend API URL (change this when deploying)
    API_ORIGIN: window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
        ? 'http://127.0.0.1:3000' 
        : 'https://your-production-api-url.com',
        
    // Subdirectory path if the frontend is not hosted at the root domain
    // E.g. if hosted at https://example.com/hostel/, set this to '/hostel'
    BASE_PATH: '' 
};

// Helper to construct frontend URLs relative to the base path
function getFrontendUrl(path) {
    // Remove leading slash if present to avoid double slashes
    if (path.startsWith('/')) path = path.substring(1);
    const base = CONFIG.BASE_PATH ? CONFIG.BASE_PATH + '/' : '/';
    return base + path;
}
