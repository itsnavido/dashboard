import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatNumber } from '../utils';

const PaymentEdit = ({ payment, onCancel, onSuccess }) => {
  const [formData, setFormData] = useState({
    time: '',
    userid: '',
    paymentDuration: '',
    realm: '',
    amount: '',
    price: '',
    note: '',
    gheymat: '',
    card: '',
    sheba: '',
    name: '',
    phone: '',
    wallet: '',
    admin: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (payment) {
      const gheymatValue = payment.gheymat || '';
      const formattedGheymat = gheymatValue ? formatNumber(parseFloat(gheymatValue.toString().replace(/,/g, '')) || 0) : '';
      setFormData({
        time: payment.time || '',
        userid: payment.userid || '',
        paymentDuration: payment.paymentDuration || '',
        realm: payment.realm || '',
        amount: payment.amount || '',
        price: payment.price || '',
        note: payment.note || '',
        gheymat: formattedGheymat,
        card: payment.card || '',
        sheba: payment.sheba || '',
        name: payment.name || '',
        phone: payment.phone || '',
        wallet: payment.wallet || '',
        admin: payment.admin || ''
      });
    }
  }, [payment]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Remove commas from gheymat before submission
      // Note: processed field is excluded - it's only managed in Google Sheets
      const submitData = {
        ...formData,
        gheymat: formData.gheymat ? formData.gheymat.toString().replace(/,/g, '') : ''
      };
      await api.put(`/payments/${payment.id}`, submitData);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error updating payment:', err);
      setError(err.response?.data?.error || 'Failed to update payment');
    } finally {
      setLoading(false);
    }
  };

  if (!payment) {
    return null;
  }

  return (
    <div className="box">
      <h2>Edit Payment</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
          <label>Time:</label>
          <input
            type="text"
            name="time"
            value={formData.time}
            onChange={handleChange}
          />

          <label>Discord ID:</label>
          <input
            type="text"
            name="userid"
            value={formData.userid}
            onChange={handleChange}
          />

          <label>Payment Duration:</label>
          <input
            type="text"
            name="paymentDuration"
            value={formData.paymentDuration}
            onChange={handleChange}
          />

          <label>Realm:</label>
          <input
            type="text"
            name="realm"
            value={formData.realm}
            onChange={handleChange}
          />

          <label>Amount:</label>
          <input
            type="text"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            inputMode="decimal"
            step="any"
          />

          <label>Price:</label>
          <input
            type="text"
            name="price"
            value={formData.price}
            onChange={handleChange}
            inputMode="decimal"
            step="any"
          />

          <label>Gheymat:</label>
          <input
            type="text"
            name="gheymat"
            value={formData.gheymat}
            onChange={(e) => {
              let value = e.target.value.replace(/,/g, '');
              
              // Allow decimal input - validate format
              if (value && !/^\d*\.?\d*$/.test(value)) {
                return; // Invalid input, don't update
              }
              
              // Format with decimals preserved
              if (value && !isNaN(parseFloat(value))) {
                const numValue = parseFloat(value);
                value = formatNumber(numValue, true); // Allow decimals
              } else if (value === '') {
                // Allow empty value
              } else {
                return; // Invalid, don't update
              }
              
              setFormData(prev => ({
                ...prev,
                gheymat: value
              }));
            }}
            inputMode="decimal"
            step="any"
          />

          <label>Note:</label>
          <input
            type="text"
            name="note"
            value={formData.note}
            onChange={handleChange}
          />

          <label>Card:</label>
          <input
            type="text"
            name="card"
            value={formData.card}
            onChange={handleChange}
          />

          <label>Sheba:</label>
          <input
            type="text"
            name="sheba"
            value={formData.sheba}
            onChange={handleChange}
          />

          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
          />

          <label>Phone:</label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
          />

          <label>Wallet:</label>
          <input
            type="text"
            name="wallet"
            value={formData.wallet}
            onChange={handleChange}
          />

          <label>Admin:</label>
          <input
            type="text"
            name="admin"
            value={formData.admin}
            onChange={handleChange}
          />

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentEdit;

