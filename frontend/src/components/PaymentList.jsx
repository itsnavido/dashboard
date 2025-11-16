import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { formatDate, formatNumber } from '../utils';

const PaymentList = ({ onEdit, onDelete }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

  // Filter payments based on search term (Discord ID or uniqueID)
  const filteredPayments = useMemo(() => {
    if (!searchTerm.trim()) {
      return payments;
    }
    const search = searchTerm.toLowerCase().trim();
    return payments.filter(payment => 
      (payment.userid && payment.userid.toLowerCase().includes(search)) ||
      (payment.uniqueID && payment.uniqueID.toLowerCase().includes(search)) ||
      (String(payment.id).includes(search))
    );
  }, [payments, searchTerm]);

  // Paginate filtered payments
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPayments, currentPage]);

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  useEffect(() => {
    // Reset to page 1 when search changes
    setCurrentPage(1);
  }, [searchTerm]);

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
                <th>ID</th>
                <th>Time</th>
                <th>Discord ID</th>
                <th>Realm</th>
                <th>Amount</th>
                <th>Price</th>
                <th>Total Amount</th>
                <th>Duration</th>
                <th>Time Left</th>
                <th>Admin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '40px' }}>
                    Loading payments...
                  </td>
                </tr>
              ) : paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '40px' }}>
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
                  let rowStyle = {};
                  if (isNegative) {
                    rowStyle.color = '#c084fc'; // Purple (highest priority)
                  } else if (isColumnQTrue) {
                    rowStyle.color = '#86efac'; // Green
                  } else if (isLahzei) {
                    rowStyle.color = '#93c5fd'; // Blue
                  }
                  
                  return (
                    <tr key={payment.id} style={rowStyle}>
                      <td>{payment.uniqueID || payment.id}</td>
                      <td>{payment.time}</td>
                      <td>{payment.userid}</td>
                      <td>{payment.realm}</td>
                      <td>{payment.amount}</td>
                      <td>{payment.price}</td>
                      <td>
                        {payment.gheymat ? (
                          <>
                            {formatNumber(parseFloat(payment.gheymat.toString().replace(/,/g, '')) || 0)}
                            {payment.paymentDuration && payment.paymentDuration.toString().toLowerCase().includes('usdt') ? ' $' : ' Rial'}
                          </>
                        ) : ''}
                      </td>
                      <td>{payment.paymentDuration}</td>
                      <td>{payment.timeLeftToPay || ''}</td>
                      <td>{payment.admin}</td>
                      <td>
                        <button
                          className="btn-small btn-secondary"
                          onClick={() => onEdit && onEdit(payment)}
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

