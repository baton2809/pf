import React from 'react';

interface TabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { key: string; label: string }[];
}

export const TabNav: React.FC<TabNavProps> = ({ activeTab, onTabChange, tabs }) => {
  return (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid #e9ecef',
      marginBottom: '20px'
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          style={{
            padding: '12px 24px',
            border: 'none',
            backgroundColor: 'transparent',
            fontSize: '14px',
            fontWeight: activeTab === tab.key ? 600 : 400,
            color: activeTab === tab.key ? '#1a73e8' : '#5f6368',
            cursor: 'pointer',
            borderBottom: activeTab === tab.key ? '2px solid #1a73e8' : '2px solid transparent',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            if (activeTab !== tab.key) {
              e.currentTarget.style.color = '#202124';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== tab.key) {
              e.currentTarget.style.color = '#5f6368';
            }
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};