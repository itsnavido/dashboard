import { useEffect } from 'react';

export const useKeyboardShortcuts = (shortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable elements
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const ctrlOrCmd = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const alt = event.altKey;

      // Build key combination string
      let combination = '';
      if (ctrlOrCmd) combination += 'ctrl+';
      if (alt) combination += 'alt+';
      if (shift) combination += 'shift+';
      combination += key;

      // Check if this combination matches any shortcut
      const shortcut = shortcuts[combination];
      if (shortcut) {
        event.preventDefault();
        shortcut.handler(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};

// Common keyboard shortcuts for the dashboard
export const dashboardShortcuts = {
  'ctrl+k': {
    handler: () => {
      // Focus search input
      const searchInput = document.querySelector('.search-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    },
    description: 'Focus search',
  },
  'ctrl+n': {
    handler: () => {
      // Navigate to new payment
      const newPaymentTab = document.querySelector('[data-tab="form"]');
      if (newPaymentTab) {
        newPaymentTab.click();
      }
    },
    description: 'New payment',
  },
  'ctrl+l': {
    handler: () => {
      // Navigate to payment list
      const listTab = document.querySelector('[data-tab="list"]');
      if (listTab) {
        listTab.click();
      }
    },
    description: 'Payment list',
  },
  'ctrl+,': {
    handler: () => {
      // Open settings
      const settingsButton = document.querySelector('.btn-icon[title="Settings"]');
      if (settingsButton) {
        settingsButton.click();
      }
    },
    description: 'Open settings',
  },
  'escape': {
    handler: () => {
      // Close modals/settings
      const settingsPanel = document.querySelector('.settings-overlay');
      if (settingsPanel && settingsPanel.style.display !== 'none') {
        const closeButton = settingsPanel.querySelector('.settings-close-btn');
        if (closeButton) closeButton.click();
      }
    },
    description: 'Close modal',
  },
};

