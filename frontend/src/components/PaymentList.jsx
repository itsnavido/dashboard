import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { formatNumber, isPaymentPaid } from '../utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

// Format time left in hours
const formatTimeLeft = (timeLeftStr) => {
  if (!timeLeftStr || timeLeftStr === '') return '';
  
  const timeLeft = parseFloat(timeLeftStr.toString().replace(/,/g, ''));
  if (isNaN(timeLeft)) return timeLeftStr;
  
  const formatted = timeLeft % 1 === 0 
    ? timeLeft.toString() 
    : timeLeft.toFixed(1);
  
  return `${formatted}h`;
};

const PaymentList = ({ onEdit, onDelete }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
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
    
    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = payments.filter(payment => 
        (payment.userid && payment.userid.toLowerCase().includes(search)) ||
        (payment.uniqueID && payment.uniqueID.toLowerCase().includes(search)) ||
        (String(payment.id).includes(search))
      );
    }
    
    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];
        
        // Handle numeric values
        if (sortColumn === 'amount' || sortColumn === 'price' || sortColumn === 'gheymat') {
          aVal = parseFloat(String(aVal || '').replace(/,/g, '')) || 0;
          bVal = parseFloat(String(bVal || '').replace(/,/g, '')) || 0;
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
  }, [payments, searchTerm, sortColumn, sortDirection]);

  // Paginate filtered payments
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPayments, currentPage]);

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortColumn, sortDirection]);

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
    const isPaid = isPaymentPaid(payment.columnQ);
    const isLahzei = payment.paymentDuration && 
                    payment.paymentDuration.toString().toLowerCase().includes('lahzei');
    
    if (isNegative) return 'text-purple-400';
    if (isPaid) return 'text-green-400';
    if (isLahzei) return 'text-blue-400';
    return '';
  };

  // Mobile card component
  const PaymentCard = ({ payment }) => {
    const isExpanded = expandedPayments.has(payment.id);
    const logs = paymentLogs[payment.uniqueID] || [];
    const rowColor = getRowColor(payment);
    const isPaid = isPaymentPaid(payment.columnQ);

    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`font-semibold ${rowColor || 'text-foreground'}`}>
                  {payment.uniqueID || payment.id}
                </span>
                <Badge variant={isPaid ? 'success' : 'warning'} className="text-xs">
                  {isPaid ? (
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
              </div>
              <div className={`text-sm space-y-1 ${rowColor || 'text-muted-foreground'}`}>
                <div><strong>Discord:</strong> {payment.userid}</div>
                <div><strong>Realm:</strong> {payment.realm}</div>
                <div><strong>Time:</strong> {payment.time}</div>
                {payment.amount && <div><strong>Amount:</strong> {payment.amount}</div>}
                {payment.price && <div><strong>Price:</strong> {payment.price}</div>}
                {payment.gheymat && (
                  <div>
                    <strong>Total:</strong> {formatNumber(parseFloat(payment.gheymat.toString().replace(/,/g, '')) || 0)}
                    {payment.paymentDuration && payment.paymentDuration.toString().toLowerCase().includes('usdt') ? ' $' : ' Rial'}
                  </div>
                )}
                {payment.paymentDuration && <div><strong>Duration:</strong> {payment.paymentDuration}</div>}
                {payment.timeLeftToPay && <div><strong>Time Left:</strong> {formatTimeLeft(payment.timeLeftToPay)}</div>}
                {payment.admin && <div><strong>Admin:</strong> {payment.admin}</div>}
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Payment List</CardTitle>
              <CardDescription>
                {loading ? 'Loading...' : `${filteredPayments.length} payment${filteredPayments.length !== 1 ? 's' : ''}`}
                {searchTerm && ` (filtered from ${payments.length} total)`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPayments}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Discord ID or Payment ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                            className="cursor-pointer hover:bg-muted/50 min-w-[80px]"
                            onClick={() => handleSort('uniqueID')}
                          >
                            <div className="flex items-center truncate">
                              ID
                              {getSortIcon('uniqueID')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[120px]"
                            onClick={() => handleSort('time')}
                          >
                            <div className="flex items-center truncate">
                              Time
                              {getSortIcon('time')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[100px] hidden lg:table-cell"
                            onClick={() => handleSort('userid')}
                          >
                            <div className="flex items-center truncate">
                              Discord ID
                              {getSortIcon('userid')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[80px]"
                            onClick={() => handleSort('realm')}
                          >
                            <div className="flex items-center truncate">
                              Realm
                              {getSortIcon('realm')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[80px] hidden xl:table-cell"
                            onClick={() => handleSort('amount')}
                          >
                            <div className="flex items-center truncate">
                              Amount
                              {getSortIcon('amount')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[80px] hidden xl:table-cell"
                            onClick={() => handleSort('price')}
                          >
                            <div className="flex items-center truncate">
                              Price
                              {getSortIcon('price')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[100px]"
                            onClick={() => handleSort('gheymat')}
                          >
                            <div className="flex items-center truncate">
                              Total
                              {getSortIcon('gheymat')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[90px] hidden lg:table-cell"
                            onClick={() => handleSort('paymentDuration')}
                          >
                            <div className="flex items-center truncate">
                              Duration
                              {getSortIcon('paymentDuration')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[80px] hidden xl:table-cell"
                            onClick={() => handleSort('timeLeftToPay')}
                          >
                            <div className="flex items-center truncate">
                              Time Left
                              {getSortIcon('timeLeftToPay')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[80px] hidden lg:table-cell"
                            onClick={() => handleSort('admin')}
                          >
                            <div className="flex items-center truncate">
                              Admin
                              {getSortIcon('admin')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50 min-w-[100px]"
                            onClick={() => handleSort('columnQ')}
                          >
                            <div className="flex items-center truncate">
                              Status
                              {getSortIcon('columnQ')}
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
                          const isPaid = isPaymentPaid(payment.columnQ);

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
                                <TableCell className={`font-medium ${rowColor || ''} truncate`}>
                                  {payment.uniqueID || payment.id}
                                </TableCell>
                                <TableCell className={`${rowColor || ''} truncate`}>{payment.time}</TableCell>
                                <TableCell className={`${rowColor || ''} truncate hidden lg:table-cell`}>{payment.userid}</TableCell>
                                <TableCell className={`${rowColor || ''} truncate`}>{payment.realm}</TableCell>
                                <TableCell className={`${rowColor || ''} truncate hidden xl:table-cell`}>{payment.amount}</TableCell>
                                <TableCell className={`${rowColor || ''} truncate hidden xl:table-cell`}>{payment.price}</TableCell>
                                <TableCell className={`${rowColor || ''} truncate`}>
                                  {payment.gheymat ? (
                                    <>
                                      {formatNumber(parseFloat(payment.gheymat.toString().replace(/,/g, '')) || 0)}
                                      {payment.paymentDuration && payment.paymentDuration.toString().toLowerCase().includes('usdt') ? ' $' : ' Rial'}
                                    </>
                                  ) : ''}
                                </TableCell>
                                <TableCell className={`${rowColor || ''} truncate hidden lg:table-cell`}>{payment.paymentDuration}</TableCell>
                                <TableCell className={`${rowColor || ''} truncate hidden xl:table-cell`}>
                                  {formatTimeLeft(payment.timeLeftToPay)}
                                </TableCell>
                                <TableCell className={`${rowColor || ''} truncate hidden lg:table-cell`}>{payment.admin}</TableCell>
                                <TableCell>
                                  <Badge variant={isPaid ? 'success' : 'warning'} className="text-xs">
                                    {isPaid ? (
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
