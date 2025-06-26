import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Sidebar({ user }) {
  const location = useLocation();

  const menuItems = [
    // Admin-only routes
    ...(user?.role === 'admin' ? [
      { path: '/dashboard', label: 'Dashboard', icon: '📊' },
      { path: '/inventory', label: 'Inventory', icon: '📦' },
      { path: '/users', label: 'Users', icon: '👥' },
    ] : []),
    
    { path: '/billing', label: 'Billing', icon: '💳' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Menu</h3>
        <span className="user-role">{user?.role || 'User'}</span>
      </div>
      <nav>
        <ul>
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link 
                to={item.path}
                className={location.pathname === item.path ? 'active' : ''}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-text">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default Sidebar;