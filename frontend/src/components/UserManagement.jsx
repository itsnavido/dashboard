import React, { useState, useEffect } from 'react';
import api from '../services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({
    discordId: '',
    role: 'User'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', newUser);
      setNewUser({ discordId: '', role: 'User' });
      setShowAddForm(false);
      fetchUsers();
    } catch (err) {
      console.error('Error adding user:', err);
      alert(err.response?.data?.error || 'Failed to add user');
    }
  };

  const handleUpdateRole = async (discordId, newRole) => {
    try {
      await api.put(`/users/${discordId}`, { role: newRole });
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      alert(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (discordId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await api.delete(`/users/${discordId}`);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="box">
        <div className="loading">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="box">
      <h2>User Management</h2>
        {error && <div className="error">{error}</div>}
        
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-small"
            style={{ marginBottom: showAddForm ? '1rem' : '0' }}
          >
            {showAddForm ? 'Cancel' : 'Add User'}
          </button>

          {showAddForm && (
            <form onSubmit={handleAddUser} className="box" style={{ marginTop: '1rem', background: 'var(--gray-50)' }}>
            <label>Discord ID:</label>
            <input
              type="text"
              value={newUser.discordId}
              onChange={(e) => setNewUser({ ...newUser, discordId: e.target.value })}
              required
            />
            <label>Role:</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
              <button type="submit" className="btn-success">Add User</button>
            </form>
          )}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Discord ID</th>
                <th>Role</th>
                <th>Created At</th>
                <th>Updated At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.discordId}>
                    <td>{user.discordId}</td>
                    <td>
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.discordId, e.target.value)}
                      >
                        <option value="User">User</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>
                    <td>{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</td>
                    <td>{user.updatedAt ? new Date(user.updatedAt).toLocaleString() : '-'}</td>
                    <td>
                      <button
                        className="btn-small btn-danger"
                        onClick={() => handleDeleteUser(user.discordId)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
};

export default UserManagement;

