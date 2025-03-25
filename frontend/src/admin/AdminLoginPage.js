// src/admin/AdminLogin.js
import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import { useNavigate } from 'react-router-dom';
import './AdminStyles.css';

function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Check if already logged in
  useEffect(() => {
    if (localStorage.getItem('admin_user')) {
      navigate('/admin');
    }
  }, [navigate]);

  // In AdminLogin.js, update the admin check:
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      
      // Use the shared auth service instead of local storage
      const result = await authService.login(username, password);
      
      if (result.success) {
        const userData = authService.getUserData();
        
        // Check for admin using the same logic
        const isAdmin = userData?.role === 'admin' || 
                      (userData?.first_name === 'Admin' && userData?.last_name === 'User') ||
                      userData?.username === 'admin';
        
        if (isAdmin) {
          navigate('/admin');
        } else {
          setError('You do not have admin privileges');
          await authService.logout();
        }
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <h1>Survey Admin Login</h1>
        
        {error && <div className="admin-error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter admin username"
            />
          </div>
          
          <div className="admin-form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          
          <button type="submit" className="admin-login-button">
            Login
          </button>
        </form>
        
        <div className="admin-login-help">
          <p>For demo purposes: username: admin, password: survey123</p>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;