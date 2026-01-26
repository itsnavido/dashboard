import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/services/api';
import { Link } from 'react-router-dom';
import { CreditCard, DollarSign, TrendingUp, Users, Plus } from 'lucide-react';
import { formatNumber } from '@/utils';
import { toast } from 'react-hot-toast';

function AdminDashboard() {
  const queryClient = useQueryClient();
  
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: async () => {
      const res = await api.get('/analytics/overview');
      return res.data;
    },
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', 'recent'],
    queryFn: async () => {
      const res = await api.get('/payments');
      return res.data.slice(0, 10); // Get first 10
    },
  });

  const quickMarkPaid = async (paymentId) => {
    try {
      await api.patch(`/payments/${paymentId}/status`, { processed: true });
      toast.success('Payment marked as paid');
      // Refetch payments
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    } catch (error) {
      toast.error('Failed to update payment status');
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Overview of all payments and statistics</p>
            </div>
            <Link to="/admin/payments">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Payment
              </Button>
            </Link>
          </div>

          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {overviewLoading ? (
              <>
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-4 rounded" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16 mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {overview?.totalPayments || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Paid</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">
                      {overview?.paidPayments || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {`${Math.round((overview?.paidPayments / overview?.totalPayments) * 100) || 0}% of total`}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
                    <CreditCard className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-500">
                      {overview?.unpaidPayments || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Pending payment</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(overview?.totalRevenue || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">From paid payments</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>Latest 10 payments</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : payments?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No payments found</div>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{payment.uniqueID}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            payment.processed
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {payment.processed ? 'Paid' : 'Unpaid'}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {payment.userid} • {payment.realm} • {payment.time}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatNumber(parseFloat(payment.gheymat || 0))} Rial
                          </div>
                        </div>
                        {!payment.processed && (
                          <Button
                            size="sm"
                            onClick={() => quickMarkPaid(payment.id)}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Link to="/admin/payments">
                  <Button variant="outline" className="w-full">
                    View All Payments
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

export default AdminDashboard;

