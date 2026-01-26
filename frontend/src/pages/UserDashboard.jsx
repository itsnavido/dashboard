import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { formatNumber } from '@/utils';
import { CreditCard, DollarSign, Clock } from 'lucide-react';

function UserDashboard() {
  const { user } = useAuth();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', 'user'],
    queryFn: async () => {
      const res = await api.get('/payments');
      return res.data;
    },
  });

  // Calculate user statistics
  const stats = payments
    ? {
        totalPayments: payments.length,
        paidPayments: payments.filter(p => p.processed === true).length,
        unpaidPayments: payments.filter(p => p.processed !== true).length,
        totalPaid: payments
          .filter(p => p.processed === true)
          .reduce((sum, p) => sum + (parseFloat(p.gheymat || 0) || 0), 0),
        totalPending: payments
          .filter(p => p.processed !== true)
          .reduce((sum, p) => sum + (parseFloat(p.gheymat || 0) || 0), 0),
      }
    : {
        totalPayments: 0,
        paidPayments: 0,
        unpaidPayments: 0,
        totalPaid: 0,
        totalPending: 0,
      };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">My Payments</h1>
            <p className="text-muted-foreground">View your payment history and status</p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : stats.totalPayments}
                </div>
                <p className="text-xs text-muted-foreground">All your payments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {isLoading ? '...' : stats.paidPayments}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(stats.totalPaid)} Rial
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  {isLoading ? '...' : stats.unpaidPayments}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(stats.totalPending)} Rial
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : formatNumber(stats.totalPaid + stats.totalPending)}
                </div>
                <p className="text-xs text-muted-foreground">Rial</p>
              </CardContent>
            </Card>
          </div>

          {/* Payments List */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All your payments</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : payments?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payments found
                </div>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{payment.uniqueID}</span>
                          <Badge
                            variant={payment.processed ? 'success' : 'warning'}
                          >
                            {payment.processed ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Realm: {payment.realm}</div>
                          <div>Date: {payment.time}</div>
                          {payment.note && <div>Note: {payment.note}</div>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">
                          {formatNumber(parseFloat(payment.gheymat || 0))} Rial
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {payment.paymentDuration}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

export default UserDashboard;

