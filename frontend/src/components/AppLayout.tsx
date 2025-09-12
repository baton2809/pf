import React from 'react';
import { useAuth } from '../context/AuthContext';
import { SideMenu } from './SideMenu';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="app-container">
      {isAuthenticated && <SideMenu />}
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};