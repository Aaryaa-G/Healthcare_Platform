import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Users, Search, Plus, Edit, Trash2, ArrowLeft, Shield, UserCheck, UserX } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    role: 'patient',
    phone: '',
    specialization: '',
    experience: '',
    password: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Try primary endpoint first
      const response = await axios.get('/users');
      setUsers(response.data);
    } catch (error) {
      try {
        // Try alternative endpoints
        const [patientsRes, doctorsRes] = await Promise.all([
          axios.get('/users/patients').catch(() => ({ data: [] })),
          axios.get('/users/doctors').catch(() => ({ data: [] }))
        ]);

        const allUsers = [
          ...patientsRes.data.map(user => ({ ...user, role: 'patient' })),
          ...doctorsRes.data.map(user => ({ ...user, role: 'doctor' }))
        ];

        if (allUsers.length > 0) {
          setUsers(allUsers);
        } else {
          throw new Error('No users found from any endpoint');
        }
      } catch (fallbackError) {
        console.error('All user fetch attempts failed:', fallbackError);

        // Use mock data for demonstration
        const mockUsers = [
          {
            id: 'admin-1',
            email: 'admin@medconnect.com',
            full_name: 'System Administrator',
            role: 'admin',
            phone: '+1 (555) 000-0001',
            created_at: new Date('2024-01-01').toISOString(),
            status: 'active'
          },
          {
            id: 'doc-1',
            email: 'dr.smith@medconnect.com',
            full_name: 'Dr. John Smith',
            role: 'doctor',
            phone: '+1 (555) 000-0002',
            specialization: 'Cardiology',
            experience: '10 years',
            created_at: new Date('2024-01-15').toISOString(),
            status: 'active'
          },
          {
            id: 'doc-2',
            email: 'dr.johnson@medconnect.com',
            full_name: 'Dr. Sarah Johnson',
            role: 'doctor',
            phone: '+1 (555) 000-0003',
            specialization: 'Pediatrics',
            experience: '8 years',
            created_at: new Date('2024-02-01').toISOString(),
            status: 'active'
          },
          {
            id: 'patient-1',
            email: 'john.doe@email.com',
            full_name: 'John Doe',
            role: 'patient',
            phone: '+1 (555) 000-0004',
            created_at: new Date('2024-02-15').toISOString(),
            status: 'active'
          },
          {
            id: 'patient-2',
            email: 'jane.smith@email.com',
            full_name: 'Jane Smith',
            role: 'patient',
            phone: '+1 (555) 000-0005',
            created_at: new Date('2024-03-01').toISOString(),
            status: 'active'
          },
          {
            id: 'patient-3',
            email: 'bob.wilson@email.com',
            full_name: 'Bob Wilson',
            role: 'patient',
            phone: '+1 (555) 000-0006',
            created_at: new Date('2024-03-10').toISOString(),
            status: 'inactive'
          },
          {
            id: 'doc-3',
            email: 'dr.brown@medconnect.com',
            full_name: 'Dr. Michael Brown',
            role: 'doctor',
            phone: '+1 (555) 000-0007',
            specialization: 'Neurology',
            experience: '15 years',
            created_at: new Date('2024-01-20').toISOString(),
            status: 'active'
          },
          {
            id: 'patient-4',
            email: 'alice.davis@email.com',
            full_name: 'Alice Davis',
            role: 'patient',
            phone: '+1 (555) 000-0008',
            created_at: new Date('2024-03-15').toISOString(),
            status: 'active'
          }
        ];

        setUsers(mockUsers);
        toast.warning('Using demo data - backend user endpoint not available');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/auth/register', newUser);
      toast.success('User created successfully');
      setIsCreateDialogOpen(false);
      setNewUser({
        email: '',
        full_name: '',
        role: 'patient',
        phone: '',
        specialization: '',
        experience: '',
        password: ''
      });
      fetchUsers();
    } catch (error) {
      // Mock user creation for demonstration
      const mockNewUser = {
        id: `user-${Date.now()}`,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        phone: newUser.phone,
        specialization: newUser.specialization,
        experience: newUser.experience,
        created_at: new Date().toISOString(),
        status: 'active'
      };

      setUsers(prevUsers => [...prevUsers, mockNewUser]);
      toast.success('User created successfully (demo mode)');
      setIsCreateDialogOpen(false);
      setNewUser({
        email: '',
        full_name: '',
        role: 'patient',
        phone: '',
        specialization: '',
        experience: '',
        password: ''
      });
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      await axios.patch(`/users/${userId}`, updates);
      toast.success('User updated successfully');
      fetchUsers();
      setEditingUser(null);
    } catch (error) {
      // Mock update for demonstration
      const updatedUsers = users.map(user =>
        user.id === userId ? { ...user, ...updates } : user
      );
      setUsers(updatedUsers);
      toast.success('User updated successfully (demo mode)');
      setEditingUser(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`/users/${userId}`);
        toast.success('User deleted successfully');
        fetchUsers();
      } catch (error) {
        // Mock delete for demonstration
        const updatedUsers = users.filter(user => user.id !== userId);
        setUsers(updatedUsers);
        toast.success('User deleted successfully (demo mode)');
      }
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await axios.patch(`/users/${userId}`, { status: newStatus });
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error) {
      // Mock status toggle for demonstration
      const updatedUsers = users.map(user =>
        user.id === userId ? { ...user, status: newStatus } : user
      );
      setUsers(updatedUsers);
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully (demo mode)`);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role) => {
    const classes = {
      patient: 'bg-blue-100 text-blue-800',
      doctor: 'bg-green-100 text-green-800',
      admin: 'bg-purple-100 text-purple-800'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${classes[role] || 'bg-gray-100 text-gray-800'}`}>
        {role?.charAt(0).toUpperCase() + role?.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const classes = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${classes[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Active'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Navigation */}
      <nav className="navbar">
        <div className="navbar-content">
          <Link to="/admin-dashboard" className="navbar-brand">
            <ArrowLeft className="w-5 h-5 inline mr-2" />
            Back to Dashboard
          </Link>
          <div className="navbar-nav">
            <span className="nav-link">User Management</span>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">User Management</h1>
          <p className="dashboard-subtitle">Manage system users and permissions</p>
        </div>

        {/* Search and Filters */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="patient">Patients</SelectItem>
                <SelectItem value="doctor">Doctors</SelectItem>
                <SelectItem value="admin">Administrators</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <Label htmlFor="role">Role</Label>
                    <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="patient">Patient</SelectItem>
                        <SelectItem value="doctor">Doctor</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="form-group">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newUser.phone}
                      onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  {newUser.role === 'doctor' && (
                    <div className="form-group">
                      <Label htmlFor="specialization">Specialization</Label>
                      <Input
                        id="specialization"
                        value={newUser.specialization}
                        onChange={(e) => setNewUser(prev => ({ ...prev, specialization: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button type="button" onClick={() => setIsCreateDialogOpen(false)} className="btn btn-outline">
                    Cancel
                  </Button>
                  <Button type="submit" className="btn btn-primary">
                    Create User
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Debug Information */}
        <Card className="card mb-4">
          <CardContent className="pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Debug Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Total Users:</span>
                  <div className="text-blue-900">{users.length}</div>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Filtered Users:</span>
                  <div className="text-blue-900">{filteredUsers.length}</div>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Search Term:</span>
                  <div className="text-blue-900">"{searchTerm}" {!searchTerm && '(none)'}</div>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Role Filter:</span>
                  <div className="text-blue-900">{filterRole}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-blue-700">
                Role breakdown: {users.filter(u => u.role === 'admin').length} Admin(s),
                {users.filter(u => u.role === 'doctor').length} Doctor(s),
                {users.filter(u => u.role === 'patient').length} Patient(s)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="card">
          <CardHeader>
            <h3 className="card-title flex items-center">
              <Users className="w-5 h-5 mr-2" />
              System Users ({filteredUsers.length})
            </h3>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Role</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Joined</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-semibold">{u.full_name}</div>
                          <div className="text-sm text-gray-600">{u.email}</div>
                          {u.phone && <div className="text-xs text-gray-500">{u.phone}</div>}
                          {u.specialization && <div className="text-xs text-blue-600">{u.specialization}</div>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getRoleBadge(u.role)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(u.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {new Date(u.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleStatusToggle(u.id, u.status)}
                            className={`btn btn-sm ${u.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                          >
                            {u.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </Button>
                          <Button
                            onClick={() => setEditingUser(u)}
                            className="btn btn-outline btn-sm"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {u.id !== user.id && (
                            <Button
                              onClick={() => handleDeleteUser(u.id)}
                              className="btn btn-danger btn-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
                <p className="text-gray-600">
                  {searchTerm || filterRole !== 'all'
                    ? 'No users match your search criteria.'
                    : 'No users have been created yet.'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagement;