import React, { useState } from 'react';

export type NavigationSection = 'new-session' | 'history' | 'leaderboard' | 'analytics' | 'settings' | 'settings-profile' | 'settings-integrations';

interface SidebarProps {
  activeSection: NavigationSection;
  onSectionChange: (section: NavigationSection) => void;
  isCollapsed: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange, isCollapsed, onMouseEnter, onMouseLeave }) => {
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  const navItems = [
    { id: 'new-session' as const, label: 'Новая тренировка', icon: '+' },
    { id: 'history' as const, label: 'История', icon: '≡' },
    { id: 'analytics' as const, label: 'Аналитика', icon: '⤴' },
    { id: 'leaderboard' as const, label: 'Лидерборд', icon: '#' },
    { id: 'settings' as const, label: 'Настройки аккаунта', icon: '⚙', hasSubmenu: true }
  ];

  const settingsSubmenu = [
    { id: 'settings-profile' as const, label: 'Профиль и аккаунт' },
    { id: 'settings-integrations' as const, label: 'Интеграции' }
  ];

  const handleSettingsClick = () => {
    setSettingsExpanded(!settingsExpanded);
  };

  const isSettingsActive = activeSection.startsWith('settings');

  return (
    <div 
      className={`app-sidebar ${isCollapsed ? 'collapsed' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <nav style={{ paddingTop: '0' }}>
        <ul className="sidebar-nav">
          {navItems.map(item => (
            <React.Fragment key={item.id}>
              <li className="sidebar-nav-item">
                <button
                  type="button"
                  onClick={() => {
                    if (item.hasSubmenu) {
                      handleSettingsClick();
                    } else {
                      onSectionChange(item.id);
                    }
                  }}
                  className={`sidebar-nav-link ${item.hasSubmenu ? (isSettingsActive ? 'active' : '') : (activeSection === item.id ? 'active' : '')}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  {!isCollapsed && (
                    <>
                      <span className="sidebar-nav-text">
                        {item.label}
                        {item.id === 'leaderboard' && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: 'rgb(243, 244, 246)',
                            color: 'rgb(107, 114, 128)',
                            fontSize: '10px',
                            fontWeight: 500,
                            border: '1px solid rgb(229, 231, 235)',
                            marginLeft: '6px'
                          }}>
                            Скоро
                          </span>
                        )}
                      </span>
                      {item.hasSubmenu && (
                        <span className={`sidebar-nav-arrow ${settingsExpanded ? 'expanded' : ''}`} style={{ marginLeft: 'auto' }}>
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 3L4 5L6 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      )}
                    </>
                  )}
                </button>
              </li>
              {item.hasSubmenu && settingsExpanded && !isCollapsed && (
                <ul className="sidebar-submenu">
                  {settingsSubmenu.map(subItem => (
                    <li key={subItem.id} className="sidebar-submenu-item">
                      <button
                        type="button"
                        onClick={() => onSectionChange(subItem.id)}
                        className={`sidebar-submenu-link ${activeSection === subItem.id ? 'active' : ''}`}
                      >
                        <span className="sidebar-submenu-text">{subItem.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </React.Fragment>
          ))}
        </ul>
      </nav>
    </div>
  );
};