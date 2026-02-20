import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import PaymentForm from '@/components/PaymentForm';
import PaymentEdit from '@/components/PaymentEdit';
import PaymentList from '@/components/PaymentList';

function AdminPayments() {
  const queryClient = useQueryClient();
  const [editingPayment, setEditingPayment] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const handleEditSuccess = () => {
    setEditingPayment(null);
    queryClient.invalidateQueries({ queryKey: ['payments'] });
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ['payments'] });
  };

  if (showForm) {
    return (
      <ProtectedRoute requireAdmin>
        <MainLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Create Payment</h1>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Back to List
              </Button>
            </div>
            <PaymentForm onSuccess={handleFormSuccess} />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (editingPayment) {
    return (
      <ProtectedRoute requireAdmin>
        <MainLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Edit Payment</h1>
              <Button variant="outline" onClick={() => setEditingPayment(null)}>
                Back to List
              </Button>
            </div>
            <PaymentEdit
              payment={editingPayment}
              onCancel={() => setEditingPayment(null)}
              onSuccess={handleEditSuccess}
            />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">Payments</h1>
              <p className="text-muted-foreground">Manage all payments</p>
            </div>
            <Button onClick={() => setShowForm(true)}>Create Payment</Button>
          </div>

          <PaymentList onEdit={setEditingPayment} />
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

export default AdminPayments;
