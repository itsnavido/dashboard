import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { formatNumber, isPaymentPaid } from '../utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Get payment status from Status column (Q column)
function getPaymentStatus(statusValue) {
  if (!statusValue || statusValue === '') {
    return 'Unpaid';
  }
  const status = String(statusValue).trim();
  if (status.toLowerCase() === 'paid') {
    return 'Paid';
  }
  if (status.toLowerCase() === 'failed') {
    return 'Failed';
  }
  return 'Unpaid';
}
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, EmptySearchState } from './EmptyState';
import { 
  Search, 
  RefreshCw, 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown as ChevronDownIcon,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Calculate time left from due date
const calculateTimeLeft = (dueDateStr) => {
  if (!dueDateStr || dueDateStr === '') return '';
  
  try {
    // Parse format: DD/MM/YYYY HH:MM:SS
    const [datePart, timePart] = dueDateStr.split(' ');
    if (!datePart || !timePart) return '';
    
    const [day, month, year] = datePart.split('/');
    const [hours, minutes, seconds] = timePart.split(':');
    
    if (!day || !month || !year || !hours || !minutes || !seconds) return '';
    
    const dueDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );
    
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (isNaN(diffHours)) return '';
    
    const sign = diffHours < 0 ? '-' : '';
    const absHours = Math.abs(diffHours);
    const formatted = absHours % 1 === 0 
      ? absHours.toString() 
      : absHours.toFixed(1);
    
    return `${sign}${formatted}h`;
  } catch (error) {
    return '';
  }
};

