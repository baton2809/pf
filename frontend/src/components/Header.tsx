import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const getUserInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().replace(/[^A-ZА-Я]/g, '');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <div className="app-header">
      <div className="header-content">
        <div className="header-logo">PitchForge</div>
        <div className="user-info" style={{ position: 'relative' }} ref={dropdownRef}>
          <span>{currentUser?.email}</span>
          <div 
            className="user-avatar" 
            onClick={toggleDropdown}
            style={{ cursor: 'pointer' }}
          >
            {currentUser ? getUserInitials(currentUser.name) : 'U'}
          </div>
          
          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: '0',
              marginTop: '8px',
              backgroundColor: 'white',
              border: '1px solid #e8eaed',
              borderRadius: '8px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
              minWidth: '180px',
              zIndex: 1000
            }}>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: '#ea4335',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.outline = 'none';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.outline = 'none';
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};