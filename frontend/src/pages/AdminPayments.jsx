import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import api from '@/services/api';
import { formatNumber, isPaymentPaid } from '@/utils';
import { toast } from 'react-hot-toast';
import { Search, RefreshCw, CheckCircle2, XCircle, Edit, Trash2 } from 'lucide-react';
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
    mutationFn: async ({ id, columnQ }) => {
      await api.patch(`/payments/${id}/status`, { columnQ });
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

    const isPaid = isPaymentPaid(payment.columnQ);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'paid' && isPaid) ||
      (statusFilter === 'unpaid' && !isPaid);

    return matchesSearch && matchesStatus;
  });

  const handleStatusToggle = (payment) => {
    const isCurrentlyPaid = isPaymentPaid(payment.columnQ);
    updateStatusMutation.mutate({
      id: payment.id,
      columnQ: !isCurrentlyPaid,
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
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
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-2 p-6">
                  <Skeleton className="h-12 w-full" />
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredPayments?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground p-6">
                  No payments found
                </div>
              ) : (
                <div className="rounded-md border w-full">
                  <Table className="w-full" noScroll>
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
                              variant={isPaymentPaid(payment.columnQ) ? 'success' : 'warning'}
                              className="cursor-pointer"
                              onClick={() => handleStatusToggle(payment)}
                            >
                              {isPaymentPaid(payment.columnQ) ? (
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
                            <div className="flex flex-col items-end gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditingPayment(payment)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDelete(payment.id)}
                              >
                                <Trash2 className="h-4 w-4" />
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

