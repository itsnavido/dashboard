import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './EmptyState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  Loader2, 
  XCircle,
  Save,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// User row component with inline editing
const UserRow = ({ user, onUpdateRole, onUpdateCredentials, onDelete }) => {
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [username, setUsername] = useState(user.username || '');
  const [password, setPassword] = useState('');

  const handleSaveCredentials = () => {
    if (!username.trim()) {
      toast.error('Username cannot be empty');
      return;
    }
    onUpdateCredentials(user.discordId, username.trim(), password || undefined);
    setIsEditingCredentials(false);
    setPassword('');
  };

  const handleCancelEdit = () => {
    setUsername(user.username || '');
    setPassword('');
    setIsEditingCredentials(false);
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{user.discordId}</TableCell>
      <TableCell>
        <Select
          value={user.role}
          onValueChange={(value) => onUpdateRole(user.discordId, value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="User">User</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {isEditingCredentials ? (
          <Input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full"
            autoFocus
          />
        ) : (
          <span>{user.username || '-'}</span>
        )}
      </TableCell>
      <TableCell>
        {isEditingCredentials ? (
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave empty to keep current"
            className="w-full"
          />
        ) : (
          <span className="text-muted-foreground">{user.username ? '••••••' : 'Not set'}</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : '-'}
      </TableCell>
      <TableCell>
        {isEditingCredentials ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveCredentials}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingCredentials(true)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(user.discordId)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({
    discordId: '',
    role: 'User'
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

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
      toast.error('Failed to load users');
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
      toast.success('User added successfully');
      fetchUsers();
    } catch (err) {
      console.error('Error adding user:', err);
      const errorMsg = err.response?.data?.error || 'Failed to add user';
      toast.error(errorMsg);
    }
  };

  const handleUpdateRole = async (discordId, newRole) => {
    try {
      await api.put(`/users/${discordId}`, { role: newRole });
      toast.success('User role updated');
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      const errorMsg = err.response?.data?.error || 'Failed to update user';
      toast.error(errorMsg);
    }
  };

  const handleDeleteClick = (discordId) => {
    setUserToDelete(discordId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      await api.delete(`/users/${userToDelete}`);
      toast.success('User deleted successfully');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      const errorMsg = err.response?.data?.error || 'Failed to delete user';
      toast.error(errorMsg);
    }
  };

  const handleUpdateCredentials = async (discordId, username, password) => {
    try {
      await api.put(`/users/${discordId}`, { username, password });
      toast.success('Credentials updated successfully');
      fetchUsers();
    } catch (err) {
      console.error('Error updating credentials:', err);
      const errorMsg = err.response?.data?.error || 'Failed to update credentials';
      toast.error(errorMsg);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage users and their roles</CardDescription>
            </div>
            <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newDiscordId">Discord ID</Label>
                    <Input
                      id="newDiscordId"
                      type="text"
                      value={newUser.discordId}
                      onChange={(e) => setNewUser({ ...newUser, discordId: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newRole">Role</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                    >
                      <SelectTrigger id="newRole">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="User">User</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add User</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              title="No users found"
              description="Get started by adding your first user"
            />
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Discord ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Updated At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <UserRow
                      key={user.discordId}
                      user={user}
                      onUpdateRole={handleUpdateRole}
                      onUpdateCredentials={handleUpdateCredentials}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user {userToDelete}? 
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

export default UserManagement;
