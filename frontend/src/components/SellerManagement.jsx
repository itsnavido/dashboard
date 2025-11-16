import React, { useState } from 'react';
import api from '../services/api';

const SellerManagement = () => {
  const [searchDiscordId, setSearchDiscordId] = useState('');
  const [sellerInfo, setSellerInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    card: '',
    sheba: '',
    name: '',
    phone: '',
    wallet: ''
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchDiscordId.trim()) {
      setError('Please enter a Discord ID');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setSellerInfo(null);

    try {
      const discordId = searchDiscordId.replace(/\s/g, '');
      const response = await api.get(`/api/sellers/${discordId}`);
      
      if (response.data.error === 'Not Found') {
        // User not found, allow creating new entry
        setSellerInfo({ discordId, exists: false });
        setFormData({
          card: '',
          sheba: '',
          name: '',
          phone: '',
          wallet: ''
        });
      } else {
        // User found, populate form with existing data
        setSellerInfo({ discordId, exists: true });
        setFormData({
          card: response.data.card || '',
          sheba: response.data.sheba || '',
          name: response.data.name || '',
          phone: response.data.phone || '',
          wallet: response.data.wallet || ''
        });
      }
    } catch (err) {
      console.error('Error fetching seller info:', err);
      if (err.response?.status === 404 || err.response?.data?.error === 'Not Found') {
        // User not found, allow creating new entry
        setSellerInfo({ discordId: searchDiscordId.replace(/\s/g, ''), exists: false });
        setFormData({
          card: '',
          sheba: '',
          name: '',
          phone: '',
          wallet: ''
        });
      } else {
        setError(err.response?.data?.error || 'Failed to fetch seller information');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!sellerInfo) {
      setError('Please search for a user first');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/api/sellers', {
        discordId: sellerInfo.discordId,
        card: formData.card,
        sheba: formData.sheba,
        name: formData.name,
        phone: formData.phone,
        wallet: formData.wallet
      });

      setSuccess(sellerInfo.exists ? 'Seller information updated successfully!' : 'Seller information created successfully!');
      setSellerInfo({ ...sellerInfo, exists: true });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error saving seller info:', err);
      setError(err.response?.data?.error || 'Failed to save seller information');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSearchDiscordId('');
    setSellerInfo(null);
    setFormData({
      card: '',
      sheba: '',
      name: '',
      phone: '',
      wallet: ''
    });
    setError('');
    setSuccess('');
  };

  return (
    <div className="container">
      <div className="box">
        <h2>Seller Management</h2>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-color-medium)' }}>
          Search for a user by Discord ID to view or edit their information
        </p>

        <form onSubmit={handleSearch} style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="searchDiscordId">Discord ID:</label>
              <input
                type="text"
                id="searchDiscordId"
                value={searchDiscordId}
                onChange={(e) => setSearchDiscordId(e.target.value)}
                placeholder="Enter Discord ID"
                autoComplete="off"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-small">
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="success" style={{ marginBottom: '1rem' }}>
            {success}
          </div>
        )}

        {sellerInfo && (
          <div className="box" style={{ background: 'var(--gray-50)', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>
                {sellerInfo.exists ? 'Edit Seller Information' : 'Add New Seller Information'}
              </h3>
              <button onClick={handleReset} className="btn-small btn-secondary">
                Reset
              </button>
            </div>

            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fff', borderRadius: '0.5rem' }}>
              <strong>Discord ID:</strong> {sellerInfo.discordId}
            </div>

            <form onSubmit={handleSave}>
              <label htmlFor="card">شماره کارت (Card Number):</label>
              <input
                type="text"
                id="card"
                name="card"
                value={formData.card}
                onChange={handleInputChange}
                autoComplete="off"
              />

              <label htmlFor="sheba">شماره شبا (Sheba Number):</label>
              <input
                type="text"
                id="sheba"
                name="sheba"
                value={formData.sheba}
                onChange={handleInputChange}
                autoComplete="off"
              />

              <label htmlFor="name">نام و نام خانوادگی (Full Name):</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                autoComplete="off"
              />

              <label htmlFor="phone">شماره تماس (Phone Number):</label>
              <input
                type="text"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                autoComplete="off"
              />

              <label htmlFor="wallet">Wallet:</label>
              <input
                type="text"
                id="wallet"
                name="wallet"
                value={formData.wallet}
                onChange={handleInputChange}
                autoComplete="off"
              />

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : sellerInfo.exists ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={handleReset} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerManagement;

