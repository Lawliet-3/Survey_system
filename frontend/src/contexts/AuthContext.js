// src/contexts/AuthContext.js - Updated with role-based handling
import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuth, setIsAuth] = useState(false);

  // Initialize auth when component mounts
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check if session is valid and initialize auth
        const isAuthenticated = await authService.initAuth();
        
        if (isAuthenticated) {
          const userData = authService.getUserData();
          setCurrentUser(userData);
          setIsAuth(true);
        } else {
          setCurrentUser(null);
          setIsAuth(false);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError('Authentication failed. Please try again.');
        setCurrentUser(null);
        setIsAuth(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
    
    // Set up event listener for auth state changes
    const handleAuthChange = (event) => {
      if (event.type === 'auth:logout') {
        setCurrentUser(null);
        setIsAuth(false);
      }
    };
    
    window.addEventListener('auth:logout', handleAuthChange);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('auth:logout', handleAuthChange);
    };
  }, []);

  // Handle user login
  const login = async (username, password) => {
    try {
      setError(null);
      setLoading(true);
      
      // Call login service
      const result = await authService.login(username, password);
      
      // Update user state if login was successful
      const userData = authService.getUserData();
      setCurrentUser(userData);
      setIsAuth(true);
      
      setTimeout(() => {
        const surveyData = getSurveyData();
        console.log("User status check after login:", {
          latestPurchase: surveyData?.latestPurchase?.purchase_date,
          isLapser: surveyData?.userStatus === "Lapser",
          status: surveyData?.userStatus
        });
      }, 100);

      return { 
        success: true, 
        redirected: result.redirected || false 
      };
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Handle user logout
  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      // Even if server logout fails, clear local state
      setCurrentUser(null);
      setIsAuth(false);
    }
  };

  // Provide survey-specific data
  const getSurveyData = () => {
    if (!currentUser) return null;
    
    // Calculate user status based on latest purchase
    let userStatus = "No Purchase";
    
    console.log("Latest purchase data:", currentUser.latest_purchase);
    
    if (currentUser.latest_purchase && currentUser.latest_purchase.purchase_date) {
      const purchaseDate = new Date(currentUser.latest_purchase.purchase_date);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      userStatus = purchaseDate >= twoYearsAgo ? "User" : "Lapser";
      
      console.log("Purchase date calculation:", {
        purchaseDate,
        twoYearsAgo,
        isRecent: purchaseDate >= twoYearsAgo
      });
    }

    // Format the data specifically for the survey
    return {
      // D1: Income range
      incomeRange: currentUser.income_range,
      
      // D2a: Marital status
      maritalStatus: currentUser.marital_status,
      
      // D2b: Has children
      hasChildren: currentUser.has_children,
      
      // Location data for survey logic
      province: currentUser.province,

      userStatus: userStatus,
      
      // User role
      role: currentUser.role,
      
      // For P8a and P9a: Most recent purchase
      latestPurchase: currentUser.latest_purchase
        ? {
            brand: currentUser.latest_purchase.brand,
            productType: currentUser.latest_purchase.product_type,
            productName: currentUser.latest_purchase.product_name,
            purchaseDate: new Date(currentUser.latest_purchase.purchase_date),
            storeLocation: currentUser.latest_purchase.store_location
          }
        : null
    };
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    logout,
    isAuthenticated: isAuth,
    getSurveyData,
    isAdmin: () => authService.isAdmin()
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;