import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatNumber } from '../utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PaymentEdit = ({ payment, onCancel, onSuccess }) => {
  const [formData, setFormData] = useState({
    time: '',
    dueDate: '',
    userid: '',
    amount: '',
    ppu: '',
    total: '',
    paymentSource: '',
    paymentMethod: '',
    card: '',
    name: '',
    wallet: '',
    note: '',
  });

  const [paymentInfoOptions, setPaymentInfoOptions] = useState({
    paymentSources: [],
    paymentMethods: [],
    currencies: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPaymentInfo = async () => {
      try {
        const response = await api.get('/payment-info');
        setPaymentInfoOptions(response.data);
      } catch (error) {
        console.error('Error fetching Payment Info options:', error);
      }
    };
    fetchPaymentInfo();
  }, []);

  useEffect(() => {
    if (payment) {
      const totalValue = payment.total || payment.gheymat || '';
      const formattedTotal = totalValue ? formatNumber(parseFloat(totalValue.toString().replace(/,/g, '')) || 0) : '';
      const ppuValue = payment.ppu || payment.price || '';
      const formattedPpu = ppuValue ? formatNumber(parseFloat(ppuValue.toString().replace(/,/g, '')) || 0) : '';
      
      setFormData({
        time: payment.time || '',
        dueDate: payment.dueDate || '',
        userid: payment.userid || '',
        amount: payment.amount || '',
        ppu: formattedPpu,
        total: formattedTotal,
        paymentSource: payment.paymentSource || '',
        paymentMethod: payment.paymentMethod || '',
        card: payment.card || '',
        name: payment.name || '',
        wallet: payment.wallet || '',
        note: payment.note || '',
      });
    }
  }, [payment]);

  // Recalculate total when amount or ppu changes
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
      }
    }
  }, [formData.amount, formData.ppu]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePpuChange = (e) => {
    let value = e.target.value.replace(/,/g, '');
    
    if (value && !/^\d*\.?\d*$/.test(value)) {
      return;
    }
    
    if (value && !isNaN(parseFloat(value))) {
      const numValue = parseFloat(value);
      value = formatNumber(numValue, true);
    } else if (value === '') {
      // Allow empty value
    } else {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      ppu: value
    }));
  };

  const handleTotalChange = (e) => {
    let value = e.target.value.replace(/,/g, '');
    
    if (value && !/^\d*\.?\d*$/.test(value)) {
      return;
    }
    
    if (value && !isNaN(parseFloat(value))) {
      const numValue = parseFloat(value);
      value = formatNumber(numValue, true);
    } else if (value === '') {
      // Allow empty value
    } else {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      total: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        ppu: formData.ppu ? formData.ppu.toString().replace(/,/g, '') : '',
        total: formData.total ? formData.total.toString().replace(/,/g, '') : '',
        amount: formData.amount ? formData.amount.toString().replace(/,/g, '') : ''
      };
      await api.put(`/payments/${payment.id}`, submitData);
      toast.success('Payment updated successfully!');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error updating payment:', err);
      const errorMsg = err.response?.data?.error || 'Failed to update payment';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!payment) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Payment</CardTitle>
        <CardDescription>Modify payment details</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                type="text"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userid">Discord ID</Label>
              <Input
                type="text"
                id="userid"
                name="userid"
                value={formData.userid}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                type="text"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                type="text"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                inputMode="decimal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ppu">PPU (Price Per Unit)</Label>
              <Input
                type="text"
                id="ppu"
                name="ppu"
                value={formData.ppu}
                onChange={handlePpuChange}
                inputMode="decimal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total">Total</Label>
              <Input
                type="text"
                id="total"
                name="total"
                value={formData.total}
                onChange={handleTotalChange}
                inputMode="decimal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentSource">Payment Source</Label>
              <Select
                value={formData.paymentSource}
                onValueChange={(value) => setFormData(prev => ({ ...prev, paymentSource: value }))}
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
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
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
              <Label htmlFor="note">Note</Label>
              <Input
                type="text"
                id="note"
                name="note"
                value={formData.note}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="card">Card</Label>
              <Input
                type="text"
                id="card"
                name="card"
                value={formData.card}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet">Wallet</Label>
              <Input
                type="text"
                id="wallet"
                name="wallet"
                value={formData.wallet}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PaymentEdit;
