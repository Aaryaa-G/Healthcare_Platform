import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { XCircle, Calendar, ArrowLeft, CreditCard } from 'lucide-react';

const PaymentCancelled = () => {
  const { user } = useAuth();

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

  return (
    <div className="dashboard">
      <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="dashboard-header text-center">
          <div className="text-orange-500 mb-4">
            <XCircle className="w-20 h-20 mx-auto" />
          </div>
          <h1 className="dashboard-title text-orange-600">Payment Cancelled</h1>
          <p className="dashboard-subtitle">Your payment was not completed</p>
        </div>

        <Card className="card">
          <CardHeader>
            <h3 className="card-title text-center">What Happened?</h3>
          </CardHeader>
          
          <CardContent>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <p className="text-orange-800 text-center">
                Your payment was cancelled before completion. Your appointment booking is still pending payment.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">Your Options:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span>Return to your dashboard to view pending appointments</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span>Complete payment later from your appointment list</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span>Book a new appointment if needed</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span>Contact support if you experienced any issues</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">
                  <CreditCard className="w-4 h-4 inline mr-2" />
                  Payment Information
                </h4>
                <p className="text-blue-800 text-sm">
                  No charges were made to your payment method. You can retry payment at any time before your appointment.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <Link to={getDashboardRoute()}>
                <Button className="btn btn-primary w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Dashboard
                </Button>
              </Link>
              
              {user?.role === 'patient' && (
                <Link to="/book-appointment">
                  <Button className="btn btn-outline w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    Book New Appointment
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Having trouble with payments? Contact our support team at{' '}
            <a href="mailto:support@medconnect.com" className="text-blue-600 hover:underline">
              support@medconnect.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelled;