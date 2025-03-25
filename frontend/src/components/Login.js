// src/components/Login.js - Updated to handle role-based redirection
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService'; // Add this import
import './Login.css';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Simple validation
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      console.log(`Attempting login with username: ${username}`);
      
      const result = await login(username, password);
      
      console.log('Login result:', result);
      
      if (result.success) {
        console.log('Login successful');
        
        // Check if user is an admin and was redirected
        if (!result.redirected) {
          // If not redirected (not admin), call normal success handler
          if (onLoginSuccess) {
            onLoginSuccess();
          }
        }
        // If redirected to admin, the page will change anyway
      } else {
        console.error('Login failed:', result.error);
        setError(`Login failed: ${result.error || 'Please check your credentials'}`);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(`Login error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Customer Login</h2>
        <p className="login-description">
          Please log in to continue with the survey. Your responses will be linked to your account.
        </p>
        
        {error && <div className="login-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="login-help">
          <p>For demonstration purposes, you can use any of these accounts:</p>
          <ul>
            <li>Username: <strong>somchai</strong>, Password: <strong>hashed_password_1</strong></li>
            <li>Username: <strong>naree</strong>, Password: <strong>hashed_password_2</strong></li>
            <li>Username: <strong>admin</strong>, Password: <strong>survey123</strong> (Admin)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Login;