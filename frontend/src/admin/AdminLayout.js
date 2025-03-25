// src/admin/AdminLayout.js
import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AdminStyles.css';

const AdminLayout = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };
  
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h1>Survey Admin</h1>
        </div>
        
        <nav className="admin-nav">
          <NavLink 
            to="/admin" 
            end
            className={({ isActive }) => 
              isActive ? "admin-nav-link active" : "admin-nav-link"
            }
          >
            <i className="admin-icon">📝</i>
            Questions
          </NavLink>
          
          <NavLink 
            to="/admin/responses" 
            className={({ isActive }) => 
              isActive ? "admin-nav-link active" : "admin-nav-link"
            }
          >
            <i className="admin-icon">📊</i>
            Responses
          </NavLink>
          
          <NavLink 
            to="/admin/database" 
            className={({ isActive }) => 
              isActive ? "admin-nav-link active" : "admin-nav-link"
            }
          >
            <i className="admin-icon">🗄️</i>
            Database
          </NavLink>
        </nav>
        
        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <span>Logged in as: {currentUser?.username}</span>
          </div>
          <button onClick={handleLogout} className="admin-logout-button">
            Logout
          </button>
        </div>
      </aside>
      
      <main className="admin-main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;