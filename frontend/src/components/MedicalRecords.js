import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { FileText, Plus, Download, Search, ArrowLeft, User, Calendar } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const MedicalRecords = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient');
  
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    patient_id: patientId || '',
    diagnosis: '',
    treatment: '',
    notes: '',
    file_urls: []
  });

  useEffect(() => {
    fetchRecords();
    if (user.role === 'doctor' || user.role === 'admin') {
      fetchPatients();
    }
  }, [patientId]);

  const fetchRecords = async () => {
    try {
      const params = patientId ? { patient_id: patientId } : {};
      const response = await axios.get('/medical-records', { params });
      setRecords(response.data);
    } catch (error) {
      toast.error('Failed to load medical records');
    } finally {
      setLoading(false);
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

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/medical-records', newRecord);
      toast.success('Medical record created successfully');
      setIsCreateDialogOpen(false);
      setNewRecord({
        patient_id: patientId || '',
        diagnosis: '',
        treatment: '',
        notes: '',
        file_urls: []
      });
      fetchRecords();
    } catch (error) {
      toast.error('Failed to create medical record');
    }
  };

  const filteredRecords = records.filter(record =>
    record.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.treatment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? patient.full_name : `Patient ID: ${patientId}`;
  };

  const exportRecord = async (record, format = 'pdf') => {
    try {
      // Mock export functionality
      const recordData = {
        id: record.id,
        patient: getPatientName(record.patient_id),
        diagnosis: record.diagnosis,
        treatment: record.treatment,
        notes: record.notes,
        created_at: record.created_at
      };

      const dataStr = JSON.stringify(recordData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `medical-record-${record.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Medical record exported successfully`);
    } catch (error) {
      toast.error('Failed to export record');
    }
  };

  const downloadFile = (url, fileName) => {
    try {
      // Mock download functionality
      const link = document.createElement('a');
      link.href = url || '#';
      link.download = fileName || 'medical-file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`File ${fileName} downloaded successfully`);
    } catch (error) {
      toast.error('Failed to download file');
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
          <Link to={getDashboardRoute()} className="navbar-brand">
            <ArrowLeft className="w-5 h-5 inline mr-2" />
            Back to Dashboard
          </Link>
          <div className="navbar-nav">
            <span className="nav-link">Medical Records</span>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Medical Records</h1>
          <p className="dashboard-subtitle">
            {user.role === 'patient' 
              ? 'Your medical history and records' 
              : 'Patient medical records and documentation'
            }
          </p>
        </div>

        {/* Search and Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
          </div>
          
          {user.role === 'doctor' && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  New Record
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Medical Record</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateRecord}>
                  <div className="grid gap-4">
                    <div className="form-group">
                      <Label htmlFor="patient_select">Patient</Label>
                      <select
                        id="patient_select"
                        className="form-select"
                        value={newRecord.patient_id}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, patient_id: e.target.value }))}
                        required
                      >
                        <option value="">Select a patient</option>
                        {patients.map(patient => (
                          <option key={patient.id} value={patient.id}>
                            {patient.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <Label htmlFor="diagnosis">Diagnosis</Label>
                      <Input
                        id="diagnosis"
                        value={newRecord.diagnosis}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, diagnosis: e.target.value }))}
                        placeholder="Enter diagnosis"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <Label htmlFor="treatment">Treatment</Label>
                      <Input
                        id="treatment"
                        value={newRecord.treatment}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, treatment: e.target.value }))}
                        placeholder="Enter treatment plan"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={newRecord.notes}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional notes and observations"
                        rows="4"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-6">
                    <Button type="button" onClick={() => setIsCreateDialogOpen(false)} className="btn btn-outline">
                      Cancel
                    </Button>
                    <Button type="submit" className="btn btn-primary">
                      Create Record
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Records List */}
        {filteredRecords.length > 0 ? (
          <div className="grid gap-4">
            {filteredRecords.map((record) => (
              <Card key={record.id} className="card">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="card-title flex items-center">
                        <FileText className="w-5 h-5 mr-2" />
                        {record.diagnosis}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {(user.role === 'doctor' || user.role === 'admin') && (
                          <span className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {getPatientName(record.patient_id)}
                          </span>
                        )}
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(record.created_at)}
                        </span>
                      </div>
                    </div>
                    <Button
                      className="btn btn-outline btn-sm"
                      onClick={() => exportRecord(record)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-sm mb-2 text-blue-900">Treatment</h4>
                      <p className="text-gray-700 text-sm mb-4">{record.treatment}</p>
                      
                      {record.notes && (
                        <>
                          <h4 className="font-semibold text-sm mb-2 text-blue-900">Notes</h4>
                          <p className="text-gray-700 text-sm">{record.notes}</p>
                        </>
                      )}
                    </div>
                    
                    <div>
                      {record.file_urls && record.file_urls.length > 0 && (
                        <>
                          <h4 className="font-semibold text-sm mb-2 text-blue-900">Attachments</h4>
                          <div className="space-y-2">
                            {record.file_urls.map((url, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-50 rounded p-2">
                                <span className="text-sm text-gray-600">
                                  File {index + 1}
                                </span>
                                <Button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => downloadFile(url, `attachment-${index + 1}`)}
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  Download
                                </Button>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-xs text-gray-500">
                          <p>Record ID: {record.id}</p>
                          <p>Created: {formatDate(record.created_at)}</p>
                          {record.appointment_id && (
                            <p>Appointment: {record.appointment_id}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="card">
            <CardContent>
              <div className="text-center py-8">
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Medical Records Found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm 
                    ? 'No records match your search criteria.'
                    : user.role === 'patient'
                      ? 'You don\'t have any medical records yet.'
                      : 'No medical records have been created yet.'
                  }
                </p>
                {user.role === 'doctor' && !searchTerm && (
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)} 
                    className="btn btn-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Record
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MedicalRecords;