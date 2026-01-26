import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import api from '@/services/api';
import { formatNumber } from '@/utils';
import { toast } from 'react-hot-toast';
import { Search, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import PaymentForm from '@/components/PaymentForm';
import PaymentEdit from '@/components/PaymentEdit';

function AdminPayments() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingPayment, setEditingPayment] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', 'admin'],
    queryFn: async () => {
      const res = await api.get('/payments');
      return res.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, processed }) => {
      await api.patch(`/payments/${id}/status`, { processed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment status updated');
    },
    onError: () => {
      toast.error('Failed to update payment status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment deleted');
    },
    onError: () => {
      toast.error('Failed to delete payment');
    },
  });

  const filteredPayments = payments?.filter((payment) => {
    const matchesSearch =
      !searchTerm ||
      payment.userid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.uniqueID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.realm?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'paid' && payment.processed === true) ||
      (statusFilter === 'unpaid' && payment.processed !== true);

    return matchesSearch && matchesStatus;
  });

  const handleStatusToggle = (payment) => {
    updateStatusMutation.mutate({
      id: payment.id,
      processed: !payment.processed,
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      deleteMutation.mutate(id);
    }
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
            <PaymentForm
              onSuccess={() => {
                setShowForm(false);
                queryClient.invalidateQueries({ queryKey: ['payments'] });
              }}
            />
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
              onSuccess={() => {
                setEditingPayment(null);
                queryClient.invalidateQueries({ queryKey: ['payments'] });
              }}
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

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by Discord ID, Payment ID, or Realm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
                <Button
                  variant="outline"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['payments'] })}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {filteredPayments?.length || 0} Payment{filteredPayments?.length !== 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : filteredPayments?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payments found
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Discord ID</TableHead>
                        <TableHead>Realm</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.uniqueID || payment.id}
                          </TableCell>
                          <TableCell>{payment.time}</TableCell>
                          <TableCell>{payment.userid}</TableCell>
                          <TableCell>{payment.realm}</TableCell>
                          <TableCell>
                            {payment.amount ? formatNumber(parseFloat(payment.amount)) : '-'}
                          </TableCell>
                          <TableCell>
                            {payment.gheymat
                              ? formatNumber(parseFloat(payment.gheymat))
                              : '-'}
                          </TableCell>
                          <TableCell>{payment.paymentDuration}</TableCell>
                          <TableCell>
                            <Badge
                              variant={payment.processed ? 'success' : 'warning'}
                              className="cursor-pointer"
                              onClick={() => handleStatusToggle(payment)}
                            >
                              {payment.processed ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Paid
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Unpaid
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>{payment.admin}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingPayment(payment)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(payment.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

export default AdminPayments;

