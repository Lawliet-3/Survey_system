// src/components/UserInfo.js
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './UserInfo.css';

function UserInfo() {
  const { currentUser, logout } = useAuth();
  
  if (!currentUser) return null;
  
  const handleLogout = async () => {
    await logout();
    window.location.reload(); // Reload to show login page
  };
  
  return (
    <div className="user-info-container">
      <div className="user-details">
        <span className="user-name">
          {currentUser.first_name} {currentUser.last_name}
        </span>
        {currentUser.role && (
          <span className="user-role">
            ({currentUser.role === 'admin' ? 'Administrator' : 'Respondent'})
          </span>
        )}
      </div>
      <button onClick={handleLogout} className="logout-button">
        Logout
      </button>
    </div>
  );
}

export default UserInfo;