import React, { useState, useEffect } from 'react';
import PaymentForm from '../components/PaymentForm';
import PaymentList from '../components/PaymentList';
import PaymentEdit from '../components/PaymentEdit';
import UserManagement from '../components/UserManagement';
import SellerManagement from '../components/SellerManagement';
import SettingsPanel from '../components/SettingsPanel';
import { ToastContainer } from '../components/Toast';
import { KeyboardShortcutsHelp } from '../components/KeyboardShortcutsHelp';
import { useToast } from '../hooks/useToast';
import { useKeyboardShortcuts, dashboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { authService } from '../services/auth';
import { useSettings } from '../contexts/SettingsContext';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('form');
  const [editingPayment, setEditingPayment] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { setIsSettingsOpen } = useSettings();
  const toast = useToast();

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    ...dashboardShortcuts,
    'ctrl+k': {
      ...dashboardShortcuts['ctrl+k'],
      handler: () => {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        } else {
          toast.info('No search available on this page');
        }
      },
    },
    'ctrl+n': {
      ...dashboardShortcuts['ctrl+n'],
      handler: () => {
        setActiveTab('form');
        setEditingPayment(null);
        toast.info('Switched to New Payment');
      },
    },
    'ctrl+l': {
      ...dashboardShortcuts['ctrl+l'],
      handler: () => {
        setActiveTab('list');
        setEditingPayment(null);
        toast.info('Switched to Payment List');
      },
    },
    'ctrl+,': {
      ...dashboardShortcuts['ctrl+,'],
      handler: () => {
        setIsSettingsOpen(true);
      },
    },
    'ctrl+?': {
      handler: () => {
        setShowShortcuts(true);
      },
      description: 'Show keyboard shortcuts',
    },
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
    } else {
      setUser(currentUser);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setActiveTab('edit');
  };

  const handleEditCancel = () => {
    setEditingPayment(null);
    setActiveTab('form');
  };

  const handleEditSuccess = () => {
    setEditingPayment(null);
    setActiveTab('list');
    setRefreshKey(prev => prev + 1);
    toast.success('Payment updated successfully!');
  };

  const handlePaymentSuccess = () => {
    setRefreshKey(prev => prev + 1);
    toast.success('Payment operation completed successfully!');
  };

  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--bg-primary)'
      }}>
        <div className="spinner spinner-medium">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'Admin';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div className="dashboard-header">
        <h1>Payment Dashboard</h1>
        <div className="dashboard-user-info">
          <button 
            onClick={() => setShowShortcuts(true)}
            className="btn-icon"
            title="Keyboard Shortcuts (Ctrl+?)"
            style={{ marginRight: '0.5rem' }}
          >
            ⌨️
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="btn-icon"
            title="Settings (Ctrl+,)"
            style={{ marginRight: '0.75rem' }}
          >
            ⚙️
          </button>
          <span>
            Welcome, <strong>{user.username}</strong> <span style={{ color: 'var(--text-tertiary)' }}>({user.role})</span>
          </span>
          <button onClick={handleLogout} className="btn-small">
            Logout
          </button>
        </div>
      </div>
      
      <SettingsPanel />
      <KeyboardShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => { setActiveTab('form'); setEditingPayment(null); }}
          data-tab="form"
          title="New Payment (Ctrl+N)"
        >
          New Payment
        </button>
        <button
          className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => { setActiveTab('list'); setEditingPayment(null); }}
          data-tab="list"
          title="Payment List (Ctrl+L)"
        >
          Payment List
        </button>
        <button
          className={`tab-button ${activeTab === 'sellers' ? 'active' : ''}`}
          onClick={() => { setActiveTab('sellers'); setEditingPayment(null); }}
          data-tab="sellers"
        >
          Seller Management
        </button>
        {isAdmin && (
          <button
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => { setActiveTab('users'); setEditingPayment(null); }}
            data-tab="users"
          >
            User Management
          </button>
        )}
      </div>

      <div className="content-area">
        {activeTab === 'form' && (
          <PaymentForm onSuccess={handlePaymentSuccess} />
        )}
        {activeTab === 'list' && (
          <PaymentList 
            key={refreshKey}
            onEdit={handleEdit}
            onDelete={handlePaymentSuccess}
          />
        )}
        {activeTab === 'edit' && editingPayment && (
          <PaymentEdit
            payment={editingPayment}
            onCancel={handleEditCancel}
            onSuccess={handleEditSuccess}
          />
        )}
        {activeTab === 'sellers' && (
          <SellerManagement />
        )}
        {activeTab === 'users' && isAdmin && (
          <UserManagement />
        )}
      </div>
    </div>
  );
};

export default Dashboard;

