import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Calendar, Clock, User, CreditCard, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const AppointmentBooking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    duration_minutes: 30,
    notes: ''
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await axios.get('/users/doctors');
      setDoctors(response.data);
    } catch (error) {
      toast.error('Failed to load doctors');
    }
  };

  const handleChange = (name, value) => {
    try {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } catch (error) {
      console.log('Error in handleChange:', error);
      // Fallback update
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }, 0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Combine date and time
      const appointmentDateTime = new Date(`${formData.appointment_date}T${formData.appointment_time}`);
      
      const appointmentData = {
        doctor_id: formData.doctor_id,
        appointment_date: appointmentDateTime.toISOString(),
        duration_minutes: parseInt(formData.duration_minutes),
        notes: formData.notes
      };

      const response = await axios.post('/appointments', appointmentData);
      
      toast.success('Appointment booked successfully! Please pay at the clinic during your visit.');
      navigate('/patient-dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };


  const getAvailableTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute of [0, 30]) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  return (
    <div className="dashboard">
      {/* Navigation */}
      <nav className="navbar">
        <div className="navbar-content">
          <Link to="/patient-dashboard" className="navbar-brand">
            <ArrowLeft className="w-5 h-5 inline mr-2" />
            Back to Dashboard
          </Link>
          <div className="navbar-nav">
            <span className="nav-link">Book Appointment</span>
          </div>
        </div>
      </nav>

      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="dashboard-header">
          <h1 className="dashboard-title">Book Appointment</h1>
          <p className="dashboard-subtitle">Schedule a consultation with our doctors</p>
        </div>

        <Card className="card">
          <CardHeader>
            <h3 className="card-title">
              <Calendar className="w-5 h-5 inline mr-2" />
              Appointment Details
            </h3>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <Label htmlFor="doctor_id" className="form-label">
                    <User className="w-4 h-4 inline mr-2" />
                    Select Doctor
                  </Label>
                  <Select 
                    value={formData.doctor_id} 
                    onValueChange={(value) => handleChange('doctor_id', value)}
                  >
                    <SelectTrigger className="form-select">
                      <SelectValue placeholder="Choose a doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          <div>
                            <div className="font-semibold">Dr. {doctor.full_name}</div>
                            <div className="text-sm text-gray-600">{doctor.specialization}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="form-group">
                  <Label htmlFor="duration_minutes" className="form-label">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Duration
                  </Label>
                  <Select 
                    value={formData.duration_minutes.toString()} 
                    onValueChange={(value) => handleChange('duration_minutes', parseInt(value))}
                  >
                    <SelectTrigger className="form-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="form-group">
                  <Label htmlFor="appointment_date" className="form-label">
                    Appointment Date
                  </Label>
                  <Input
                    id="appointment_date"
                    type="date"
                    value={formData.appointment_date}
                    onChange={(e) => handleChange('appointment_date', e.target.value)}
                    className="form-input"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="form-group">
                  <Label htmlFor="appointment_time" className="form-label">
                    Preferred Time
                  </Label>
                  <Select 
                    value={formData.appointment_time} 
                    onValueChange={(value) => {
                      try {
                        handleChange('appointment_time', value);
                      } catch (error) {
                        console.log('Time slot selection error:', error);
                      }
                    }}
                  >
                    <SelectTrigger className="form-select">
                      <SelectValue placeholder="Select time slot" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-auto">
                      {getAvailableTimeSlots().map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="form-group mt-4">
                <Label htmlFor="notes" className="form-label">
                  Additional Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="form-textarea"
                  placeholder="Describe your symptoms or reason for visit..."
                  rows="4"
                />
              </div>

              {/* Consultation Fee Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-blue-900 mb-2">
                  <CreditCard className="w-4 h-4 inline mr-2" />
                  Consultation Fee
                </h4>
                <p className="text-blue-800 text-sm">
                  Standard consultation fee: <span className="font-semibold">$50.00</span>
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  Payment can be made at the clinic during your appointment.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <Button 
                  type="submit" 
                  className="btn btn-primary flex-1"
                  disabled={loading || !formData.doctor_id || !formData.appointment_date || !formData.appointment_time}
                >
                  {loading ? (
                    <div className="spinner"></div>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Appointment
                    </>
                  )}
                </Button>
                
                <Button 
                  type="button" 
                  onClick={() => navigate('/patient-dashboard')}
                  className="btn btn-outline"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Doctor Information */}
        {formData.doctor_id && (
          <Card className="card mt-4">
            <CardHeader>
              <h3 className="card-title">Doctor Information</h3>
            </CardHeader>
            <CardContent>
              {(() => {
                const selectedDoctor = doctors.find(d => d.id === formData.doctor_id);
                if (!selectedDoctor) return null;
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Dr. {selectedDoctor.full_name}</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Specialization:</strong> {selectedDoctor.specialization || 'General Practice'}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Experience:</strong> {selectedDoctor.experience || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Contact Information</h4>
                      <p className="text-sm text-gray-600 mb-1">{selectedDoctor.email}</p>
                      {selectedDoctor.phone && (
                        <p className="text-sm text-gray-600">{selectedDoctor.phone}</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AppointmentBooking;