import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Calendar, FileText, Pill, MessageCircle, CreditCard, User } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const PatientDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({});
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, appointmentsRes, prescriptionsRes] = await Promise.all([
        axios.get('/dashboard/stats'),
        axios.get('/appointments'),
        axios.get('/prescriptions')
      ]);

      setStats(statsRes.data);
      setRecentAppointments(appointmentsRes.data.slice(0, 3));
      setRecentPrescriptions(prescriptionsRes.data.slice(0, 3));
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
            MedConnect - Patient Portal
          </Link>
          <div className="navbar-nav">
            <span className="nav-link">Welcome, {user.full_name}</span>
            <Button onClick={logout} className="btn btn-outline">
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Patient Dashboard</h1>
          <p className="dashboard-subtitle">Manage your health and appointments</p>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <Calendar className="medical-icon-large mb-3" />
            <div className="stat-number">{stats.total_appointments || 0}</div>
            <div className="stat-label">Total Appointments</div>
          </div>
          <div className="stat-card">
            <Calendar className="medical-icon-large mb-3" />
            <div className="stat-number">{stats.upcoming_appointments || 0}</div>
            <div className="stat-label">Upcoming Appointments</div>
          </div>
          <div className="stat-card">
            <Pill className="medical-icon-large mb-3" />
            <div className="stat-number">{stats.total_prescriptions || 0}</div>
            <div className="stat-label">Prescriptions</div>
          </div>
          <div className="stat-card">
            <FileText className="medical-icon-large mb-3" />
            <div className="stat-number">{stats.total_records || 0}</div>
            <div className="stat-label">Medical Records</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 mb-4">
          <Card className="card">
            <CardHeader>
              <h3 className="card-title">Quick Actions</h3>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Link to="/book-appointment">
                <Button className="btn btn-primary w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Appointment
                </Button>
              </Link>
              <Link to="/medical-records">
                <Button className="btn btn-success w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  View Records
                </Button>
              </Link>
              <Link to="/prescriptions">
                <Button className="btn btn-outline w-full">
                  <Pill className="w-4 h-4 mr-2" />
                  Prescriptions
                </Button>
              </Link>
              <Link to="/profile">
                <Button className="btn btn-outline w-full">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="card">
            <CardHeader>
              <h3 className="card-title">Health Summary</h3>
            </CardHeader>
            <CardContent>
              {user.medical_history && user.medical_history.length > 0 && (
                <div className="mb-3">
                  <h4 className="font-semibold text-sm mb-2">Medical History</h4>
                  <ul className="text-sm text-gray-600">
                    {user.medical_history.slice(0, 3).map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {user.allergies && user.allergies.length > 0 && (
                <div className="mb-3">
                  <h4 className="font-semibold text-sm mb-2">Allergies</h4>
                  <ul className="text-sm text-gray-600">
                    {user.allergies.slice(0, 2).map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {user.medications && user.medications.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Current Medications</h4>
                  <ul className="text-sm text-gray-600">
                    {user.medications.slice(0, 2).map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-2">
          <Card className="card">
            <CardHeader>
              <h3 className="card-title">Recent Appointments</h3>
            </CardHeader>
            <CardContent>
              {recentAppointments.length > 0 ? (
                <div className="space-y-3">
                  {recentAppointments.map((appointment) => (
                    <div key={appointment.id} className="border-b pb-3 last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">Dr. {appointment.doctor_name || 'Doctor'}</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(appointment.appointment_date)}
                          </p>
                        </div>
                        {getStatusBadge(appointment.status)}
                      </div>
                    </div>
                  ))}
                  <Link to="/appointments">
                    <Button className="btn btn-outline w-full mt-3">
                      View All Appointments
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-gray-500 text-center">No appointments yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="card">
            <CardHeader>
              <h3 className="card-title">Recent Prescriptions</h3>
            </CardHeader>
            <CardContent>
              {recentPrescriptions.length > 0 ? (
                <div className="space-y-3">
                  {recentPrescriptions.map((prescription) => (
                    <div key={prescription.id} className="border-b pb-3 last:border-b-0">
                      <div>
                        <p className="font-semibold">
                          {prescription.medications?.length || 0} Medications
                        </p>
                        <p className="text-sm text-gray-600">
                          Prescribed on {formatDate(prescription.created_at)}
                        </p>
                        {prescription.instructions && (
                          <p className="text-xs text-gray-500 mt-1">
                            {prescription.instructions.substring(0, 50)}...
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  <Link to="/prescriptions">
                    <Button className="btn btn-outline w-full mt-3">
                      View All Prescriptions
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-gray-500 text-center">No prescriptions yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;