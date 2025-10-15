import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardHeader, CardContent } from './ui/card';
import { Stethoscope, Mail, Lock, User, Phone, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'patient',
    phone: '',
    specialization: '',
    experience: ''
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await register(formData);
    
    if (result.success) {
      toast.success(`Welcome to MedConnect, ${result.user.full_name}!`);
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <Card className="auth-card" style={{ maxWidth: '500px' }}>
        <CardHeader className="auth-header">
          <div className="flex items-center justify-center mb-4">
            <Stethoscope className="medical-icon-large mr-3" />
            <h1 className="auth-title">MedConnect</h1>
          </div>
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Join our medical portal</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <Label htmlFor="full_name" className="form-label">
                <User className="w-4 h-4 inline mr-2" />
                Full Name
              </Label>
              <Input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                className="form-input"
                placeholder="Dr. John Smith"
                required
              />
            </div>
            
            <div className="form-group">
              <Label htmlFor="email" className="form-label">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="form-input"
                placeholder="john.smith@medconnect.com"
                required
              />
            </div>
            
            <div className="form-group">
              <Label htmlFor="password" className="form-label">
                <Lock className="w-4 h-4 inline mr-2" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className="form-input"
                placeholder="Create a strong password"
                required
              />
            </div>
            
            <div className="form-group">
              <Label htmlFor="role" className="form-label">
                Role
              </Label>
              <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
                <SelectTrigger className="form-select">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="form-group">
              <Label htmlFor="phone" className="form-label">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="form-input"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            {formData.role === 'doctor' && (
              <>
                <div className="form-group">
                  <Label htmlFor="specialization" className="form-label">
                    <GraduationCap className="w-4 h-4 inline mr-2" />
                    Specialization
                  </Label>
                  <Input
                    id="specialization"
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => handleChange('specialization', e.target.value)}
                    className="form-input"
                    placeholder="Cardiology, Pediatrics, etc."
                  />
                </div>
                
                <div className="form-group">
                  <Label htmlFor="experience" className="form-label">
                    Experience
                  </Label>
                  <Input
                    id="experience"
                    type="text"
                    value={formData.experience}
                    onChange={(e) => handleChange('experience', e.target.value)}
                    className="form-input"
                    placeholder="10 years, Board Certified"
                  />
                </div>
              </>
            )}
            
            <Button 
              type="submit" 
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? (
                <div className="spinner"></div>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
          
          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Sign in here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;