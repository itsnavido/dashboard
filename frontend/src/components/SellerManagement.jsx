import React, { useState } from 'react';
import api from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './EmptyState';
import { Search, Loader2, CheckCircle2, XCircle, UserPlus, UserCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
    wallet: '',
    paypalWallet: ''
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
      const response = await api.get(`/sellers/${discordId}`);
      
      if (response.data.error === 'Not Found') {
        setSellerInfo({ discordId, exists: false });
        setFormData({
          card: '',
          sheba: '',
          name: '',
          phone: '',
          wallet: '',
          paypalWallet: ''
        });
      } else {
        setSellerInfo({ discordId, exists: true });
        setFormData({
          card: response.data.card || '',
          sheba: response.data.sheba || '',
          name: response.data.name || '',
          phone: response.data.phone || '',
          wallet: response.data.wallet || '',
          paypalWallet: response.data.paypalWallet || ''
        });
      }
    } catch (err) {
      console.error('Error fetching seller info:', err);
      if (err.response?.status === 404 || err.response?.data?.error === 'Not Found') {
        setSellerInfo({ discordId: searchDiscordId.replace(/\s/g, ''), exists: false });
        setFormData({
          card: '',
          sheba: '',
          name: '',
          phone: '',
          wallet: '',
          paypalWallet: ''
        });
      } else {
        setError(err.response?.data?.error || 'Failed to fetch seller information');
        toast.error(err.response?.data?.error || 'Failed to fetch seller information');
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
      await api.post('/sellers', {
        discordId: sellerInfo.discordId,
        card: formData.card,
        sheba: formData.sheba,
        name: formData.name,
        phone: formData.phone,
        wallet: formData.wallet,
        paypalWallet: formData.paypalWallet
      });

      const successMsg = sellerInfo.exists 
        ? 'Seller information updated successfully!' 
        : 'Seller information created successfully!';
      setSuccess(successMsg);
      setSellerInfo({ ...sellerInfo, exists: true });
      toast.success(successMsg);
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error saving seller info:', err);
      const errorMsg = err.response?.data?.error || 'Failed to save seller information';
      setError(errorMsg);
      toast.error(errorMsg);
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
      wallet: '',
      paypalWallet: ''
    });
    setError('');
    setSuccess('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seller Management</CardTitle>
          <CardDescription>Search for a user by Discord ID to view or edit their information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="searchDiscordId" className="sr-only">Discord ID</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="searchDiscordId"
                  type="text"
                  value={searchDiscordId}
                  onChange={(e) => setSearchDiscordId(e.target.value)}
                  placeholder="Enter Discord ID"
                  autoComplete="off"
                  className="pl-10"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert variant="success">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {sellerInfo && !loading && (
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {sellerInfo.exists ? (
                        <>
                          <UserCheck className="h-5 w-5" />
                          Edit Seller Information
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-5 w-5" />
                          Add New Seller Information
                        </>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Discord ID: <span className="font-mono font-semibold">{sellerInfo.discordId}</span>
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="card">شماره کارت (Card Number)</Label>
                      <Input
                        id="card"
                        name="card"
                        type="text"
                        value={formData.card}
                        onChange={handleInputChange}
                        autoComplete="off"
                        dir="ltr"
                        style={{ direction: 'ltr', textAlign: 'left' }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sheba">شماره شبا (Sheba Number)</Label>
                      <Input
                        id="sheba"
                        name="sheba"
                        type="text"
                        value={formData.sheba}
                        onChange={handleInputChange}
                        autoComplete="off"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">نام و نام خانوادگی (Full Name)</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleInputChange}
                        autoComplete="off"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">شماره تماس (Phone Number)</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="text"
                        value={formData.phone}
                        onChange={handleInputChange}
                        autoComplete="off"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wallet">Wallet</Label>
                      <Input
                        id="wallet"
                        name="wallet"
                        type="text"
                        value={formData.wallet}
                        onChange={handleInputChange}
                        autoComplete="off"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paypalWallet">Paypal Wallet</Label>
                      <Input
                        id="paypalWallet"
                        name="paypalWallet"
                        type="text"
                        value={formData.paypalWallet}
                        onChange={handleInputChange}
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={saving} className="flex-1">
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : sellerInfo.exists ? (
                        'Update'
                      ) : (
                        'Create'
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleReset} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {!sellerInfo && !loading && searchDiscordId && (
            <EmptyState
              title="No seller found"
              description="Search for a Discord ID to view or create seller information"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerManagement;
