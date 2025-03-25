// src/services/authService.js - Updated with role-based redirection
import api from './api';

// In-memory state for user data
let currentUserData = null;
let isAuthenticated = false;

// Add event listener for auth events
window.addEventListener('auth:logout', () => {
  authService.logout();
});

const authService = {
  // Login with username and password
  login: async (username, password) => {
    try {
      await api.auth.login(username, password);
      
      // Get user data after successful login
      await authService.fetchUserData();
      
      // Update auth state
      isAuthenticated = true;
      
      // Check role and redirect if admin
      const redirected = authService.redirectBasedOnRole();
      
      return { success: true, redirected };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },
  
  // Logout - clear auth state and call server logout endpoint
  logout: async () => {
    try {
      // Call server to invalidate session and clear cookies
      await api.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state even if server logout fails
      currentUserData = null;
      isAuthenticated = false;
    }
    return true;
  },
  
  // Check if user is logged in
  isAuthenticated: () => {
    return isAuthenticated;
  },
  
  // Check if current user is an admin
  isAdmin: () => {
    const userData = currentUserData;
    return userData?.role === 'admin' || 
           userData?.username === 'admin' ||
           (userData?.first_name === 'Admin' && userData?.last_name === 'User');
  },
  
  // Redirect user based on role
  redirectBasedOnRole: () => {
    if (authService.isAdmin()) {
      console.log('Admin user detected, redirecting to dashboard');
      
      // Only redirect if not already on admin page
      if (!window.location.hash.startsWith('#/admin')) {
        window.location.href = '/#/admin';
        return true;
      }
    }
    return false;
  },
  
  // Validate the token with the backend
  validateSession: async () => {
    try {
      const isValid = await api.auth.validateSession();
      isAuthenticated = isValid;
      return isValid;
    } catch (error) {
      console.error('Session validation failed:', error);
      isAuthenticated = false;
      return false;
    }
  },
  
  // Fetch and store current user data
  fetchUserData: async () => {
    try {
      const data = await api.auth.getUserData();
      
      // Get the token and extract the role
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('access_token='))
        ?.split('=')[1];
      
      if (token) {
        // Decode the token (without verification)
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Add the role from the token to the user data
        data.role = payload.role;
      }
      
      currentUserData = data;
      isAuthenticated = true;
      return data;
    } catch (error) {
      console.error('Error fetching user data:', error);
      if (error.response && error.response.status === 401) {
        isAuthenticated = false;
        currentUserData = null;
      }
      throw error;
    }
  },
  
  // Get current user data from memory
  getUserData: () => {
    return currentUserData;
  },
  
  // Initialize authentication on app load
  initAuth: async () => {
    try {
      // Validate session first
      const isValid = await authService.validateSession();
      
      if (isValid) {
        // If session is valid, fetch user data
        await authService.fetchUserData();
        
        // Check if redirection is needed based on role
        authService.redirectBasedOnRole();
      }
      
      return isValid;
    } catch (error) {
      console.error('Auth initialization failed:', error);
      isAuthenticated = false;
      currentUserData = null;
      return false;
    }
  }
};

export default authService;