import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatNumber } from '../utils';

const PaymentForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    discordId: '',
    paymentType: '',
    paymentDuration: 'lahzei',
    realm: '',
    customRealm: '',
    amount: '',
    unitPrice: '',
    totalAmount: '',
    note: ''
  });

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

  const isUSDT = formData.paymentDuration === 'usdt days';
  const currencySymbol = isUSDT ? '$' : '';

  // Calculate total amount for Gold payments
  useEffect(() => {
    if (formData.paymentType === 'Gold' && formData.amount && formData.unitPrice) {
      const amount = parseFloat(formData.amount.replace(/,/g, '')) || 0;
      const unitPrice = parseFloat(formData.unitPrice.replace(/,/g, '')) || 0;
      
      if (amount > 0 && unitPrice > 0) {
        let total = amount * unitPrice;
        if (!isUSDT) {
          total = total * 10; // Multiply by 10 for non-USDT
        }
        
        setFormData(prev => ({
          ...prev,
          totalAmount: formatNumber(total, true)
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          totalAmount: ''
        }));
      }
    } else if (formData.paymentType === 'Gold') {
      setFormData(prev => ({
        ...prev,
        totalAmount: ''
      }));
    }
  }, [formData.paymentType, formData.amount, formData.unitPrice, isUSDT]);

  const fetchSellerData = async () => {
    const discordId = formData.discordId.replace(/\s/g, '');
    if (!discordId) return;

    try {
      const response = await api.get(`/sellers/${discordId}`);
      
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
          rank: response.data.wallet || ''
        });
        setUserFound(true);
        setShowEdit(true);
        setShowAdd(false);
        setMessage('');
      }
    } catch (error) {
      console.error('Error fetching seller data:', error);
      setMessage('خطا در دریافت اطلاعات کاربر');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Allow decimal input for amount and unitPrice
    if (name === 'amount' || name === 'unitPrice') {
      // Remove commas and allow decimal input
      const cleanValue = value.replace(/,/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: cleanValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAmountBlur = (e) => {
    // Format on blur for Naghdi amount
    if (formData.paymentType === 'Naghdi') {
      const value = e.target.value.replace(/,/g, '');
      if (value && !isNaN(parseFloat(value))) {
        const numValue = parseFloat(value);
        setFormData(prev => ({
          ...prev,
          amount: formatNumber(numValue, true)
        }));
      }
    }
  };

  const handleUnitPriceBlur = (e) => {
    // Format on blur
    const value = e.target.value.replace(/,/g, '');
    if (value && !isNaN(parseFloat(value))) {
      const numValue = parseFloat(value);
      setFormData(prev => ({
        ...prev,
        unitPrice: formatNumber(numValue, true)
      }));
    }
  };

  const handleSellerInfoChange = (e) => {
    const { name, value } = e.target;
    setSellerInfo(prev => ({
      ...prev,
      [name]: value
    }));
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
        await api.post('/sellers', {
          discordId,
          card: sellerInfo.shomareKart,
          sheba: sellerInfo.shomareSheba,
          name: sellerInfo.name,
          phone: sellerInfo.shomareTamas,
          wallet: sellerInfo.rank || ''
        });
      }

      // Submit payment
      const finalRealm = formData.realm === 'Custom' ? (formData.customRealm || '') : formData.realm;
      
      // Prepare payment data based on payment type
      let paymentData = {
        discordId: formData.discordId.replace(/\s/g, ''),
        paymentType: formData.paymentType,
        paymentDuration: formData.paymentDuration,
        realm: finalRealm,
        note: formData.note,
        card: sellerInfo.shomareKart,
        sheba: sellerInfo.shomareSheba,
        name: sellerInfo.name,
        phone: sellerInfo.shomareTamas,
        wallet: sellerInfo.rank || ''
      };

      if (formData.paymentType === 'Gold') {
        paymentData.amount = formData.amount.replace(/,/g, '');
        paymentData.price = formData.unitPrice.replace(/,/g, '');
        paymentData.gheymat = formData.totalAmount.replace(/,/g, '');
      } else if (formData.paymentType === 'Naghdi') {
        paymentData.gheymat = formData.amount.replace(/,/g, '');
        paymentData.amount = '';
        paymentData.price = '';
      }

      const response = await api.post('/payments', paymentData);
      
      // Create detailed success message
      const paymentDurationLabel = paymentDurationOptions.find(opt => opt.value === formData.paymentDuration)?.label || formData.paymentDuration;
      const realmLabel = formData.realm === 'Custom' ? formData.customRealm : (realmOptions.find(opt => opt.value === formData.realm)?.label || formData.realm);
      const paymentTypeLabel = formData.paymentType === 'Gold' ? 'فروش گلد' : 'پرداخت نقدی';
      
      const detailedMessage = `پرداخت با موفقیت ثبت شد!\n\n` +
        `شناسه: ${response.data.uniqueID}\n` +
        `نوع پرداخت: ${paymentTypeLabel}\n` +
        `Discord ID: ${formData.discordId.replace(/\s/g, '')}\n` +
        `Realm: ${realmLabel}\n` +
        (formData.paymentType === 'Gold' ? (
          `مقدار: ${formData.amount}\n` +
          `قیمت واحد: ${formData.unitPrice} ${isUSDT ? '$' : 'Toman'}\n` +
          `مبلغ کل: ${formData.totalAmount} ${isUSDT ? '$' : 'Rial'}\n`
        ) : (
          `مبلغ: ${formData.amount} ${isUSDT ? '$' : 'Rial'}\n`
        )) +
        (formData.paymentDuration ? `مدت زمان: ${paymentDurationLabel}\n` : '') +
        (formData.note ? `یادداشت: ${formData.note}\n` : '') +
        (sellerInfo.name ? `نام: ${sellerInfo.name}\n` : '') +
        (sellerInfo.shomareKart ? `شماره کارت: ${sellerInfo.shomareKart}\n` : '') +
        (sellerInfo.shomareSheba ? `شماره شبا: ${sellerInfo.shomareSheba}\n` : '');
      
      setMessage(detailedMessage);
      setFormData({
        discordId: '',
        paymentType: '',
        paymentDuration: 'lahzei',
        realm: '',
        customRealm: '',
        amount: '',
        unitPrice: '',
        totalAmount: '',
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
      setMessage(error.response?.data?.error || 'خطا در ثبت پرداخت. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showRealm = formData.paymentType !== '';
  const showPaymentFields = formData.paymentType !== '' && formData.realm !== '';

  const handleCopyMessage = () => {
    if (message) {
      navigator.clipboard.writeText(message).then(() => {
        // Show temporary feedback
        const originalMessage = message;
        setMessage(originalMessage + '\n\n✓ Copied to clipboard!');
        setTimeout(() => {
          setMessage(originalMessage);
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    }
  };

  return (
    <div className="container payment-form-container">
      <div className="box payment-form-box">
        <h2>ثبت پرداخت جدید</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="discordId">Discord ID:</label>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <input
              type="text"
              id="discordId"
              name="discordId"
              value={formData.discordId}
              onChange={handleInputChange}
              onBlur={fetchSellerData}
              required
              autoComplete="off"
              style={{ flex: 1 }}
            />
            {userFound && (
              <button
                type="button"
                onClick={() => {
                  setShowEdit(!showEdit);
                  setShowAdd(false);
                }}
                className="btn-small btn-secondary"
              >
                {showEdit ? 'لغو ویرایش' : 'ویرایش اطلاعات'}
              </button>
            )}
            {!userFound && formData.discordId && (
              <button
                type="button"
                onClick={() => {
                  setShowAdd(!showAdd);
                  setShowEdit(false);
                }}
                className="btn-small btn-success"
              >
                {showAdd ? 'لغو' : 'افزودن کاربر'}
              </button>
            )}
          </div>

          <label htmlFor="paymentType">نوع پرداخت:</label>
          <select
            id="paymentType"
            name="paymentType"
            value={formData.paymentType}
            onChange={handleInputChange}
            required
          >
            <option value="">انتخاب نوع پرداخت</option>
            <option value="Gold">فروش گلد</option>
            <option value="Naghdi">پرداخت نقدی</option>
          </select>

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
                    if (!e.target.value.trim()) {
                      setFormData(prev => ({
                        ...prev,
                        realm: '',
                        customRealm: ''
                      }));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setFormData(prev => ({
                        ...prev,
                        realm: '',
                        customRealm: ''
                      }));
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

          {showPaymentFields && (
            <>
              <label htmlFor="paymentDuration">Payment Duration:</label>
              <select
                id="paymentDuration"
                name="paymentDuration"
                value={formData.paymentDuration}
                onChange={handleInputChange}
                required
              >
                {paymentDurationOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Gold Payment Fields */}
              {formData.paymentType === 'Gold' && (
                <>
                  <label htmlFor="amount">Amount:</label>
                  <input
                    type="text"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    autoComplete="off"
                    inputMode="decimal"
                    step="any"
                    required
                  />

                  <label htmlFor="unitPrice">
                    Unit Price ({isUSDT ? '$' : 'Toman'}):
                  </label>
                  <input
                    type="text"
                    id="unitPrice"
                    name="unitPrice"
                    value={formData.unitPrice}
                    onChange={handleInputChange}
                    onBlur={handleUnitPriceBlur}
                    autoComplete="off"
                    inputMode="decimal"
                    step="any"
                    required
                  />

                  <label htmlFor="totalAmount">
                    Total Amount ({isUSDT ? '$' : 'Rial'}):
                  </label>
                  <input
                    type="text"
                    id="totalAmount"
                    name="totalAmount"
                    value={formData.totalAmount}
                    readOnly
                    style={{ 
                      backgroundColor: 'var(--bg-tertiary)', 
                      cursor: 'not-allowed',
                      opacity: 0.8
                    }}
                  />
                  {!isUSDT && formData.totalAmount && (
                    <div style={{ 
                      fontSize: '0.875rem', 
                      color: 'var(--text-tertiary)', 
                      marginTop: '-1rem',
                      marginBottom: '1.5rem',
                      paddingLeft: '0.5rem'
                    }}>
                      = {formatNumber(parseFloat(formData.totalAmount.replace(/,/g, '')) / 10, true)} Toman
                    </div>
                  )}
                </>
              )}

              {/* Naghdi Payment Fields */}
              {formData.paymentType === 'Naghdi' && (
                <>
                  <label htmlFor="amount">
                    Amount ({isUSDT ? '$' : 'Rial'}):
                  </label>
                  <input
                    type="text"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    onBlur={handleAmountBlur}
                    autoComplete="off"
                    inputMode="decimal"
                    step="any"
                    required
                  />
                  {!isUSDT && formData.amount && (
                    <div style={{ 
                      fontSize: '0.875rem', 
                      color: 'var(--text-tertiary)', 
                      marginTop: '-1rem',
                      marginBottom: '1.5rem',
                      paddingLeft: '0.5rem'
                    }}>
                      = {formatNumber(parseFloat(formData.amount.replace(/,/g, '')) / 10, true)} Toman
                    </div>
                  )}
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
            </>
          )}

          {message && (
            <div 
              className={message.includes('Error') || message.includes('خطا') ? 'error' : 'success'}
              style={{ whiteSpace: 'pre-line', position: 'relative', paddingRight: message.includes('Error') || message.includes('خطا') ? '1.5rem' : '5rem' }}
            >
              {message}
              {!message.includes('Error') && !message.includes('خطا') && (
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="copy-button"
                  title="Copy to clipboard"
                  style={{
                    position: 'absolute',
                    top: '0.75rem',
                    right: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '4px',
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    color: 'inherit',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  📋 Copy
                </button>
              )}
            </div>
          )}

          <button type="submit" disabled={isSubmitting || !showPaymentFields}>
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
          disabled={!showEdit && !showAdd}
        />

        <label htmlFor="shomareKart">شماره کارت:</label>
        <input
          type="text"
          id="shomareKart"
          name="shomareKart"
          value={sellerInfo.shomareKart}
          onChange={handleSellerInfoChange}
          autoComplete="off"
          disabled={!showEdit && !showAdd}
        />

        <label htmlFor="name">نام:</label>
        <input
          type="text"
          id="name"
          name="name"
          value={sellerInfo.name}
          onChange={handleSellerInfoChange}
          autoComplete="off"
          disabled={!showEdit && !showAdd}
        />

        <label htmlFor="shomareTamas">شماره تماس:</label>
        <input
          type="text"
          id="shomareTamas"
          name="shomareTamas"
          value={sellerInfo.shomareTamas}
          onChange={handleSellerInfoChange}
          autoComplete="off"
          disabled={!showEdit && !showAdd}
        />

        <label htmlFor="rank">Wallet/Rank:</label>
        <input
          type="text"
          id="rank"
          name="rank"
          value={sellerInfo.rank}
          onChange={handleSellerInfoChange}
          autoComplete="off"
          disabled={!showEdit && !showAdd}
        />
      </div>
    </div>
  );
};

export default PaymentForm;
