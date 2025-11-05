import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Import components
import Login from './components/Login';
import Register from './components/Register';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import AdminDashboard from './components/AdminDashboard';
import AppointmentBooking from './components/AppointmentBooking';
import MedicalRecords from './components/MedicalRecords';
import Prescriptions from './components/Prescriptions';
import Chat from './components/Chat';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentCancelled from './components/PaymentCancelled';
import UserManagement from './components/UserManagement';
import AppointmentsList from './components/AppointmentsList';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Profile from './components/Profile';
import PaymentStatusDebug from './components/PaymentStatusDebug';
import { Toaster } from './components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Set up axios defaults
axios.defaults.baseURL = API;

// Auth context
const AuthContext = React.createContext();

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token by fetching user info
      axios.get('/auth/me')
        .then(response => {
          setUser(response.data);
        })
        .catch(() => {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      // OAuth2PasswordRequestForm expects form-encoded fields: username and password
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);
      const response = await axios.post('/auth/login', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      // Normalize error messages (FastAPI returns validation errors as an array under `detail`)
      let errorMsg = 'Login failed';
      if (error?.response?.data) {
        const data = error.response.data;
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            errorMsg = data.detail.map(d => d.msg || JSON.stringify(d)).join('; ');
          } else if (typeof data.detail === 'string') {
            errorMsg = data.detail;
          } else {
            errorMsg = JSON.stringify(data.detail);
          }
        } else if (data.error) {
          errorMsg = data.error;
        }
      } else if (error.message) {
        errorMsg = error.message;
      }

      return {
        success: false,
        error: errorMsg,
      };
    }
  };

  const register = async (userData) => {
    try {
      // backend expects fields matching UserCreate (email, password, optional first_name/last_name, role, phone)
      // frontend sends `full_name`; split it into first_name/last_name to satisfy the backend model
      const payload = { ...userData };
      if (payload.full_name && !payload.first_name && !payload.last_name) {
        const parts = payload.full_name.trim().split(/\s+/);
        payload.first_name = parts.shift() || '';
        payload.last_name = parts.join(' ') || '';
        delete payload.full_name;
      }

      const response = await axios.post('/auth/register', payload);
      // Registration flow returns a message (and email) and does not auto-login. Show that to the caller.
      return { success: true, message: response.data.message || 'Registration initiated. Check your email.' };
    } catch (error) {
      let errorMsg = 'Registration failed';
      if (error?.response?.data) {
        const data = error.response.data;
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            errorMsg = data.detail.map(d => d.msg || JSON.stringify(d)).join('; ');
          } else if (typeof data.detail === 'string') {
            errorMsg = data.detail;
          } else {
            errorMsg = JSON.stringify(data.detail);
          }
        } else if (data.error) {
          errorMsg = data.error;
        }
      } else if (error.message) {
        errorMsg = error.message;
      }

      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Unauthorized component
const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Unauthorized</h1>
      <p className="text-gray-600 mb-8">You don't have permission to access this page.</p>
      <button
        onClick={() => window.history.back()}
        className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
      >
        Go Back
      </button>
    </div>
  </div>
);

// Main App component
function App() {
  const { user } = useAuth();

  const getDashboardRoute = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'patient':
        return '/patient-dashboard';
      case 'doctor':
        return '/doctor-dashboard';
      case 'admin':
        return '/admin-dashboard';
      default:
        return '/login';
    }
  };

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            user ? <Navigate to={getDashboardRoute()} replace /> : <Login />
          } />
          <Route path="/register" element={
            user ? <Navigate to={getDashboardRoute()} replace /> : <Register />
          } />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* Protected routes */}
          <Route path="/patient-dashboard" element={
            <ProtectedRoute allowedRoles={['patient']}>
              <PatientDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/doctor-dashboard" element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/admin-dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/book-appointment" element={
            <ProtectedRoute allowedRoles={['patient']}>
              <AppointmentBooking />
            </ProtectedRoute>
          } />
          
          <Route path="/medical-records" element={
            <ProtectedRoute>
              <MedicalRecords />
            </ProtectedRoute>
          } />
          
          <Route path="/prescriptions" element={
            <ProtectedRoute>
              <Prescriptions />
            </ProtectedRoute>
          } />
          
          <Route path="/chat/:userId" element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } />
          
          <Route path="/payment-success" element={
            <ProtectedRoute>
              <PaymentSuccess />
            </ProtectedRoute>
          } />
          
          <Route path="/payment-cancelled" element={
            <ProtectedRoute>
              <PaymentCancelled />
            </ProtectedRoute>
          } />

          <Route path="/user-management" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserManagement />
            </ProtectedRoute>
          } />

          <Route path="/appointments" element={
            <ProtectedRoute>
              <AppointmentsList />
            </ProtectedRoute>
          } />

          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Reports />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Settings />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/payment-debug" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PaymentStatusDebug />
            </ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to={getDashboardRoute()} replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

// Wrap App with AuthProvider
export default function AppWrapper() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}