import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PaymentForm from '../components/PaymentForm';
import PaymentList from '../components/PaymentList';
import PaymentEdit from '../components/PaymentEdit';
import UserManagement from '../components/UserManagement';
import SellerManagement from '../components/SellerManagement';
import SettingsPanel from '../components/SettingsPanel';
import { ToastContainer } from '../components/Toast';
import { KeyboardShortcutsHelp } from '../components/KeyboardShortcutsHelp';
import { useToast } from '../hooks/useToast';
import { useKeyboardShortcuts, dashboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../contexts/SettingsContext';
import { CreditCard, List, Store, Users, FileEdit } from 'lucide-react';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('form');
  const [editingPayment, setEditingPayment] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { setIsSettingsOpen } = useSettings();
  const toast = useToast();

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    ...dashboardShortcuts,
    'ctrl+k': {
      ...dashboardShortcuts['ctrl+k'],
      handler: () => {
        const searchInput = document.querySelector('.search-input, input[type="search"], input[placeholder*="Search"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        } else {
          toast.info('No search available on this page');
        }
      },
    },
    'ctrl+n': {
      ...dashboardShortcuts['ctrl+n'],
      handler: () => {
        setActiveTab('form');
        setEditingPayment(null);
        toast.info('Switched to New Payment');
      },
    },
    'ctrl+l': {
      ...dashboardShortcuts['ctrl+l'],
      handler: () => {
        setActiveTab('list');
        setEditingPayment(null);
        toast.info('Switched to Payment List');
      },
    },
    'ctrl+,': {
      ...dashboardShortcuts['ctrl+,'],
      handler: () => {
        setIsSettingsOpen(true);
      },
    },
    'ctrl+?': {
      handler: () => {
        setShowShortcuts(true);
      },
      description: 'Show keyboard shortcuts',
    },
  });

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
    toast.success('Payment updated successfully!');
  };

  const handlePaymentSuccess = () => {
    setRefreshKey(prev => prev + 1);
    toast.success('Payment operation completed successfully!');
  };

  if (authLoading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-lg">Loading...</div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  const isAdmin = user?.role === 'Admin';

  return (
    <ProtectedRoute>
      <MainLayout onShortcutsClick={() => setShowShortcuts(true)}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Manage payments and sellers</p>
          </div>

          <SettingsPanel />
          <KeyboardShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
          <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="form" className="gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">New Payment</span>
                <span className="sm:hidden">New</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Payment List</span>
                <span className="sm:hidden">List</span>
              </TabsTrigger>
              <TabsTrigger value="sellers" className="gap-2">
                <Store className="h-4 w-4" />
                <span className="hidden sm:inline">Sellers</span>
                <span className="sm:hidden">Sellers</span>
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Users</span>
                  <span className="sm:hidden">Users</span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="form" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>New Payment</CardTitle>
                  <CardDescription>Create a new payment entry</CardDescription>
                </CardHeader>
                <CardContent>
                  <PaymentForm onSuccess={handlePaymentSuccess} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list" className="space-y-4">
              <PaymentList 
                key={refreshKey}
                onEdit={handleEdit}
                onDelete={handlePaymentSuccess}
              />
            </TabsContent>

            {editingPayment && (
              <TabsContent value="edit" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileEdit className="h-5 w-5" />
                      Edit Payment
                    </CardTitle>
                    <CardDescription>Modify payment details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PaymentEdit
                      payment={editingPayment}
                      onCancel={handleEditCancel}
                      onSuccess={handleEditSuccess}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="sellers" className="space-y-4">
              <SellerManagement />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="users" className="space-y-4">
                <UserManagement />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
};

export default Dashboard;

