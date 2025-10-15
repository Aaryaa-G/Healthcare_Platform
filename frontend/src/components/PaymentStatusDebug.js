import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const PaymentStatusDebug = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([
    {
      id: 'test-001',
      patient_id: 'patient-123',
      doctor_id: 'doctor-456',
      appointment_date: new Date().toISOString(),
      status: 'scheduled',
      payment_status: 'pending',
      notes: 'Test appointment for payment status debugging'
    },
    {
      id: 'test-002',
      patient_id: 'patient-124',
      doctor_id: 'doctor-457',
      appointment_date: new Date().toISOString(),
      status: 'completed',
      payment_status: 'paid',
      notes: 'Another test appointment'
    }
  ]);

  const updatePaymentStatus = async (appointmentId, newStatus) => {
    console.log(`Attempting to update appointment ${appointmentId} to status: ${newStatus}`);

    // Update local state immediately for better UX
    const updatedAppointments = appointments.map(apt =>
      apt.id === appointmentId
        ? { ...apt, payment_status: newStatus }
        : apt
    );
    setAppointments(updatedAppointments);

    toast.success(`Payment status updated to: ${newStatus}`);

    // Try to update backend (will likely fail, but that's okay for debugging)
    try {
      const response = await axios.patch(`/appointments/${appointmentId}/payment-status`, {}, {
        params: { payment_status: newStatus }
      });
      console.log('Backend update successful:', response);
    } catch (error) {
      console.log('Backend update failed (expected):', error.message);
      // Don't show error toast since we're in debug mode
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="text-center p-8">
            <p className="text-red-600">This debug component is only available for admin users.</p>
            <p className="text-sm text-gray-600 mt-2">Current user role: {user?.role || 'none'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold">Payment Status Debug Tool</h2>
          <p className="text-gray-600">Test the payment status update functionality</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold">Appointment ID: {appointment.id}</h3>
                    <p className="text-sm text-gray-600">Patient: {appointment.patient_id}</p>
                    <p className="text-sm text-gray-600">Doctor: {appointment.doctor_id}</p>
                    <p className="text-sm text-gray-600">Status: {appointment.status}</p>
                  </div>

                  <div className="text-right">
                    <div className={`px-3 py-1 rounded border text-sm font-medium ${getPaymentStatusColor(appointment.payment_status)}`}>
                      Payment: {appointment.payment_status}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => updatePaymentStatus(appointment.id, 'pending')}
                    className="btn btn-outline btn-sm"
                    disabled={appointment.payment_status === 'pending'}
                  >
                    Set Pending
                  </Button>

                  <Button
                    onClick={() => updatePaymentStatus(appointment.id, 'paid')}
                    className="btn btn-success btn-sm"
                    disabled={appointment.payment_status === 'paid'}
                  >
                    Set Paid
                  </Button>

                  <Button
                    onClick={() => updatePaymentStatus(appointment.id, 'overdue')}
                    className="btn btn-danger btn-sm"
                    disabled={appointment.payment_status === 'overdue'}
                  >
                    Set Overdue
                  </Button>
                </div>

                <div className="mt-3 p-2 bg-white rounded border text-xs">
                  <strong>Debug Info:</strong>
                  <br />Current Status: {appointment.payment_status}
                  <br />User Role: {user.role}
                  <br />Appointment ID: {appointment.id}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Click the buttons above to test payment status updates</li>
              <li>• The status should change immediately in the UI</li>
              <li>• Check browser console for backend API call details</li>
              <li>• If buttons don't work, check user role and permissions</li>
              <li>• This component uses mock data for testing purposes</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentStatusDebug;