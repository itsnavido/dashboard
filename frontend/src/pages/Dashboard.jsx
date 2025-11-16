import React, { useState, useEffect } from 'react';
import PaymentForm from '../components/PaymentForm';
import PaymentList from '../components/PaymentList';
import PaymentEdit from '../components/PaymentEdit';
import UserManagement from '../components/UserManagement';
import SellerManagement from '../components/SellerManagement';
import { authService } from '../services/auth';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('form');
  const [editingPayment, setEditingPayment] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
  };

  const handlePaymentSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const isAdmin = user.role === 'Admin';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div className="dashboard-header">
        <h1>Payment Dashboard</h1>
        <div className="dashboard-user-info">
          <span>
            Welcome, <strong>{user.username}</strong> <span style={{ color: 'var(--text-tertiary)' }}>({user.role})</span>)
          </span>
          <button onClick={handleLogout} className="btn-small">
            Logout
          </button>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => { setActiveTab('form'); setEditingPayment(null); }}
        >
          New Payment
        </button>
        <button
          className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => { setActiveTab('list'); setEditingPayment(null); }}
        >
          Payment List
        </button>
        <button
          className={`tab-button ${activeTab === 'sellers' ? 'active' : ''}`}
          onClick={() => { setActiveTab('sellers'); setEditingPayment(null); }}
        >
          Seller Management
        </button>
        {isAdmin && (
          <button
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => { setActiveTab('users'); setEditingPayment(null); }}
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

