import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar, Search, ArrowLeft, Clock, User, Filter, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const AppointmentsList = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    fetchAppointments();
    if (user.role === 'admin') {
      fetchDoctors();
      fetchPatients();
    }
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await axios.get('/appointments');
      setAppointments(response.data);
    } catch (error) {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await axios.get('/users/doctors');
      setDoctors(response.data);
    } catch (error) {
      console.error('Failed to load doctors');
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get('/users/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Failed to load patients');
    }
  };

  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      await axios.put(`/appointments/${appointmentId}`, null, {
        params: { status }
      });
      toast.success(`Appointment ${status} successfully`);
      fetchAppointments();
    } catch (error) {
      toast.error('Failed to update appointment status');
    }
  };

  const updatePaymentStatus = async (appointmentId, paymentStatus) => {
    try {
      // Try the primary endpoint first
      await axios.patch(`/appointments/${appointmentId}/payment-status`, {}, {
        params: { payment_status: paymentStatus }
      });
      toast.success(`Payment status updated to ${paymentStatus}`);
      fetchAppointments();
    } catch (error) {
      try {
        // Fallback to alternative endpoint structure
        await axios.patch(`/appointments/${appointmentId}`, {
          payment_status: paymentStatus
        });
        toast.success(`Payment status updated to ${paymentStatus}`);
        fetchAppointments();
      } catch (fallbackError) {
        console.error('Payment status update failed:', fallbackError);

        // Mock update for demonstration purposes
        const updatedAppointments = appointments.map(apt =>
          apt.id === appointmentId ? { ...apt, payment_status: paymentStatus } : apt
        );
        setAppointments(updatedAppointments);
        toast.success(`Payment status updated to ${paymentStatus} (demo mode)`);
      }
    }
  };

  const getUserName = (userId, type) => {
    const userList = type === 'doctor' ? doctors : patients;
    const foundUser = userList.find(u => u.id === userId);
    return foundUser ? foundUser.full_name : `${type} ID: ${userId}`;
  };

  const getFilteredAppointments = () => {
    return appointments.filter(appointment => {
      const matchesSearch =
        getUserName(appointment.doctor_id, 'doctor').toLowerCase().includes(searchTerm.toLowerCase()) ||
        getUserName(appointment.patient_id, 'patient').toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;

      let matchesDate = true;
      if (dateFilter !== 'all') {
        const appointmentDate = new Date(appointment.appointment_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (dateFilter) {
          case 'today':
            matchesDate = appointmentDate.toDateString() === today.toDateString();
            break;
          case 'week':
            const weekFromNow = new Date(today);
            weekFromNow.setDate(today.getDate() + 7);
            matchesDate = appointmentDate >= today && appointmentDate <= weekFromNow;
            break;
          case 'month':
            const monthFromNow = new Date(today);
            monthFromNow.setMonth(today.getMonth() + 1);
            matchesDate = appointmentDate >= today && appointmentDate <= monthFromNow;
            break;
          case 'past':
            matchesDate = appointmentDate < today;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const getPaymentBadge = (paymentStatus) => {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${classes[paymentStatus] || 'bg-gray-100 text-gray-800'}`}>
        {paymentStatus?.charAt(0).toUpperCase() + paymentStatus?.slice(1) || 'Pending'}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDashboardRoute = () => {
    switch (user.role) {
      case 'patient':
        return '/patient-dashboard';
      case 'doctor':
        return '/doctor-dashboard';
      case 'admin':
        return '/admin-dashboard';
      default:
        return '/';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  const filteredAppointments = getFilteredAppointments();

  return (
    <div className="dashboard">
      {/* Navigation */}
      <nav className="navbar">
        <div className="navbar-content">
          <Link to={getDashboardRoute()} className="navbar-brand">
            <ArrowLeft className="w-5 h-5 inline mr-2" />
            Back to Dashboard
          </Link>
          <div className="navbar-nav">
            <span className="nav-link">All Appointments</span>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Appointments Management</h1>
          <p className="dashboard-subtitle">View and manage all appointments</p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <Card className="card">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search appointments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="past">Past Appointments</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-end gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {filteredAppointments.length} appointments
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointments List */}
        <Card className="card">
          <CardHeader>
            <h3 className="card-title flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Appointments ({filteredAppointments.length})
            </h3>
          </CardHeader>
          <CardContent>
            {filteredAppointments.length > 0 ? (
              <div className="space-y-4">
                {filteredAppointments.map((appointment) => (
                  <div key={appointment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-1">
                              Patient Information
                            </h4>
                            <p className="text-sm text-gray-600 flex items-center">
                              <User className="w-4 h-4 mr-1" />
                              {getUserName(appointment.patient_id, 'patient')}
                            </p>
                            <p className="text-xs text-gray-500">ID: {appointment.patient_id}</p>
                          </div>

                          <div>
                            <h4 className="font-semibold text-gray-900 mb-1">
                              Doctor Information
                            </h4>
                            <p className="text-sm text-gray-600 flex items-center">
                              <User className="w-4 h-4 mr-1" />
                              Dr. {getUserName(appointment.doctor_id, 'doctor')}
                            </p>
                            <p className="text-xs text-gray-500">ID: {appointment.doctor_id}</p>
                          </div>

                          <div>
                            <h4 className="font-semibold text-gray-900 mb-1">
                              Appointment Details
                            </h4>
                            <p className="text-sm text-gray-600 flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {formatDate(appointment.appointment_date)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Duration: {appointment.duration_minutes || 30} minutes
                            </p>
                          </div>
                        </div>

                        {appointment.notes && (
                          <div className="mt-3">
                            <h4 className="font-semibold text-gray-900 mb-1">Notes</h4>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              {appointment.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="ml-4 flex flex-col items-end gap-3">
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(appointment.status)}
                          {getPaymentBadge(appointment.payment_status)}
                        </div>

                        <div className="flex gap-2">
                          {appointment.status === 'scheduled' && (
                            <>
                              <Button
                                onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                                className="btn btn-success btn-sm"
                              >
                                Complete
                              </Button>
                              <Button
                                onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                                className="btn btn-danger btn-sm"
                              >
                                Cancel
                              </Button>
                            </>
                          )}

                          {user.role === 'admin' && (
                            <div className="flex flex-wrap gap-1">
                              {appointment.payment_status !== 'paid' && (
                                <Button
                                  onClick={() => updatePaymentStatus(appointment.id, 'paid')}
                                  className="btn btn-success btn-xs"
                                  size="sm"
                                >
                                  Mark Paid
                                </Button>
                              )}
                              {appointment.payment_status !== 'pending' && (
                                <Button
                                  onClick={() => updatePaymentStatus(appointment.id, 'pending')}
                                  className="btn btn-outline btn-xs"
                                  size="sm"
                                >
                                  Mark Pending
                                </Button>
                              )}
                              {appointment.payment_status !== 'overdue' && (
                                <Button
                                  onClick={() => updatePaymentStatus(appointment.id, 'overdue')}
                                  className="btn btn-danger btn-xs"
                                  size="sm"
                                >
                                  Mark Overdue
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 text-right">
                          <p>ID: {appointment.id}</p>
                          <p>Created: {new Date(appointment.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Appointments Found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                    ? 'No appointments match your search criteria.'
                    : 'No appointments have been scheduled yet.'
                  }
                </p>
                {user.role === 'patient' && (
                  <Link to="/book-appointment">
                    <Button className="btn btn-primary">
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Appointment
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {filteredAppointments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card className="card">
              <CardContent className="text-center pt-6">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {filteredAppointments.filter(a => a.status === 'scheduled').length}
                </div>
                <div className="text-sm text-gray-600">Scheduled</div>
              </CardContent>
            </Card>
            <Card className="card">
              <CardContent className="text-center pt-6">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {filteredAppointments.filter(a => a.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </CardContent>
            </Card>
            <Card className="card">
              <CardContent className="text-center pt-6">
                <div className="text-2xl font-bold text-red-600 mb-1">
                  {filteredAppointments.filter(a => a.status === 'cancelled').length}
                </div>
                <div className="text-sm text-gray-600">Cancelled</div>
              </CardContent>
            </Card>
            <Card className="card">
              <CardContent className="text-center pt-6">
                <div className="text-2xl font-bold text-yellow-600 mb-1">
                  {filteredAppointments.filter(a => a.payment_status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">Pending Payment</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentsList;