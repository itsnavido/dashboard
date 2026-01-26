import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatNumber } from '../utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGheymatChange = (e) => {
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
      gheymat: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        gheymat: formData.gheymat ? formData.gheymat.toString().replace(/,/g, '') : ''
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
              <Label htmlFor="paymentDuration">Payment Duration</Label>
              <Input
                type="text"
                id="paymentDuration"
                name="paymentDuration"
                value={formData.paymentDuration}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="realm">Realm</Label>
              <Input
                type="text"
                id="realm"
                name="realm"
                value={formData.realm}
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
              <Label htmlFor="price">Price</Label>
              <Input
                type="text"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                inputMode="decimal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gheymat">Gheymat</Label>
              <Input
                type="text"
                id="gheymat"
                name="gheymat"
                value={formData.gheymat}
                onChange={handleGheymatChange}
                inputMode="decimal"
              />
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
              <Label htmlFor="sheba">Sheba</Label>
              <Input
                type="text"
                id="sheba"
                name="sheba"
                value={formData.sheba}
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
              <Label htmlFor="phone">Phone</Label>
              <Input
                type="text"
                id="phone"
                name="phone"
                value={formData.phone}
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

            <div className="space-y-2">
              <Label htmlFor="admin">Admin</Label>
              <Input
                type="text"
                id="admin"
                name="admin"
                value={formData.admin}
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
