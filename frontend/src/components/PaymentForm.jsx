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
    amount: '',
    ppu: '',
    total: '',
    paymentSource: '',
    paymentMethod: '',
    note: '',
    dueDate: ''
  });

  const [sellerInfo, setSellerInfo] = useState({
    shomareSheba: '',
    shomareKart: '',
    name: '',
    shomareTamas: '',
    wallet: '',
    paypalWallet: ''
  });

  const [paymentInfoOptions, setPaymentInfoOptions] = useState({
    paymentSources: [],
    paymentMethods: [],
    dueDateOptions: [],
    dueDateInfo: { title: 'Due Date', hours: 24 }
  });

  const [selectedDueDateOption, setSelectedDueDateOption] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success'); // 'success' or 'error'
  const [showEdit, setShowEdit] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [userFound, setUserFound] = useState(false);
  const [loadingSeller, setLoadingSeller] = useState(false);
  const [loadingPaymentInfo, setLoadingPaymentInfo] = useState(false);

  const realmOptions = [
    { value: '', label: 'Select a Realm' },
    { value: 'Retail', label: 'Retail' },
    { value: 'POE', label: 'POE' },
    { value: 'Classic', label: 'Classic' },
    { value: 'Custom', label: 'Custom' }
  ];

  // Fetch Payment Info options on component mount
  useEffect(() => {
    const fetchPaymentInfo = async () => {
      setLoadingPaymentInfo(true);
      try {
        const response = await api.get('/payment-info');
        setPaymentInfoOptions(response.data);
      } catch (error) {
        console.error('Error fetching Payment Info options:', error);
        toast.error('Failed to load payment options');
      } finally {
        setLoadingPaymentInfo(false);
      }
    };
    fetchPaymentInfo();
  }, []);

  // Calculate total: always amount * PPU
  useEffect(() => {
    if (formData.amount && formData.ppu) {
      const amount = parseFloat(formData.amount.replace(/,/g, '')) || 0;
      const ppu = parseFloat(formData.ppu.replace(/,/g, '')) || 0;
      
      if (amount > 0 && ppu > 0) {
        const total = amount * ppu;
        setFormData(prev => ({
          ...prev,
          total: formatNumber(total, true)
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          total: ''
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        total: ''
      }));
    }
  }, [formData.amount, formData.ppu]);

  // Set default due date option when options are loaded
  useEffect(() => {
    if (paymentInfoOptions.dueDateOptions && paymentInfoOptions.dueDateOptions.length > 0 && !selectedDueDateOption) {
      // Set first option as default
      const firstOption = paymentInfoOptions.dueDateOptions[0];
      setSelectedDueDateOption(`${firstOption.title}|${firstOption.hours}`);
    }
  }, [paymentInfoOptions.dueDateOptions, selectedDueDateOption]);

  // Calculate due date based on selected option
  useEffect(() => {
    if (selectedDueDateOption) {
      const [title, hoursStr] = selectedDueDateOption.split('|');
      const hours = parseFloat(hoursStr);
      
      if (!isNaN(hours) && hours > 0) {
        const now = new Date();
        const dueDate = new Date(now.getTime() + (hours * 60 * 60 * 1000));
        
        // Format as DD/MM/YYYY HH:MM:SS (same format as backend)
        const day = String(dueDate.getDate()).padStart(2, '0');
        const month = String(dueDate.getMonth() + 1).padStart(2, '0');
        const year = dueDate.getFullYear();
        const hoursStr_formatted = String(dueDate.getHours()).padStart(2, '0');
        const minutes = String(dueDate.getMinutes()).padStart(2, '0');
        const seconds = String(dueDate.getSeconds()).padStart(2, '0');
        
        const formattedDueDate = `${day}/${month}/${year} ${hoursStr_formatted}:${minutes}:${seconds}`;
        setFormData(prev => ({
          ...prev,
          dueDate: formattedDueDate
        }));
      }
    }
  }, [selectedDueDateOption]);

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
          wallet: '',
          paypalWallet: ''
        });
      } else {
        setSellerInfo({
          shomareSheba: response.data.sheba || '',
          shomareKart: response.data.card || '',
          name: response.data.name || '',
          shomareTamas: response.data.phone || '',
          wallet: response.data.wallet || '',
          paypalWallet: response.data.paypalWallet || ''
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
    
    if (name === 'amount' || name === 'ppu') {
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
    const value = e.target.value.replace(/,/g, '');
    if (value && !isNaN(parseFloat(value))) {
      const numValue = parseFloat(value);
      setFormData(prev => ({
        ...prev,
        amount: formatNumber(numValue, true)
      }));
    }
  };

  const handlePpuBlur = (e) => {
    const value = e.target.value.replace(/,/g, '');
    if (value && !isNaN(parseFloat(value))) {
      const numValue = parseFloat(value);
      setFormData(prev => ({
        ...prev,
        ppu: formatNumber(numValue, true)
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
            wallet: sellerInfo.wallet || '',
            paypalWallet: sellerInfo.paypalWallet || ''
          });
        } catch (sellerError) {
          console.warn('Failed to update seller info, but continuing with payment submission:', sellerError);
          // Continue with payment submission even if seller update fails
        }
      }
      
      // Recalculate due date before submission to ensure it's current
      let finalDueDate = formData.dueDate;
      if (selectedDueDateOption) {
        const [title, hoursStr] = selectedDueDateOption.split('|');
        const hours = parseFloat(hoursStr);
        
        if (!isNaN(hours) && hours > 0) {
          const now = new Date();
          const dueDate = new Date(now.getTime() + (hours * 60 * 60 * 1000));
          
          // Format as DD/MM/YYYY HH:MM:SS (same format as backend)
          const day = String(dueDate.getDate()).padStart(2, '0');
          const month = String(dueDate.getMonth() + 1).padStart(2, '0');
          const year = dueDate.getFullYear();
          const hoursStr_formatted = String(dueDate.getHours()).padStart(2, '0');
          const minutes = String(dueDate.getMinutes()).padStart(2, '0');
          const seconds = String(dueDate.getSeconds()).padStart(2, '0');
          
          finalDueDate = `${day}/${month}/${year} ${hoursStr_formatted}:${minutes}:${seconds}`;
        }
      }
      
      // Payment duration = due date option label (e.g. "Instant (1 hours)")
      let paymentDurationLabel = '';
      if (selectedDueDateOption) {
        const [title, hoursStr] = selectedDueDateOption.split('|');
        const hours = parseFloat(hoursStr);
        paymentDurationLabel = !isNaN(hours) ? `${title} (${hours} hours)` : title;
      }

      // Prepare payment data for submission
      // Note: IBAN uses sellerInfo.sheba, Paypal Address uses sellerInfo.paypalWallet
      const paymentData = {
        discordId: formData.discordId.replace(/\s/g, ''),
        amount: formData.amount.replace(/,/g, ''),
        ppu: formData.ppu.replace(/,/g, ''),
        total: formData.total.replace(/,/g, ''),
        dueDate: finalDueDate, // Due date calculated from Payment Info hours
        paymentDuration: paymentDurationLabel, // Due date option for webhook
        paymentSource: formData.paymentSource,
        paymentMethod: formData.paymentMethod,
        card: sellerInfo.shomareKart,
        iban: sellerInfo.shomareSheba, // IBAN is same as sheba
        name: sellerInfo.name,
        wallet: sellerInfo.wallet || '',
        paypalAddress: sellerInfo.paypalWallet || '', // Paypal Address is same as Paypal Wallet
        note: formData.note
      };

      const response = await api.post('/payments', paymentData);
      
      const detailedMessage = `پرداخت با موفقیت ثبت شد!\n\n` +
        `شناسه: ${response.data.uniqueID}\n` +
        `Discord ID: ${formData.discordId.replace(/\s/g, '')}\n` +
        `مقدار: ${formData.amount}\n` +
        `قیمت واحد (PPU): ${formData.ppu}\n` +
        `مبلغ کل: ${formData.total}\n` +
        (finalDueDate ? `Due Date: ${finalDueDate}\n` : '') +
        (formData.paymentSource ? `Payment Source: ${formData.paymentSource}\n` : '') +
        (formData.paymentMethod ? `Payment Method: ${formData.paymentMethod}\n` : '') +
        (formData.note ? `یادداشت: ${formData.note}\n` : '') +
        (sellerInfo.name ? `نام: ${sellerInfo.name}\n` : '') +
        (sellerInfo.shomareKart ? `شماره کارت: ${sellerInfo.shomareKart}\n` : '') +
        (sellerInfo.shomareSheba ? `شماره شبا: ${sellerInfo.shomareSheba}\n` : '');
      
      setMessage(detailedMessage);
      setMessageType('success');
      
        setFormData({
          discordId: '',
          amount: '',
          ppu: '',
          total: '',
          paymentSource: '',
          paymentMethod: '',
          note: '',
          dueDate: ''
        });
        // Reset due date option to first option if available
        if (paymentInfoOptions.dueDateOptions && paymentInfoOptions.dueDateOptions.length > 0) {
          const firstOption = paymentInfoOptions.dueDateOptions[0];
          setSelectedDueDateOption(`${firstOption.title}|${firstOption.hours}`);
        } else {
          setSelectedDueDateOption('');
        }
      setSellerInfo({
        shomareSheba: '',
        shomareKart: '',
        name: '',
        shomareTamas: '',
        wallet: '',
        paypalWallet: ''
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

  const showPaymentFields = formData.discordId !== '';

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

            {showPaymentFields && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ppu">PPU (Price Per Unit)</Label>
                  <Input
                    id="ppu"
                    name="ppu"
                    value={formData.ppu}
                    onChange={handleInputChange}
                    onBlur={handlePpuBlur}
                    autoComplete="off"
                    inputMode="decimal"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
                    disabled={loadingPaymentInfo}
                  >
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder="Select Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentInfoOptions.paymentMethods.map((method, index) => (
                        <SelectItem key={index} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total">Total</Label>
                  <Input
                    id="total"
                    name="total"
                    value={formData.total}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDateOption">Due Date Option</Label>
                    <Select
                      value={selectedDueDateOption}
                      onValueChange={setSelectedDueDateOption}
                      disabled={loadingPaymentInfo || !paymentInfoOptions.dueDateOptions || paymentInfoOptions.dueDateOptions.length === 0}
                    >
                      <SelectTrigger id="dueDateOption">
                        <SelectValue placeholder="Select due date option" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentInfoOptions.dueDateOptions && paymentInfoOptions.dueDateOptions.length > 0 ? (
                          paymentInfoOptions.dueDateOptions.map((option, index) => (
                            <SelectItem key={index} value={`${option.title}|${option.hours}`}>
                              {option.title} ({option.hours} hours)
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>No options available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date (Calculated)</Label>
                    <Input
                      id="dueDate"
                      name="dueDate"
                      value={formData.dueDate}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                      placeholder="Due date will be calculated"
                    />
                  </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentSource">Payment Source</Label>
                  <Select
                    value={formData.paymentSource}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, paymentSource: value }))}
                    disabled={loadingPaymentInfo}
                  >
                    <SelectTrigger id="paymentSource">
                      <SelectValue placeholder="Select Payment Source" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentInfoOptions.paymentSources.map((source, index) => (
                        <SelectItem key={index} value={source}>{source}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
            <Label htmlFor="wallet">Wallet</Label>
            <Input
              id="wallet"
              name="wallet"
              value={sellerInfo.wallet}
              onChange={handleSellerInfoChange}
              autoComplete="off"
              disabled={!showEdit && !showAdd}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paypalWallet">Paypal Wallet</Label>
            <Input
              id="paypalWallet"
              name="paypalWallet"
              value={sellerInfo.paypalWallet}
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
