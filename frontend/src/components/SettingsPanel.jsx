import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import './SettingsPanel.css';

const SettingsPanel = () => {
  const { settings, updateSettings, resetSettings, isSettingsOpen, setIsSettingsOpen } = useSettings();
  const [activeTab, setActiveTab] = useState('theme');

  if (!isSettingsOpen) return null;

  return (
    <div className="settings-overlay" onClick={() => setIsSettingsOpen(false)}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button 
            className="settings-close-btn"
            onClick={() => setIsSettingsOpen(false)}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={activeTab === 'theme' ? 'active' : ''}
            onClick={() => setActiveTab('theme')}
          >
            Theme
          </button>
          <button
            className={activeTab === 'layout' ? 'active' : ''}
            onClick={() => setActiveTab('layout')}
          >
            Layout
          </button>
          <button
            className={activeTab === 'display' ? 'active' : ''}
            onClick={() => setActiveTab('display')}
          >
            Display
          </button>
          <button
            className={activeTab === 'table' ? 'active' : ''}
            onClick={() => setActiveTab('table')}
          >
            Table
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'theme' && (
            <div className="settings-section">
              <h3>Color Theme</h3>
              <div className="settings-group">
                <label>Primary Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={settings.theme.primaryColor}
                    onChange={(e) => updateSettings('theme', { primaryColor: e.target.value })}
                  />
                  <input
                    type="text"
                    value={settings.theme.primaryColor}
                    onChange={(e) => updateSettings('theme', { primaryColor: e.target.value })}
                    className="color-text-input"
                  />
                </div>
              </div>

              <div className="settings-group">
                <label>Secondary Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={settings.theme.secondaryColor}
                    onChange={(e) => updateSettings('theme', { secondaryColor: e.target.value })}
                  />
                  <input
                    type="text"
                    value={settings.theme.secondaryColor}
                    onChange={(e) => updateSettings('theme', { secondaryColor: e.target.value })}
                    className="color-text-input"
                  />
                </div>
              </div>

              <div className="settings-group">
                <label>Accent Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={settings.theme.accentColor}
                    onChange={(e) => updateSettings('theme', { accentColor: e.target.value })}
                  />
                  <input
                    type="text"
                    value={settings.theme.accentColor}
                    onChange={(e) => updateSettings('theme', { accentColor: e.target.value })}
                    className="color-text-input"
                  />
                </div>
              </div>

              <div className="settings-group">
                <label>Background Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={settings.theme.backgroundColor}
                    onChange={(e) => updateSettings('theme', { backgroundColor: e.target.value })}
                  />
                  <input
                    type="text"
                    value={settings.theme.backgroundColor}
                    onChange={(e) => updateSettings('theme', { backgroundColor: e.target.value })}
                    className="color-text-input"
                  />
                </div>
              </div>

              <div className="settings-group">
                <label>Card Background</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={settings.theme.cardBackground}
                    onChange={(e) => updateSettings('theme', { cardBackground: e.target.value })}
                  />
                  <input
                    type="text"
                    value={settings.theme.cardBackground}
                    onChange={(e) => updateSettings('theme', { cardBackground: e.target.value })}
                    className="color-text-input"
                  />
                </div>
              </div>

              <div className="preset-themes">
                <h4>Preset Themes</h4>
                <div className="theme-presets">
                  <button
                    className="theme-preset"
                    onClick={() => {
                      updateSettings('theme', {
                        primaryColor: '#6366f1',
                        secondaryColor: '#8b5cf6',
                        accentColor: '#06b6d4',
                        backgroundColor: '#0f172a',
                        cardBackground: '#1e293b',
                      });
                    }}
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                  >
                    Indigo
                  </button>
                  <button
                    className="theme-preset"
                    onClick={() => {
                      updateSettings('theme', {
                        primaryColor: '#ec4899',
                        secondaryColor: '#f472b6',
                        accentColor: '#f59e0b',
                        backgroundColor: '#1e1b4b',
                        cardBackground: '#312e81',
                      });
                    }}
                    style={{ background: 'linear-gradient(135deg, #ec4899, #f472b6)' }}
                  >
                    Pink
                  </button>
                  <button
                    className="theme-preset"
                    onClick={() => {
                      updateSettings('theme', {
                        primaryColor: '#10b981',
                        secondaryColor: '#34d399',
                        accentColor: '#06b6d4',
                        backgroundColor: '#064e3b',
                        cardBackground: '#065f46',
                      });
                    }}
                    style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}
                  >
                    Green
                  </button>
                  <button
                    className="theme-preset"
                    onClick={() => {
                      updateSettings('theme', {
                        primaryColor: '#3b82f6',
                        secondaryColor: '#60a5fa',
                        accentColor: '#06b6d4',
                        backgroundColor: '#1e3a8a',
                        cardBackground: '#1e40af',
                      });
                    }}
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #60a5fa)' }}
                  >
                    Blue
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="settings-section">
              <h3>Layout Settings</h3>
              
              <div className="settings-group">
                <label>Sidebar Width</label>
                <input
                  type="range"
                  min="200"
                  max="400"
                  value={parseInt(settings.layout.sidebarWidth)}
                  onChange={(e) => updateSettings('layout', { sidebarWidth: `${e.target.value}px` })}
                />
                <span className="setting-value">{settings.layout.sidebarWidth}</span>
              </div>

              <div className="settings-group">
                <label>Border Radius</label>
                <input
                  type="range"
                  min="4"
                  max="24"
                  value={parseInt(settings.layout.borderRadius)}
                  onChange={(e) => updateSettings('layout', { borderRadius: `${e.target.value}px` })}
                />
                <span className="setting-value">{settings.layout.borderRadius}</span>
              </div>

              <div className="settings-group">
                <label>Spacing</label>
                <select
                  value={settings.layout.spacing}
                  onChange={(e) => updateSettings('layout', { spacing: e.target.value })}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'display' && (
            <div className="settings-section">
              <h3>Display Settings</h3>
              
              <div className="settings-group">
                <label>Font Size</label>
                <select
                  value={settings.display.fontSize}
                  onChange={(e) => updateSettings('display', { fontSize: e.target.value })}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              <div className="settings-group">
                <label>Density</label>
                <select
                  value={settings.display.density}
                  onChange={(e) => updateSettings('display', { density: e.target.value })}
                >
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="spacious">Spacious</option>
                </select>
              </div>

              <div className="settings-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.display.animations}
                    onChange={(e) => updateSettings('display', { animations: e.target.checked })}
                  />
                  <span>Enable Animations</span>
                </label>
              </div>

              <div className="settings-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.display.shadows}
                    onChange={(e) => updateSettings('display', { shadows: e.target.checked })}
                  />
                  <span>Enable Shadows</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'table' && (
            <div className="settings-section">
              <h3>Table Settings</h3>
              
              <div className="settings-group">
                <label>Items Per Page</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  step="10"
                  value={settings.table.itemsPerPage}
                  onChange={(e) => updateSettings('table', { itemsPerPage: parseInt(e.target.value) })}
                />
              </div>

              <div className="settings-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.table.showRowNumbers}
                    onChange={(e) => updateSettings('table', { showRowNumbers: e.target.checked })}
                  />
                  <span>Show Row Numbers</span>
                </label>
              </div>

              <div className="settings-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.table.stickyHeader}
                    onChange={(e) => updateSettings('table', { stickyHeader: e.target.checked })}
                  />
                  <span>Sticky Header</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="reset-btn" onClick={resetSettings}>
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;

