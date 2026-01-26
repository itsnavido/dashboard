import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { formatDate, formatNumber } from '../utils';

// Format time left in hours
const formatTimeLeft = (timeLeftStr) => {
  if (!timeLeftStr || timeLeftStr === '') return '';
  
  const timeLeft = parseFloat(timeLeftStr.toString().replace(/,/g, ''));
  if (isNaN(timeLeft)) return timeLeftStr;
  
  // Format with 1 decimal place if needed, otherwise show as integer
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
    // Reset to page 1 when search or sort changes
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) {
      return;
    }

    try {
      await api.delete(`/payments/${id}`);
      fetchPayments();
      if (onDelete) onDelete();
    } catch (err) {
      console.error('Error deleting payment:', err);
      alert('Failed to delete payment');
    }
  };

  return (
    <div className="box">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Payment List</h2>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search by Discord ID or Payment ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={fetchPayments} className="btn-small">
            Refresh
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="pagination-info" style={{ marginBottom: '1rem' }}>
          Showing {paginatedPayments.length} of {filteredPayments.length} payments
          {searchTerm && ` (filtered from ${payments.length} total)`}
        </div>
      </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th></th>
                <th onClick={() => handleSort('uniqueID')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  ID {sortColumn === 'uniqueID' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('time')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Time {sortColumn === 'time' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('userid')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Discord ID {sortColumn === 'userid' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('realm')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Realm {sortColumn === 'realm' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('amount')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Amount {sortColumn === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('price')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Price {sortColumn === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('gheymat')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Total Amount {sortColumn === 'gheymat' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('paymentDuration')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Duration {sortColumn === 'paymentDuration' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('timeLeftToPay')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Time Left {sortColumn === 'timeLeftToPay' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('admin')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Admin {sortColumn === 'admin' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('columnQ')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Status {sortColumn === 'columnQ' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ minWidth: '150px', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="13" style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                      <div className="spinner spinner-small">
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                      </div>
                      <span>Loading payments...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan="13" style={{ textAlign: 'center', padding: '40px' }}>
                    {searchTerm ? 'No payments found matching your search' : 'No payments found'}
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((payment) => {
                  // Check if time left is negative
                  const timeLeftStr = payment.timeLeftToPay || '';
                  const isNegative = timeLeftStr.toString().trim().startsWith('-') || 
                                   (timeLeftStr && !isNaN(parseFloat(timeLeftStr)) && parseFloat(timeLeftStr) < 0);
                  
                  // Check if column Q is TRUE
                  const isColumnQTrue = payment.columnQ === true || 
                                       payment.columnQ === 'TRUE' || 
                                       payment.columnQ === 'true' ||
                                       payment.columnQ === 'True';
                  
                  // Check if duration contains "lahzei"
                  const isLahzei = payment.paymentDuration && 
                                  payment.paymentDuration.toString().toLowerCase().includes('lahzei');
                  
                  // Determine row font color with priority: purple > green > blue
                  let textColor = '';
                  if (isNegative) {
                    textColor = '#c084fc'; // Purple (highest priority)
                  } else if (isColumnQTrue) {
                    textColor = '#86efac'; // Green
                  } else if (isLahzei) {
                    textColor = '#93c5fd'; // Blue
                  }
                  
                  const isExpanded = expandedPayments.has(payment.id);
                  const logs = paymentLogs[payment.uniqueID] || [];
                  
                  return (
                    <React.Fragment key={payment.id}>
                      <tr>
                        <td>
                          <button
                            onClick={() => togglePaymentExpansion(payment.id, payment.uniqueID)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '14px',
                              padding: '4px 8px'
                            }}
                            title="Toggle logs"
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        </td>
                        <td style={textColor ? { color: textColor } : {}}>{payment.uniqueID || payment.id}</td>
                        <td style={textColor ? { color: textColor } : {}}>{payment.time}</td>
                        <td style={textColor ? { color: textColor } : {}}>{payment.userid}</td>
                        <td style={textColor ? { color: textColor } : {}}>{payment.realm}</td>
                        <td style={textColor ? { color: textColor } : {}}>{payment.amount}</td>
                        <td style={textColor ? { color: textColor } : {}}>{payment.price}</td>
                        <td style={textColor ? { color: textColor } : {}}>
                          {payment.gheymat ? (
                            <>
                              {formatNumber(parseFloat(payment.gheymat.toString().replace(/,/g, '')) || 0)}
                              {payment.paymentDuration && payment.paymentDuration.toString().toLowerCase().includes('usdt') ? ' $' : ' Rial'}
                            </>
                          ) : ''}
                        </td>
                        <td style={textColor ? { color: textColor } : {}}>{payment.paymentDuration}</td>
                        <td style={textColor ? { color: textColor } : {}}>{formatTimeLeft(payment.timeLeftToPay)}</td>
                        <td style={textColor ? { color: textColor } : {}}>{payment.admin}</td>
                        <td style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.75rem',
                              borderRadius: 'var(--radius)',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: isColumnQTrue 
                                ? 'rgba(34, 197, 94, 0.15)' 
                                : 'rgba(239, 68, 68, 0.15)',
                              color: isColumnQTrue 
                                ? '#22c55e' 
                                : '#ef4444',
                              border: `1px solid ${isColumnQTrue ? '#22c55e' : '#ef4444'}`,
                            }}
                          >
                            {isColumnQTrue ? '✓ Paid' : '✕ Unpaid'}
                          </span>
                        </td>
                        <td style={{ minWidth: '150px', whiteSpace: 'nowrap' }}>
                          <button
                            className="btn-small btn-secondary"
                            onClick={() => onEdit && onEdit(payment)}
                            style={{ marginRight: '0.5rem' }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-small btn-danger"
                            onClick={() => handleDelete(payment.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan="13" style={{ padding: '1rem', backgroundColor: '#f5f5f5' }}>
                            <div style={{ marginLeft: '2rem' }}>
                              <h4 style={{ marginBottom: '0.5rem', fontSize: '14px', fontWeight: 'bold' }}>Activity Log</h4>
                              {logs.length === 0 ? (
                                <div style={{ color: '#666', fontSize: '13px' }}>No logs available</div>
                              ) : (
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                  {logs.map((log, idx) => (
                                    <div key={idx} style={{ 
                                      marginBottom: '0.75rem', 
                                      padding: '0.75rem', 
                                      backgroundColor: '#fff', 
                                      borderRadius: '4px',
                                      borderLeft: `3px solid ${log.action === 'create' ? '#22c55e' : '#3b82f6'}`
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '13px' }}>
                                          {log.action === 'create' ? 'Created' : 'Edited'}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#666' }}>
                                          {log.timestamp} by {log.user}
                                        </span>
                                      </div>
                                      {log.action === 'edit' && Object.keys(log.changes).length > 0 && (
                                        <div style={{ fontSize: '12px' }}>
                                          {Object.entries(log.changes).map(([field, change]) => (
                                            <div key={field} style={{ marginTop: '0.25rem', color: '#555' }}>
                                              <strong>{field}:</strong> {change.old || '(empty)'} → {change.new || '(empty)'}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {log.action === 'create' && (
                                        <div style={{ fontSize: '12px', color: '#555' }}>
                                          Payment created with initial values
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="btn-small"
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="btn-small"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentList;

