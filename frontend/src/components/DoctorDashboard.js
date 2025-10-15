import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Calendar, Users, FileText, Pill, MessageCircle, Clock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const DoctorDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({});
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, appointmentsRes, patientsRes] = await Promise.all([
        axios.get('/dashboard/stats'),
        axios.get('/appointments'),
        axios.get('/users/patients')
      ]);

      setStats(statsRes.data);
      
      // Filter today's appointments
      const today = new Date().toDateString();
      const todayAppts = appointmentsRes.data.filter(apt => 
        new Date(apt.appointment_date).toDateString() === today
      );
      setTodayAppointments(todayAppts);
      
      setRecentPatients(patientsRes.data.slice(0, 5));
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
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

  const getStatusBadge = (status) => {
    const classes = {
      scheduled: 'badge badge-info',
      completed: 'badge badge-success',
      cancelled: 'badge badge-danger'
    };
    return <span className={classes[status] || 'badge badge-info'}>{status}</span>;
  };

  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      await axios.put(`/appointments/${appointmentId}`, null, {
        params: { status }
      });
      toast.success('Appointment status updated');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update appointment status');
    }
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
          <Link to="/" className="navbar-brand">
            MedConnect - Doctor Portal
          </Link>
          <div className="navbar-nav">
            <span className="nav-link">Dr. {user.full_name}</span>
            <span className="nav-link text-sm">{user.specialization}</span>
            <Button onClick={logout} className="btn btn-outline">
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Doctor Dashboard</h1>
          <p className="dashboard-subtitle">Manage your practice and patients</p>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <Calendar className="medical-icon-large mb-3" />
            <div className="stat-number">{stats.total_appointments || 0}</div>
            <div className="stat-label">Total Appointments</div>
          </div>
          <div className="stat-card">
            <Users className="medical-icon-large mb-3" />
            <div className="stat-number">{stats.total_patients || 0}</div>
            <div className="stat-label">Total Patients</div>
          </div>
          <div className="stat-card">
            <Clock className="medical-icon-large mb-3" />
            <div className="stat-number">{stats.today_appointments || 0}</div>
            <div className="stat-label">Today's Appointments</div>
          </div>
          <div className="stat-card">
            <FileText className="medical-icon-large mb-3" />
            <div className="stat-number">{recentPatients.length}</div>
            <div className="stat-label">Active Patients</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 mb-4">
          <Card className="card">
            <CardHeader>
              <h3 className="card-title">Quick Actions</h3>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Link to="/medical-records">
                <Button className="btn btn-primary w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  Medical Records
                </Button>
              </Link>
              <Link to="/prescriptions">
                <Button className="btn btn-success w-full">
                  <Pill className="w-4 h-4 mr-2" />
                  Prescriptions
                </Button>
              </Link>
              <Link to="/user-management">
                <Button className="btn btn-outline w-full col-span-2">
                  <Users className="w-4 h-4 mr-2" />
                  Patient List
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="card col-span-2">
            <CardHeader>
              <h3 className="card-title">Today's Schedule</h3>
            </CardHeader>
            <CardContent>
              {todayAppointments.length > 0 ? (
                <div className="space-y-3">
                  {todayAppointments.slice(0, 4).map((appointment) => (
                    <div key={appointment.id} className="flex justify-between items-center border-b pb-2 last:border-b-0">
                      <div>
                        <p className="font-semibold">Patient ID: {appointment.patient_id}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(appointment.appointment_date).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(appointment.status)}
                        {appointment.status === 'scheduled' && (
                          <Button
                            onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                            className="btn btn-success btn-sm"
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center">No appointments scheduled for today</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-2">
          <Card className="card">
            <CardHeader>
              <h3 className="card-title">Recent Patients</h3>
            </CardHeader>
            <CardContent>
              {recentPatients.length > 0 ? (
                <div className="space-y-3">
                  {recentPatients.map((patient) => (
                    <div key={patient.id} className="flex justify-between items-center border-b pb-3 last:border-b-0">
                      <div>
                        <p className="font-semibold">{patient.full_name}</p>
                        <p className="text-sm text-gray-600">{patient.email}</p>
                        {patient.phone && (
                          <p className="text-xs text-gray-500">{patient.phone}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/chat/${patient.id}`}>
                          <Button className="btn btn-outline btn-sm">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link to={`/medical-records?patient=${patient.id}`}>
                          <Button className="btn btn-outline btn-sm">
                            <FileText className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center">No patients yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="card">
            <CardHeader>
              <h3 className="card-title">Practice Information</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Specialization</h4>
                  <p className="text-gray-600">{user.specialization || 'General Practice'}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm mb-2">Experience</h4>
                  <p className="text-gray-600">{user.experience || 'Not specified'}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm mb-2">Contact</h4>
                  <p className="text-gray-600 text-sm">{user.email}</p>
                  {user.phone && <p className="text-gray-600 text-sm">{user.phone}</p>}
                </div>

                <Link to="/profile">
                  <Button className="btn btn-outline w-full">
                    Update Profile
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;