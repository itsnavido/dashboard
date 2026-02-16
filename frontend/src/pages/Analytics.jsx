import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/services/api';
import { formatNumber } from '@/utils';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#a78bfa', '#f472b6', '#60a5fa', '#34d399', '#fbbf24'];

function Analytics() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: async () => {
      const res = await api.get('/analytics/overview');
      return res.data;
    },
  });

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['analytics', 'users'],
    queryFn: async () => {
      const res = await api.get('/analytics/users');
      return res.data;
    },
  });

  const { data: realmData, isLoading: realmLoading } = useQuery({
    queryKey: ['analytics', 'realm'],
    queryFn: async () => {
      const res = await api.get('/analytics/realm');
      return res.data;
    },
  });

  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['analytics', 'timeline'],
    queryFn: async () => {
      const res = await api.get('/analytics/timeline?groupBy=day');
      return res.data;
    },
  });

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['analytics', 'status'],
    queryFn: async () => {
      const res = await api.get('/analytics/status');
      return res.data;
    },
  });

  // Prepare chart data
  const userChartData = userData?.slice(0, 10).map(user => ({
    name: user.userId.substring(0, 8) + '...',
    amount: user.totalAmount,
    paid: user.paidAmount,
  })) || [];

  const realmChartData = realmData?.map(realm => ({
    name: realm.realm,
    value: realm.totalAmount,
    payments: realm.totalPayments,
  })) || [];

  const statusChartData = statusData
    ? [
        { name: 'Paid', value: statusData.paid },
        { name: 'Unpaid', value: statusData.unpaid },
      ]
    : [];

  return (
    <ProtectedRoute requireAdmin>
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">Payment statistics and insights</p>
          </div>

          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewLoading ? '...' : overview?.totalPayments || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {overviewLoading ? '...' : overview?.paidPayments || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  {overviewLoading ? '...' : overview?.unpaidPayments || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewLoading ? '...' : formatNumber(overview?.totalRevenue || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList>
              <TabsTrigger value="users">By User</TabsTrigger>
              <TabsTrigger value="realm">By Realm</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Users by Payment Amount</CardTitle>
                  <CardDescription>Top 10 users by total payment amount</CardDescription>
                </CardHeader>
                <CardContent>
                  {userLoading ? (
                    <div className="h-[400px] flex items-center justify-center">Loading...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={userChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="amount" fill="#a78bfa" name="Total Amount" />
                        <Bar dataKey="paid" fill="#34d399" name="Paid Amount" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="realm" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payments by Realm</CardTitle>
                  <CardDescription>Distribution of payments across different realms</CardDescription>
                </CardHeader>
                <CardContent>
                  {realmLoading ? (
                    <div className="h-[400px] flex items-center justify-center">Loading...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={realmChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${formatNumber(value)}`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {realmChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payments Over Time</CardTitle>
                  <CardDescription>Daily payment trends</CardDescription>
                </CardHeader>
                <CardContent>
                  {timelineLoading ? (
                    <div className="h-[400px] flex items-center justify-center">Loading...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#a78bfa" name="Payment Count" />
                        <Line type="monotone" dataKey="amount" stroke="#34d399" name="Amount" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="status" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Status Distribution</CardTitle>
                  <CardDescription>Paid vs Unpaid payments</CardDescription>
                </CardHeader>
                <CardContent>
                  {statusLoading ? (
                    <div className="h-[400px] flex items-center justify-center">Loading...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusChartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={index === 0 ? '#34d399' : '#fbbf24'}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

export default Analytics;
