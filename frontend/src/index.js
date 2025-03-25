// src/index.js
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './index.css';
import App from './App';
import AdminDashboard from './admin/AdminDashboard';
import ResponsesView from './admin/ResponsesView';
import DatabaseInit from './admin/DatabaseInit';
import { AuthProvider } from './contexts/AuthContext';
import authService from './services/authService';

const container = document.getElementById('root');
const root = createRoot(container);

// Create a redirect component specifically for admin login
const AdminLoginRedirect = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log("AdminLoginRedirect: Redirecting to dashboard");
    navigate('/admin', { replace: true });
  }, [navigate]);
  
  return <div>Redirecting to admin dashboard...</div>;
};

// Improved AdminRoute that won't use Navigate
const AdminRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  const userData = authService.getUserData();
  const navigate = useNavigate();
  const location = useLocation();
  
  console.log("AdminRoute: Checking auth at", location.pathname);
  console.log("Auth status:", { isAuthenticated, userData });
  
  useEffect(() => {
    // Handle redirects in useEffect to avoid React Router issues
    if (!isAuthenticated) {
      console.log("Not authenticated, redirecting to main login");
      navigate('/', { replace: true });
      return;
    }
    
    // Check for admin status
    const isAdmin = userData?.role === 'admin' || 
                  userData?.username === 'admin' || 
                  (userData?.first_name === 'Admin' && userData?.last_name === 'User');
    
    if (!isAdmin) {
      console.log("User not admin, redirecting to survey");
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, userData, navigate]);
  
  // Just render the children for admin users
  return children;
};

root.render(
  <React.StrictMode>
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public route for the survey / login */}
          <Route path="/" element={<App />} />
          
          {/* Admin routes with protection */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/responses" element={<AdminRoute><ResponsesView /></AdminRoute>} />
          <Route path="/admin/database" element={<AdminRoute><DatabaseInit /></AdminRoute>} />
          
          {/* Special route for admin login - explicit redirect component */}
          <Route path="/admin/login" element={<AdminLoginRedirect />} />
          
          {/* Fallback redirect */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  </React.StrictMode>
);