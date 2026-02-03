import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatNumber } from '../utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Copy, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
  const [messageType, setMessageType] = useState('success'); // 'success' or 'error'
  const [showEdit, setShowEdit] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [userFound, setUserFound] = useState(false);
  const [loadingSeller, setLoadingSeller] = useState(false);

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

  // Calculate total amount for Gold payments
  useEffect(() => {
    if (formData.paymentType === 'Gold' && formData.amount && formData.unitPrice) {
      const amount = parseFloat(formData.amount.replace(/,/g, '')) || 0;
      const unitPrice = parseFloat(formData.unitPrice.replace(/,/g, '')) || 0;
      
      if (amount > 0 && unitPrice > 0) {
        let total = amount * unitPrice;
        if (!isUSDT) {
          total = total * 10;
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

    setLoadingSeller(true);
    try {
      const response = await api.get(`/sellers/${discordId}`);
      
      if (response.data.error === 'Not Found') {
        setMessage('کاربر یافت نشد! لطفاً مشخصات کاربر جدید را ثبت نمایید');
        setMessageType('error');
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
      setMessageType('error');
    } finally {
      setLoadingSeller(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'amount' || name === 'unitPrice') {
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
    setMessageType('success');

    try {
      // Update seller info if needed (non-blocking - payment will still be submitted with updated info even if this fails)
      if (showEdit || showAdd) {
        const discordId = formData.discordId.replace(/\s/g, '');
        try {
          await api.post('/sellers', {
            discordId,
            card: sellerInfo.shomareKart,
            sheba: sellerInfo.shomareSheba,
            name: sellerInfo.name,
            phone: sellerInfo.shomareTamas,
            wallet: sellerInfo.rank || ''
          });
        } catch (sellerError) {
          console.warn('Failed to update seller info, but continuing with payment submission:', sellerError);
          // Continue with payment submission even if seller update fails
        }
      }

      const finalRealm = formData.realm === 'Custom' ? (formData.customRealm || '') : formData.realm;
      
      // Always use seller info from form state for payment submission
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
          `مبلغ کل: ${formData.totalAmount} ${isUSDT ? '$' : 'Toman'}\n`
        ) : (
          `مبلغ: ${formData.amount} ${isUSDT ? '$' : 'Rial'}\n`
        )) +
        (formData.paymentDuration ? `مدت زمان: ${paymentDurationLabel}\n` : '') +
        (formData.note ? `یادداشت: ${formData.note}\n` : '') +
        (sellerInfo.name ? `نام: ${sellerInfo.name}\n` : '') +
        (sellerInfo.shomareKart ? `شماره کارت: ${sellerInfo.shomareKart}\n` : '') +
        (sellerInfo.shomareSheba ? `شماره شبا: ${sellerInfo.shomareSheba}\n` : '');
      
      setMessage(detailedMessage);
      setMessageType('success');
      
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

      toast.success('Payment created successfully!');
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMsg = error.response?.data?.error || 'خطا در ثبت پرداخت. لطفاً دوباره تلاش کنید.';
      setMessage(errorMsg);
      setMessageType('error');
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showRealm = formData.paymentType !== '';
  const showPaymentFields = formData.paymentType !== '' && formData.realm !== '';

  const handleCopyMessage = () => {
    if (message) {
      navigator.clipboard.writeText(message).then(() => {
        toast.success('Copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy:', err);
        toast.error('Failed to copy');
      });
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>ثبت پرداخت جدید</CardTitle>
          <CardDescription>Create a new payment entry</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discordId">Discord ID</Label>
              <div className="flex gap-2">
                <Input
                  id="discordId"
                  name="discordId"
                  value={formData.discordId}
                  onChange={handleInputChange}
                  onBlur={fetchSellerData}
                  required
                  autoComplete="off"
                  className="flex-1"
                  disabled={loadingSeller}
                />
                {userFound && (
                  <Button
                    type="button"
                    variant={showEdit ? "destructive" : "secondary"}
                    onClick={() => {
                      setShowEdit(!showEdit);
                      setShowAdd(false);
                    }}
                  >
                    {showEdit ? 'لغو' : 'ویرایش'}
                  </Button>
                )}
                {!userFound && formData.discordId && (
                  <Button
                    type="button"
                    variant={showAdd ? "destructive" : "default"}
                    onClick={() => {
                      setShowAdd(!showAdd);
                      setShowEdit(false);
                    }}
                  >
                    {showAdd ? 'لغو' : 'افزودن'}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentType">نوع پرداخت</Label>
              <Select
                value={formData.paymentType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, paymentType: value }))}
                required
              >
                <SelectTrigger id="paymentType">
                  <SelectValue placeholder="انتخاب نوع پرداخت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gold">فروش گلد</SelectItem>
                  <SelectItem value="Naghdi">پرداخت نقدی</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showRealm && (
              <div className="space-y-2">
                <Label htmlFor="realm">Game</Label>
                {formData.realm === 'Custom' ? (
                  <Input
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
                      }
                    }}
                    required
                    autoComplete="off"
                    autoFocus
                  />
                ) : (
                  <Select
                    value={formData.realm}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, realm: value }))}
                    required
                  >
                    <SelectTrigger id="realm">
                      <SelectValue placeholder="Select a Realm" />
                    </SelectTrigger>
                    <SelectContent>
                      {realmOptions.filter(opt => opt.value !== '').map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {showPaymentFields && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="paymentDuration">Payment Duration</Label>
                  <Select
                    value={formData.paymentDuration}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, paymentDuration: value }))}
                    required
                  >
                    <SelectTrigger id="paymentDuration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentDurationOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.paymentType === 'Gold' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        autoComplete="off"
                        inputMode="decimal"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unitPrice">
                        Unit Price ({isUSDT ? '$' : 'Toman'})
                      </Label>
                      <Input
                        id="unitPrice"
                        name="unitPrice"
                        value={formData.unitPrice}
                        onChange={handleInputChange}
                        onBlur={handleUnitPriceBlur}
                        autoComplete="off"
                        inputMode="decimal"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="totalAmount">
                        Total Amount ({isUSDT ? '$' : 'Toman'})
                      </Label>
                      <Input
                        id="totalAmount"
                        name="totalAmount"
                        value={formData.totalAmount}
                        readOnly
                        className="bg-muted cursor-not-allowed"
                      />
                      {!isUSDT && formData.totalAmount && (
                        <p className="text-sm text-muted-foreground">
                          = {formatNumber(parseFloat(formData.totalAmount.replace(/,/g, '')) / 10, true)} Toman
                        </p>
                      )}
                    </div>
                  </>
                )}

                {formData.paymentType === 'Naghdi' && (
                  <div className="space-y-2">
                    <Label htmlFor="amount">
                      Amount ({isUSDT ? '$' : 'Rial'})
                    </Label>
                    <Input
                      id="amount"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      onBlur={handleAmountBlur}
                      autoComplete="off"
                      inputMode="decimal"
                      required
                    />
                    {!isUSDT && formData.amount && (
                      <p className="text-sm text-muted-foreground">
                        = {formatNumber(parseFloat(formData.amount.replace(/,/g, '')) / 10, true)} Toman
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="note">یادداشت</Label>
                  <Input
                    id="note"
                    name="note"
                    value={formData.note}
                    onChange={handleInputChange}
                  />
                </div>
              </>
            )}

            {message && (
              <Alert variant={messageType === 'error' ? 'destructive' : 'success'} className="relative">
                {messageType === 'success' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertTitle>{messageType === 'error' ? 'Error' : 'Success'}</AlertTitle>
                <AlertDescription className="whitespace-pre-line">
                  {message}
                </AlertDescription>
                {messageType === 'success' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 h-6 w-6"
                    onClick={handleCopyMessage}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </Alert>
            )}

            <Button 
              type="submit" 
              disabled={isSubmitting || !showPaymentFields}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'ثبت'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="md:order-first">
        <CardHeader>
          <CardTitle>Bank Details</CardTitle>
          <CardDescription>Seller information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4" dir="rtl">
          <div className="space-y-2">
            <Label htmlFor="shomareSheba">شماره شبا</Label>
            <Input
              id="shomareSheba"
              name="shomareSheba"
              value={sellerInfo.shomareSheba}
              onChange={handleSellerInfoChange}
              autoComplete="off"
              disabled={!showEdit && !showAdd}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shomareKart">شماره کارت</Label>
            <Input
              id="shomareKart"
              name="shomareKart"
              value={sellerInfo.shomareKart}
              onChange={handleSellerInfoChange}
              autoComplete="off"
              disabled={!showEdit && !showAdd}
              dir="ltr"
              style={{ direction: 'ltr', textAlign: 'left' }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">نام</Label>
            <Input
              id="name"
              name="name"
              value={sellerInfo.name}
              onChange={handleSellerInfoChange}
              autoComplete="off"
              disabled={!showEdit && !showAdd}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shomareTamas">شماره تماس</Label>
            <Input
              id="shomareTamas"
              name="shomareTamas"
              value={sellerInfo.shomareTamas}
              onChange={handleSellerInfoChange}
              autoComplete="off"
              disabled={!showEdit && !showAdd}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rank">Wallet/Rank</Label>
            <Input
              id="rank"
              name="rank"
              value={sellerInfo.rank}
              onChange={handleSellerInfoChange}
              autoComplete="off"
              disabled={!showEdit && !showAdd}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentForm;