const PaymentList = ({ onEdit, onDelete }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [expandedPayments, setExpandedPayments] = useState(new Set());
  const [paymentLogs, setPaymentLogs] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payments');
      setPayments(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort payments
  const filteredPayments = useMemo(() => {
    let filtered = payments;
    
    // Apply search filter (Discord ID, Payment ID/UUID, Realm/Payment Source)
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = payments.filter(payment =>
        (payment.userid && payment.userid.toLowerCase().includes(search)) ||
        (payment.uniqueID && payment.uniqueID.toLowerCase().includes(search)) ||
        (payment.paymentSource && payment.paymentSource.toLowerCase().includes(search)) ||
        (String(payment.id).includes(search))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => {
        const status = getPaymentStatus(payment.status);
        return statusFilter === 'paid' ? status === 'Paid' : status !== 'Paid';
      });
    }
    
    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];
        
        // Handle numeric values
        if (sortColumn === 'amount' || sortColumn === 'price' || sortColumn === 'gheymat' || sortColumn === 'total' || sortColumn === 'ppu') {
          aVal = parseFloat(String(aVal || '').replace(/,/g, '')) || 0;
          bVal = parseFloat(String(bVal || '').replace(/,/g, '')) || 0;
        }
        
        // Handle status column - convert to sortable values
        if (sortColumn === 'status') {
          const statusOrder = { 'Paid': 1, 'Unpaid': 2, 'Failed': 3 };
          aVal = statusOrder[getPaymentStatus(aVal)] || 99;
          bVal = statusOrder[getPaymentStatus(bVal)] || 99;
        }
        
        // Handle string values
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        // Handle null/undefined
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [payments, searchTerm, statusFilter, sortColumn, sortDirection]);

  // Paginate filtered payments
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPayments, currentPage]);

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortColumn, sortDirection]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column) => {
    if (sortColumn !== column) {
      return <ChevronsUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4 ml-1" />
      : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const togglePaymentExpansion = async (paymentId, uniqueID) => {
    const newExpanded = new Set(expandedPayments);
    if (newExpanded.has(paymentId)) {
      newExpanded.delete(paymentId);
    } else {
      newExpanded.add(paymentId);
      // Fetch logs if not already loaded
      if (!paymentLogs[uniqueID]) {
        try {
          const response = await api.get(`/payments/${paymentId}/logs`);
          setPaymentLogs(prev => ({ ...prev, [uniqueID]: response.data }));
        } catch (err) {
          console.error('Error fetching logs:', err);
          setPaymentLogs(prev => ({ ...prev, [uniqueID]: [] }));
        }
      }
    }
    setExpandedPayments(newExpanded);
  };

  const handleDeleteClick = (payment) => {
    setPaymentToDelete(payment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) return;

    try {
      await api.delete(`/payments/${paymentToDelete.id}`);
      fetchPayments();
      if (onDelete) onDelete();
      setDeleteDialogOpen(false);
      setPaymentToDelete(null);
    } catch (err) {
      console.error('Error deleting payment:', err);
      setError('Failed to delete payment');
    }
  };

  const getRowColor = (payment) => {
    const timeLeftStr = payment.timeLeftToPay || '';
    const isNegative = timeLeftStr.toString().trim().startsWith('-') || 
                     (timeLeftStr && !isNaN(parseFloat(timeLeftStr)) && parseFloat(timeLeftStr) < 0);
    const paymentStatus = getPaymentStatus(payment.status);
    if (isNegative) return 'text-purple-400';
    if (paymentStatus === 'Paid') return 'text-green-400';
    if (paymentStatus === 'Failed') return 'text-red-400';
    return '';
  };

  // Mobile card component
  const PaymentCard = ({ payment }) => {
    const isExpanded = expandedPayments.has(payment.id);
    const logs = paymentLogs[payment.uniqueID] || [];
    const rowColor = getRowColor(payment);
    const paymentStatus = getPaymentStatus(payment.status);

    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`font-semibold font-mono text-xs ${rowColor || 'text-foreground'}`} title={payment.uniqueID || payment.id}>
                  {payment.uniqueID ? `${payment.uniqueID.substring(0, 8)}...${payment.uniqueID.substring(payment.uniqueID.length - 8)}` : payment.id}
                </span>
                <Badge 
                  variant={paymentStatus === 'Paid' ? 'success' : paymentStatus === 'Failed' ? 'destructive' : 'warning'} 
                  className="text-xs"
                >
                  {paymentStatus === 'Paid' ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Paid
                    </>
                  ) : paymentStatus === 'Failed' ? (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Failed
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Unpaid
                    </>
                  )}
                </Badge>
              </div>
              <div className={`text-sm space-y-3 ${rowColor || 'text-muted-foreground'}`}>
                {/* #1 TimeStamp */}
                <div>
                  <div><strong>#1 TimeStamp:</strong> {payment.time}</div>
                  {payment.dueDate && (
                    <div className="ml-4 text-xs">
                      Due Date: {payment.dueDate} {calculateTimeLeft(payment.dueDate) && `(${calculateTimeLeft(payment.dueDate)})`}
                    </div>
                  )}
                </div>

                {/* #2 Discord ID */}
                <div>
                  <div><strong>#2 Discord ID:</strong> {payment.userid}</div>
                  <div className="ml-4 text-xs font-mono">
                    UUID: {payment.uniqueID ? `${payment.uniqueID.substring(0, 8)}...${payment.uniqueID.substring(payment.uniqueID.length - 8)}` : payment.id}
                  </div>
                </div>

                {/* #3 Payment Time */}
                {payment.paymentTime && (
                  <div>
                    <div><strong>#3 Payment Time:</strong> {payment.paymentTime}</div>
                  </div>
                )}

                {/* #4 Amount*PPU */}
                <div>
                  {payment.amount && payment.ppu && (
                    <div><strong>#4 Amount*PPU:</strong> {payment.amount} × {payment.ppu}</div>
                  )}
                  {(payment.total || payment.gheymat) && (
                    <div className="ml-4 text-xs">
                      Total: {formatNumber(parseFloat((payment.total || payment.gheymat || '0').toString().replace(/,/g, '')) || 0)}
                    </div>
                  )}
                </div>

                {/* #5 Payment Source */}
                <div>
                  {payment.paymentSource && (
                    <div><strong>#5 Payment Source:</strong> {payment.paymentSource}</div>
                  )}
                  {payment.paymentMethod && (
                    <div className="ml-4 text-xs">
                      Payment Method: {payment.paymentMethod}
                    </div>
                  )}
                </div>

                {/* #6 Sheba */}
                <div>
                  {payment.iban && (
                    <div><strong>#6 Sheba:</strong> {payment.iban}</div>
                  )}
                  {payment.card && (
                    <div className="ml-4 text-xs">
                      Card Number: {payment.card}
                    </div>
                  )}
                </div>

                {/* #7 Name */}
                <div>
                  {payment.name && (
                    <div><strong>#7 Name:</strong> {payment.name}</div>
                  )}
                  {payment.phone && (
                    <div className="ml-4 text-xs">
                      Phone Number: {payment.phone}
                    </div>
                  )}
                </div>

                {/* #8 Wallet */}
                <div>
                  {payment.wallet && (
                    <div><strong>#8 Wallet:</strong> {payment.wallet}</div>
                  )}
                  {payment.paypalAddress && (
                    <div className="ml-4 text-xs">
                      Paypal: {payment.paypalAddress}
                    </div>
                  )}
                </div>

                {/* #9 Status */}
                <div>
                  <div><strong>#9 Status:</strong> {paymentStatus}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit && onEdit(payment)}
                className="h-8"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteClick(payment)}
                className="h-8"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => togglePaymentExpansion(payment.id, payment.uniqueID)}
            className="w-full justify-between"
          >
            <span className="text-xs">Activity Log</span>
            {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-semibold mb-2">Activity Log</h4>
              {logs.length === 0 ? (
                <div className="text-sm text-muted-foreground">No logs available</div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {logs.map((log, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-muted rounded-md border-l-2 border-l-primary"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold">
                          {log.action === 'create' ? 'Created' : 'Edited'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {log.timestamp} by {log.user}
                        </span>
                      </div>
                      {log.action === 'edit' && Object.keys(log.changes).length > 0 && (
                        <div className="text-xs space-y-1">
                          {Object.entries(log.changes).map(([field, change]) => (
                            <div key={field}>
                              <strong>{field}:</strong> {change.old || '(empty)'} → {change.new || '(empty)'}
                            </div>
                          ))}
                        </div>
                      )}
                      {log.action === 'create' && (
                        <div className="text-xs text-muted-foreground">
                          Payment created with initial values
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payment List</CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${filteredPayments.length} payment${filteredPayments.length !== 1 ? 's' : ''}`}
            {searchTerm && ` (filtered from ${payments.length} total)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
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
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="default"
              className="h-10"
              onClick={fetchPayments}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {error}
            </div>
          )}

          {/* Mobile Card View */}
          <div className="block md:hidden">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-3 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : paginatedPayments.length === 0 ? (
              searchTerm ? (
                <EmptySearchState 
                  searchTerm={searchTerm} 
                  onClear={() => setSearchTerm('')} 
                />
              ) : (
                <EmptyState
                  title="No payments found"
                  description="Get started by creating your first payment"
                />
              )
            ) : (
              <>
                {paginatedPayments.map((payment) => (
                  <PaymentCard key={payment.id} payment={payment} />
                ))}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : paginatedPayments.length === 0 ? (
              searchTerm ? (
                <EmptySearchState 
                  searchTerm={searchTerm} 
                  onClear={() => setSearchTerm('')} 
                />
              ) : (
                <EmptyState
                  title="No payments found"
                  description="Get started by creating your first payment"
                />
              )
            ) : (
              <>
                <div className="rounded-md border w-full overflow-hidden">
                  <div className="w-full [&_div]:!overflow-hidden">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[120px]"
                            onClick={() => handleSort('time')}
                          >
                            <div className="flex items-center truncate">
                              #1 TimeStamp
                              {getSortIcon('time')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[100px] hidden lg:table-cell"
                            onClick={() => handleSort('userid')}
                          >
                            <div className="flex items-center truncate">
                              #2 Discord ID
                              {getSortIcon('userid')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[120px] hidden lg:table-cell"
                            onClick={() => handleSort('paymentTime')}
                          >
                            <div className="flex items-center truncate">
                              #3 Payment Time
                              {getSortIcon('paymentTime')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[100px] hidden xl:table-cell"
                            onClick={() => handleSort('total')}
                          >
                            <div className="flex items-center truncate">
                              #4 Amount*PPU
                              {getSortIcon('total')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[100px] hidden lg:table-cell"
                            onClick={() => handleSort('paymentSource')}
                          >
                            <div className="flex items-center truncate">
                              #5 Payment Source
                              {getSortIcon('paymentSource')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[100px] hidden xl:table-cell"
                            onClick={() => handleSort('iban')}
                          >
                            <div className="flex items-center truncate">
                              #6 Sheba
                              {getSortIcon('iban')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[100px] hidden xl:table-cell"
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center truncate">
                              #7 Name
                              {getSortIcon('name')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[100px] hidden xl:table-cell"
                            onClick={() => handleSort('wallet')}
                          >
                            <div className="flex items-center truncate">
                              #8 Wallet
                              {getSortIcon('wallet')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[100px]"
                            onClick={() => handleSort('status')}
                          >
                            <div className="flex items-center truncate">
                              #9 Status
                              {getSortIcon('status')}
                            </div>
                          </TableHead>
                          <TableHead className="text-right min-w-[140px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedPayments.map((payment) => {
                          const isExpanded = expandedPayments.has(payment.id);
                          const logs = paymentLogs[payment.uniqueID] || [];
                          const rowColor = getRowColor(payment);
                          const paymentStatus = getPaymentStatus(payment.status);

                          return (
                            <React.Fragment key={payment.id}>
                              <TableRow className={rowColor ? `${rowColor} hover:${rowColor}` : ''}>
                                <TableCell className="w-12">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => togglePaymentExpansion(payment.id, payment.uniqueID)}
                                  >
                                    {isExpanded ? (
                                      <ChevronDownIcon className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TableCell>
                                <TableCell className={`${rowColor || ''} truncate`}>
                                  <div>{payment.time}</div>
                                  {payment.dueDate && (
                                    <div className="text-xs text-muted-foreground">
                                      {payment.dueDate} {calculateTimeLeft(payment.dueDate) && `(${calculateTimeLeft(payment.dueDate)})`}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className={`${rowColor || ''} truncate hidden lg:table-cell`}>
                                  <div>{payment.userid}</div>
                                  <div className="text-xs font-mono text-muted-foreground">
                                    {payment.uniqueID ? `${payment.uniqueID.substring(0, 8)}...${payment.uniqueID.substring(payment.uniqueID.length - 8)}` : payment.id}
                                  </div>
                                </TableCell>
                                <TableCell className={`${rowColor || ''} truncate hidden lg:table-cell`}>{payment.paymentTime || payment.time}</TableCell>
                                <TableCell className={`${rowColor || ''} truncate hidden xl:table-cell`}>
                                  {payment.amount && payment.ppu && (
                                    <div className="text-xs text-muted-foreground">{payment.amount} × {payment.ppu}</div>
                                  )}
                                  {(payment.total || payment.gheymat) ? (
                                    <div>
                                      {formatNumber(parseFloat((payment.total || payment.gheymat || '0').toString().replace(/,/g, '')) || 0)}
                                    </div>
                                  ) : ''}
                                </TableCell>
                                <TableCell className={`${rowColor || ''} truncate hidden lg:table-cell`}>
                                  {payment.paymentSource || ''}
                                  {payment.paymentMethod && (
                                    <div className="text-xs text-muted-foreground">{payment.paymentMethod}</div>
                                  )}
                                </TableCell>
                                <TableCell className={`${rowColor || ''} truncate hidden xl:table-cell`}>
                                  {payment.iban || ''}
                                  {payment.card && (
                                    <div className="text-xs text-muted-foreground">{payment.card}</div>
                                  )}
                                </TableCell>
                                <TableCell className={`${rowColor || ''} truncate hidden xl:table-cell`}>
                                  {payment.name || ''}
                                  {payment.phone && (
                                    <div className="text-xs text-muted-foreground">{payment.phone}</div>
                                  )}
                                </TableCell>
                                <TableCell className={`${rowColor || ''} truncate hidden xl:table-cell`}>
                                  {payment.wallet || ''}
                                  {payment.paypalAddress && (
                                    <div className="text-xs text-muted-foreground">{payment.paypalAddress}</div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={paymentStatus === 'Paid' ? 'success' : paymentStatus === 'Failed' ? 'destructive' : 'warning'} 
                                    className="text-xs"
                                  >
                                    {paymentStatus === 'Paid' ? (
                                      <>
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Paid
                                      </>
                                    ) : paymentStatus === 'Failed' ? (
                                      <>
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Failed
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Unpaid
                                      </>
                                    )}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => onEdit && onEdit(payment)}
                                    >
                                      <Edit className="h-4 w-4 mr-1" />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeleteClick(payment)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      Delete
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={13} className="bg-muted/50">
                                  <div className="p-4">
                                    <h4 className="text-sm font-semibold mb-3">Activity Log</h4>
                                    {logs.length === 0 ? (
                                      <div className="text-sm text-muted-foreground">No logs available</div>
                                    ) : (
                                      <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {logs.map((log, idx) => (
                                          <div
                                            key={idx}
                                            className="p-3 bg-background rounded-md border-l-2 border-l-primary"
                                          >
                                            <div className="flex justify-between items-start mb-2">
                                              <span className="text-xs font-semibold">
                                                {log.action === 'create' ? 'Created' : 'Edited'}
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                {log.timestamp} by {log.user}
                                              </span>
                                            </div>
                                            {log.action === 'edit' && Object.keys(log.changes).length > 0 && (
                                              <div className="text-xs space-y-1">
                                                {Object.entries(log.changes).map(([field, change]) => (
                                                  <div key={field}>
                                                    <strong>{field}:</strong> {change.old || '(empty)'} → {change.new || '(empty)'}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                            {log.action === 'create' && (
                                              <div className="text-xs text-muted-foreground">
                                                Payment created with initial values
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete payment {paymentToDelete?.uniqueID || paymentToDelete?.id}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentList;
