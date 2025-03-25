import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

const ProtectedAdminRoute = ({ children }) => {
  // Add console logs to debug
  console.log("Protected route checking auth status");
  
  // Get authentication status
  const isAuthenticated = authService.isAuthenticated();
  const userData = authService.getUserData();
  
  // More detailed console logs
  console.log("Auth status:", { isAuthenticated, userData });
  
  // Check for admin status by EITHER role OR username
  const isAdmin = userData?.role === 'admin' || 
                 (userData?.first_name === 'Admin' && userData?.last_name === 'User') ||
                 userData?.username === 'admin';
  
  console.log("Is admin:", isAdmin);
  
  if (!isAuthenticated || !isAdmin) {
    console.log("Access denied, redirecting to admin login");
    return <Navigate to="/admin/login" replace />;
  }

  console.log("Access granted, showing admin dashboard");
  return children;
};

export default ProtectedAdminRoute;