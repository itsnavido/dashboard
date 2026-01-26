import React from 'react';
import './KeyboardShortcutsHelp.css';

export const KeyboardShortcutsHelp = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: 'Ctrl + K', description: 'Focus search input' },
    { keys: 'Ctrl + N', description: 'Switch to New Payment' },
    { keys: 'Ctrl + L', description: 'Switch to Payment List' },
    { keys: 'Ctrl + ,', description: 'Open Settings' },
    { keys: 'Esc', description: 'Close modal/settings' },
  ];

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="shortcuts-close" onClick={onClose}>×</button>
        </div>
        <div className="shortcuts-content">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="shortcut-item">
              <div className="shortcut-keys">
                {shortcut.keys.split(' + ').map((key, i) => (
                  <React.Fragment key={i}>
                    <kbd>{key}</kbd>
                    {i < shortcut.keys.split(' + ').length - 1 && <span> + </span>}
                  </React.Fragment>
                ))}
              </div>
              <span className="shortcut-description">{shortcut.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

