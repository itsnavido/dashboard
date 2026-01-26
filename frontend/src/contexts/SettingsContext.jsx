import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

const defaultSettings = {
  theme: {
    primaryColor: '#6366f1', // Modern indigo
    secondaryColor: '#8b5cf6', // Purple
    accentColor: '#06b6d4', // Cyan
    backgroundColor: '#0f172a', // Slate 900
    cardBackground: '#1e293b', // Slate 800
    textColor: '#f1f5f9', // Slate 100
    borderColor: '#334155', // Slate 700
  },
  layout: {
    sidebarWidth: '280px',
    headerHeight: '64px',
    borderRadius: '12px',
    spacing: 'medium', // small, medium, large
  },
  display: {
    fontSize: 'medium', // small, medium, large
    density: 'comfortable', // compact, comfortable, spacious
    animations: true,
    shadows: true,
  },
  table: {
    itemsPerPage: 50,
    showRowNumbers: false,
    stickyHeader: true,
  },
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('appSettings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    applySettings(settings);
  }, [settings]);

  const applySettings = (newSettings) => {
    const root = document.documentElement;
    const theme = newSettings.theme;
    const layout = newSettings.layout;
    const display = newSettings.display;

    // Apply theme colors
    root.style.setProperty('--primary', theme.primaryColor);
    root.style.setProperty('--primary-dark', adjustBrightness(theme.primaryColor, -20));
    root.style.setProperty('--primary-light', adjustBrightness(theme.primaryColor, 20));
    root.style.setProperty('--secondary', theme.secondaryColor);
    root.style.setProperty('--accent', theme.accentColor);
    root.style.setProperty('--bg-primary', theme.backgroundColor);
    root.style.setProperty('--bg-card', theme.cardBackground);
    root.style.setProperty('--text-primary', theme.textColor);
    root.style.setProperty('--border-color', theme.borderColor);

    // Apply layout
    root.style.setProperty('--sidebar-width', layout.sidebarWidth);
    root.style.setProperty('--header-height', layout.headerHeight);
    root.style.setProperty('--radius', layout.borderRadius);

    // Apply spacing
    const spacingMap = { small: '0.5rem', medium: '1rem', large: '1.5rem' };
    root.style.setProperty('--spacing', spacingMap[layout.spacing] || '1rem');

    // Apply font size
    const fontSizeMap = { small: '14px', medium: '16px', large: '18px' };
    root.style.setProperty('--base-font-size', fontSizeMap[display.fontSize] || '16px');

    // Apply density
    const densityMap = {
      compact: { padding: '0.5rem', gap: '0.5rem' },
      comfortable: { padding: '1rem', gap: '1rem' },
      spacious: { padding: '1.5rem', gap: '1.5rem' },
    };
    const density = densityMap[display.density] || densityMap.comfortable;
    root.style.setProperty('--density-padding', density.padding);
    root.style.setProperty('--density-gap', density.gap);

    // Apply animations
    if (!display.animations) {
      root.style.setProperty('--transition-duration', '0s');
    } else {
      root.style.setProperty('--transition-duration', '0.2s');
    }

    // Apply shadows
    if (!display.shadows) {
      root.style.setProperty('--shadow-sm', 'none');
      root.style.setProperty('--shadow-md', 'none');
      root.style.setProperty('--shadow-lg', 'none');
    } else {
      root.style.setProperty('--shadow-sm', '0 2px 4px rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--shadow-md', '0 4px 6px rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--shadow-lg', '0 10px 15px rgba(0, 0, 0, 0.1)');
    }
  };

  const adjustBrightness = (color, percent) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  };

  const updateSettings = (category, updates) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        ...updates,
      },
    }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const value = {
    settings,
    updateSettings,
    resetSettings,
    isSettingsOpen,
    setIsSettingsOpen,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

