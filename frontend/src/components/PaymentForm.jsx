import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatNumber } from '../utils';

const PaymentForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    discordId: '',
    paymentType: '',
    paymentTime: 'lahzei',
    realm: '',
    customRealm: '',
    amount: '',
    price: '',
    gheymat: '',
    note: ''
  });

  // Recalculate gheymat when paymentType or paymentTime changes (for Gold payments)
  useEffect(() => {
    if (formData.paymentType === 'Gold') {
      const amountStr = (formData.amount || '').replace(/,/g, '');
      const priceStr = (formData.price || '').replace(/,/g, '');
      const amount = parseFloat(amountStr);
      const price = parseFloat(priceStr);
      
      if (!isNaN(amount) && !isNaN(price) && amount > 0 && price > 0) {
        let gheymat = amount * price;
        if (formData.paymentTime !== 'usdt days') {
          gheymat = amount * price * 10;
        }
        setFormData(prev => {
          // Only update if the calculated value is different to avoid infinite loops
          const newGheymat = formatNumber(gheymat, true);
          if (prev.gheymat !== newGheymat) {
            return {
              ...prev,
              gheymat: newGheymat // Show total amount with decimals
            };
          }
          return prev;
        });
      } else if (!amountStr && !priceStr) {
        // Clear gheymat if both are empty
        setFormData(prev => prev.gheymat ? { ...prev, gheymat: '' } : prev);
      }
    } else if (formData.paymentType === 'Naghdi' && formData.gheymat && formData.amount && formData.price) {
      // Clear auto-calculated gheymat when switching to Naghdi (user will enter manually)
      setFormData(prev => ({
        ...prev,
        gheymat: ''
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.paymentType, formData.paymentTime]);

  const [sellerInfo, setSellerInfo] = useState({
    shomareSheba: '',
    shomareKart: '',
    name: '',
    shomareTamas: '',
    rank: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [userFound, setUserFound] = useState(false);

  const paymentDurationOptions = [
    { value: 'lahzei', label: 'lahzei' },
    { value: '12-24 hours', label: '12-24' },
    { value: '24-48 hours', label: '24-48' },
    { value: '2-3 days', label: '2-3' },
    { value: '3-5 days', label: '3-5' },
    { value: '5-10 days', label: '5-10' },
    { value: 'usdt days', label: 'USDT' }
  ];

  const realmOptions = [
    { value: '', label: 'Select a Realm' },
    { value: 'Retail', label: 'Retail' },
    { value: 'POE', label: 'POE' },
    { value: 'Classic', label: 'Classic' },
    { value: 'Custom', label: 'Custom' }
  ];

  const fetchSellerData = async () => {
    const discordId = formData.discordId.replace(/\s/g, '');
    if (!discordId) return;

    try {
      const response = await api.get(`/api/sellers/${discordId}`);
      
      if (response.data.error === 'Not Found') {
        setMessage('کاربر یافت نشد! لطفاً مشخصات کاربر جدید را ثبت نمایید');
        setUserFound(false);
        setShowEdit(false);
        setShowAdd(true);
        setSellerInfo({
          shomareSheba: '',
          shomareKart: '',
          name: '',
          shomareTamas: '',
          rank: ''
        });
      } else {
        setSellerInfo({
          shomareSheba: response.data.sheba || '',
          shomareKart: response.data.card || '',
          name: response.data.name || '',
          shomareTamas: response.data.phone || '',
          rank: response.data.rank || ''
        });
        setUserFound(true);
        setShowAdd(false);
        setShowEdit(true);
        setMessage('');
      }
    } catch (error) {
      console.error('Error fetching seller data:', error);
      setMessage('Error fetching user data');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // For amount and price fields, allow decimal input
    let processedValue = value;
    if (name === 'amount' || name === 'price') {
      // Remove commas for processing, but allow decimal point
      processedValue = value.replace(/,/g, '');
      // Validate: allow numbers and one decimal point
      if (processedValue && !/^\d*\.?\d*$/.test(processedValue)) {
        return; // Invalid input, don't update
      }
    }
    
    // Clear customRealm when switching away from "Custom"
    if (name === 'realm' && value !== 'Custom') {
      setFormData(prev => ({
        ...prev,
        [name]: processedValue,
        customRealm: ''
      }));
      return;
    }
    
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: processedValue
      };

      // Auto-calculate gheymat for Gold payment type
      if ((name === 'amount' || name === 'price' || name === 'paymentTime') && updated.paymentType === 'Gold') {
        // Get current values, removing commas if present
        const amountStr = (updated.amount || '').replace(/,/g, '');
        const priceStr = (updated.price || '').replace(/,/g, '');
        const paymentTime = updated.paymentTime;
        
        const amount = parseFloat(amountStr);
        const price = parseFloat(priceStr);
        
        if (!isNaN(amount) && !isNaN(price) && amount > 0 && price > 0) {
          let gheymat = amount * price;
          if (paymentTime !== 'usdt days') {
            gheymat = amount * price * 10;
          }
          updated.gheymat = formatNumber(gheymat, true); // Allow decimals, show total amount
        } else if (amountStr === '' || priceStr === '') {
          // Clear gheymat if amount or price is cleared
          updated.gheymat = '';
        }
      }
      
      return updated;
    });
  };

  const handleSellerInfoChange = (e) => {
    const { name, value } = e.target;
    setSellerInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGheymatChange = (e) => {
    let value = e.target.value;
    
    // Remove commas for validation
    const cleanValue = value.replace(/,/g, '');
    
    // Allow decimal input - validate format (allow numbers, one decimal point, and decimal digits)
    if (cleanValue && !/^\d*\.?\d*$/.test(cleanValue)) {
      return; // Invalid input, don't update
    }
    
    // For Naghdi, allow raw decimal input without immediate formatting
    // Store the raw value (with or without decimal point) to allow typing
    if (formData.paymentType === 'Naghdi') {
      // Allow the raw value to be stored so user can type decimals freely
      setFormData(prev => ({
        ...prev,
        gheymat: cleanValue
      }));
    } else {
      // For Gold, this shouldn't be manually editable, but if it is, format it
      if (cleanValue && !isNaN(parseFloat(cleanValue))) {
        const numValue = parseFloat(cleanValue);
        setFormData(prev => ({
          ...prev,
          gheymat: formatNumber(numValue, true)
        }));
      } else if (cleanValue === '') {
        setFormData(prev => ({
          ...prev,
          gheymat: ''
        }));
      }
    }
  };

  const handleGheymatBlur = (e) => {
    // Format the value on blur (when user finishes typing)
    if (formData.paymentType === 'Naghdi') {
      const value = e.target.value.replace(/,/g, '');
      if (value && !isNaN(parseFloat(value))) {
        const numValue = parseFloat(value);
        setFormData(prev => ({
          ...prev,
          gheymat: formatNumber(numValue, true)
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setMessage('');

    try {
      // Save seller info if edit or add is checked
      if (showEdit || showAdd) {
        const discordId = formData.discordId.replace(/\s/g, '');
        await api.post('/api/sellers', {
          discordId,
          card: sellerInfo.shomareKart,
          sheba: sellerInfo.shomareSheba,
          name: sellerInfo.name,
          phone: sellerInfo.shomareTamas,
          wallet: sellerInfo.rank || ''
        });
      }

      // Submit payment
      // Use customRealm if "Custom" is selected, otherwise use the selected realm
      const finalRealm = formData.realm === 'Custom' ? (formData.customRealm || '') : formData.realm;
      
      const paymentData = {
        discordId: formData.discordId.replace(/\s/g, ''),
        paymentType: formData.paymentType,
        paymentDuration: formData.paymentTime,
        realm: finalRealm,
        amount: formData.amount,
        price: formData.price,
        gheymat: formData.gheymat.replace(/,/g, ''),
        note: formData.note,
        card: sellerInfo.shomareKart,
        sheba: sellerInfo.shomareSheba,
        name: sellerInfo.name,
        phone: sellerInfo.shomareTamas,
        wallet: sellerInfo.rank || ''
      };

      const response = await api.post('/api/payments', paymentData);
      
      setMessage(`Payment created successfully! ID: ${response.data.uniqueID}`);
      setFormData({
        discordId: '',
        paymentType: '',
        paymentTime: 'lahzei',
        realm: '',
        customRealm: '',
        amount: '',
        price: '',
        gheymat: '',
        note: ''
      });
      setSellerInfo({
        shomareSheba: '',
        shomareKart: '',
        name: '',
        shomareTamas: '',
        rank: ''
      });
      setShowEdit(false);
      setShowAdd(false);
      setUserFound(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setMessage(error.response?.data?.error || 'Error submitting payment');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.disabled = false;
        }
      }, 3000);
    }
  };

  const showPaymentTime = formData.paymentType === 'Naghdi' || formData.paymentType === 'Gold';
  const showRealm = formData.paymentType === 'Naghdi' || formData.paymentType === 'Gold';
  const showAmountPrice = formData.paymentType === 'Gold';
  const showGheymat = formData.paymentType === 'Naghdi' || formData.paymentType === 'Gold';

  return (
    <div className="container">
      <div className="box">
        <h2 style={{ textAlign: 'right', direction: 'rtl' }}>فرم ثبت پرداختی ها</h2>
        <form id="transactionForm" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="discordId">آیدی دیسکورد:</label>
            <input
              type="text"
              id="discordId"
              name="discordId"
              value={formData.discordId}
              onChange={handleInputChange}
              autoComplete="off"
            />
            <button type="button" onClick={fetchSellerData}>
              دریافت اطلاعات کاربر
            </button>
          </div>

          <label htmlFor="paymentType">نوع پرداخت:</label>
          <select
            id="paymentType"
            name="paymentType"
            value={formData.paymentType}
            onChange={handleInputChange}
          >
            <option value="">Select payment type</option>
            <option value="Naghdi">پرداخت نقدی</option>
            <option value="Gold">فروش گلد</option>
          </select>

          {showPaymentTime && (
            <>
              <label htmlFor="paymentTime">زمان پرداخت:</label>
              <select
                id="paymentTime"
                name="paymentTime"
                value={formData.paymentTime}
                onChange={handleInputChange}
              >
                {paymentDurationOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </>
          )}

          {showRealm && (
            <>
              <label htmlFor="realm">Game:</label>
              {formData.realm === 'Custom' ? (
                <input
                  type="text"
                  id="customRealm"
                  name="customRealm"
                  placeholder="Enter custom game name"
                  value={formData.customRealm || ''}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      customRealm: e.target.value
                    }));
                  }}
                  onBlur={(e) => {
                    // If field is empty on blur, switch back to dropdown
                    if (!e.target.value.trim()) {
                      setFormData(prev => ({
                        ...prev,
                        realm: '',
                        customRealm: ''
                      }));
                    }
                  }}
                  onKeyDown={(e) => {
                    // Allow Escape key to switch back to dropdown
                    if (e.key === 'Escape') {
                      setFormData(prev => ({
                        ...prev,
                        realm: '',
                        customRealm: ''
                      }));
                      // Focus will return to the select after state update
                      setTimeout(() => {
                        const select = document.getElementById('realm');
                        if (select) select.focus();
                      }, 0);
                    }
                  }}
                  required
                  autoComplete="off"
                  autoFocus
                />
              ) : (
                <select
                  id="realm"
                  name="realm"
                  value={formData.realm}
                  onChange={handleInputChange}
                  required
                >
                  {realmOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
            </>
          )}

          {showAmountPrice && (
            <>
              <label htmlFor="amount">مقدار (K):</label>
              <input
                type="text"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                autoComplete="off"
                inputMode="decimal"
                step="any"
              />

              <label htmlFor="price">قیمت (Toman):</label>
              <input
                type="text"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                autoComplete="off"
                inputMode="decimal"
                step="any"
              />
            </>
          )}

          {showGheymat && (
            <>
              <label htmlFor="gheymat">قیمت (Rial):</label>
              <input
                type="text"
                id="gheymat"
                name="gheymat"
                value={formData.gheymat}
                onChange={handleGheymatChange}
                onBlur={handleGheymatBlur}
                autoComplete="off"
                inputMode="decimal"
                step="any"
                readOnly={formData.paymentType === 'Gold'}
                style={formData.paymentType === 'Gold' ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
              />
            </>
          )}

          <label htmlFor="note">یادداشت:</label>
          <input
            type="text"
            id="note"
            name="note"
            value={formData.note}
            onChange={handleInputChange}
          />

          {message && (
            <div className={message.includes('Error') ? 'error' : 'success'}>
              {message}
            </div>
          )}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'ثبت'}
          </button>
        </form>
      </div>

      <div className="box" id="paymentbox" style={{ direction: 'rtl', textAlign: 'right' }}>
        <h3 style={{ marginBottom: '1.5rem', textAlign: 'right' }}>Bank Details</h3>
        <label htmlFor="shomareSheba">شماره شبا:</label>
        <input
          type="text"
          id="shomareSheba"
          name="shomareSheba"
          value={sellerInfo.shomareSheba}
          onChange={handleSellerInfoChange}
          autoComplete="off"
        />

        <label htmlFor="shomareKart">شماره کارت:</label>
        <input
          type="text"
          id="shomareKart"
          name="shomareKart"
          value={sellerInfo.shomareKart}
          onChange={handleSellerInfoChange}
          autoComplete="off"
        />

        <label htmlFor="name">نام و نام خانوادگی:</label>
        <input
          type="text"
          id="name"
          name="name"
          value={sellerInfo.name}
          onChange={handleSellerInfoChange}
          autoComplete="off"
        />

        <label htmlFor="shomareTamas">شماره تماس:</label>
        <input
          type="text"
          id="shomareTamas"
          name="shomareTamas"
          value={sellerInfo.shomareTamas}
          onChange={handleSellerInfoChange}
          autoComplete="off"
        />

        <label htmlFor="wallet">Wallet:</label>
        <input
          type="text"
          id="wallet"
          name="wallet"
          value={sellerInfo.rank}
          onChange={(e) => setSellerInfo(prev => ({ ...prev, rank: e.target.value }))}
          autoComplete="off"
        />

        {showEdit && (
          <label className="checkbox-container">
            ویرایش
            <input
              type="checkbox"
              id="edit"
              name="edit"
              checked={showEdit}
              onChange={(e) => setShowEdit(e.target.checked)}
            />
            <span className="checkmark"></span>
          </label>
        )}

        {showAdd && (
          <label className="checkbox-container">
            ثبت کاربر
            <input
              type="checkbox"
              id="add"
              name="add"
              checked={showAdd}
              onChange={(e) => setShowAdd(e.target.checked)}
            />
            <span className="checkmark"></span>
          </label>
        )}
      </div>
    </div>
  );
};

export default PaymentForm;

