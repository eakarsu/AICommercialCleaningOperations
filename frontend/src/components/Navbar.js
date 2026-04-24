import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/routes', label: 'Route Optimization', icon: '🗺️' },
    { path: '/supplies', label: 'Supply Forecasting', icon: '📦' },
    { path: '/inspections', label: 'Quality Verification', icon: '✅' },
    { path: '/contracts', label: 'Contract Pricing', icon: '💰' },
    { path: '/compliance', label: 'Compliance Tracking', icon: '📋' },
    { path: '/crews', label: 'Crew Management', icon: '👥' },
    { path: '/clients', label: 'Client Management', icon: '🏢' },
    { path: '/workorders', label: 'Work Orders', icon: '📝' },
    { path: '/equipment', label: 'Equipment', icon: '🔧' },
    { path: '/invoices', label: 'Invoicing & Billing', icon: '💳' },
    { path: '/incidents', label: 'Incident Reports', icon: '⚠️' },
    { path: '/timetracking', label: 'Time Tracking', icon: '⏱️' },
    { path: '/schedules', label: 'Scheduling', icon: '📅' },
    { path: '/expenses', label: 'Expense Tracking', icon: '💵' },
    { path: '/checklists', label: 'Checklists', icon: '✔️' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand">CleanOps AI</div>
      <div className="navbar-subtitle">Operations Platform</div>
      <div className="nav-links">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>
      <div className="nav-user">
        <div className="nav-user-info">
          <div className="nav-avatar">{user?.name?.charAt(0) || 'U'}</div>
          <div>
            <div className="nav-user-name">{user?.name}</div>
            <div className="nav-user-role">{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
      </div>
    </nav>
  );
};

export default Navbar;
