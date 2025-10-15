import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle, Calendar, CreditCard, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const PaymentSuccess = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      checkPaymentStatus();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const checkPaymentStatus = async () => {
    try {
      const response = await axios.get(`/payments/status/${sessionId}`);
      setPaymentStatus(response.data);
      
      if (response.data.payment_status === 'paid') {
        toast.success('Payment successful!');
      } else {
        // Poll for status updates
        setTimeout(checkPaymentStatus, 2000);
      }
    } catch (error) {
      toast.error('Failed to check payment status');
    } finally {
      setLoading(false);
    }
  };

  const getDashboardRoute = () => {
    switch (user?.role) {
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
        <p className="mt-4 text-gray-600">Processing your payment...</p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="dashboard">
        <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Card className="card text-center">
            <CardContent>
              <div className="py-8">
                <div className="text-red-500 mb-4">
                  <CreditCard className="w-16 h-16 mx-auto" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Payment Session</h2>
                <p className="text-gray-600 mb-6">
                  No payment session found. Please try booking an appointment again.
                </p>
                <Link to={getDashboardRoute()}>
                  <Button className="btn btn-primary">
                    Return to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="dashboard-header text-center">
          <div className="text-green-500 mb-4">
            <CheckCircle className="w-20 h-20 mx-auto" />
          </div>
          <h1 className="dashboard-title text-green-600">Payment Successful!</h1>
          <p className="dashboard-subtitle">Your appointment has been confirmed</p>
        </div>

        <Card className="card">
          <CardHeader>
            <h3 className="card-title text-center">Payment Confirmation</h3>
          </CardHeader>
          
          <CardContent>
            {paymentStatus && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-green-900">Payment Status:</span>
                    <span className="badge badge-success">{paymentStatus.payment_status}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-green-900">Amount Paid:</span>
                    <span className="text-green-800 font-bold">
                      ${(paymentStatus.amount_total / 100).toFixed(2)} {paymentStatus.currency.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-green-900">Session ID:</span>
                    <span className="text-green-600 text-sm font-mono">{sessionId}</span>
                  </div>
                </div>

                {paymentStatus.metadata && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-3">Appointment Details</h4>
                    {paymentStatus.metadata.appointment_id && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-800">Appointment ID:</span>
                        <span className="text-blue-600 font-mono text-sm">
                          {paymentStatus.metadata.appointment_id}
                        </span>
                      </div>
                    )}
                    {paymentStatus.metadata.doctor_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-blue-800">Doctor ID:</span>
                        <span className="text-blue-600 font-mono text-sm">
                          {paymentStatus.metadata.doctor_id}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">What's Next?</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      You will receive an email confirmation shortly
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Your appointment is now confirmed and paid
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      You can view your appointment in your dashboard
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      You'll receive a reminder before your appointment
                    </li>
                  </ul>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 mt-6">
              <Link to={getDashboardRoute()}>
                <Button className="btn btn-primary w-full">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
              </Link>
              
              {user?.role === 'patient' && (
                <Link to="/book-appointment">
                  <Button className="btn btn-outline w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Another Appointment
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Need help? Contact our support team at{' '}
            <a href="mailto:support@medconnect.com" className="text-blue-600 hover:underline">
              support@medconnect.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;