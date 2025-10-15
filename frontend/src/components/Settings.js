import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Settings as SettingsIcon,
  ArrowLeft,
  User,
  Bell,
  Shield,
  Database,
  Mail,
  Smartphone,
  Eye,
  Lock,
  Globe,
  Save,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    // Profile Settings
    email_notifications: true,
    sms_notifications: false,
    appointment_reminders: true,
    marketing_emails: false,

    // Security Settings
    two_factor_enabled: false,
    login_notifications: true,
    session_timeout: 30,
    password_expiry: 90,

    // System Settings
    auto_backup: true,
    backup_frequency: 'daily',
    data_retention_days: 365,
    maintenance_mode: false,

    // Appearance Settings
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    date_format: 'MM/DD/YYYY'
  });

  const [systemInfo, setSystemInfo] = useState({
    version: '2.1.0',
    last_backup: '2024-01-15 10:30:00',
    database_size: '2.4 GB',
    uptime: '15 days, 6 hours',
    active_sessions: 23
  });

  useEffect(() => {
    fetchSettings();
    fetchSystemInfo();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/admin/settings');
      setSettings(prevSettings => ({ ...prevSettings, ...response.data }));
    } catch (error) {
      console.error('Failed to fetch settings');
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const response = await axios.get('/admin/system-info');
      setSystemInfo(prevInfo => ({ ...prevInfo, ...response.data }));
    } catch (error) {
      console.error('Failed to fetch system info');
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async (category) => {
    setLoading(true);
    try {
      await axios.put('/admin/settings', {
        category,
        settings: settings
      });
      toast.success(`${category} settings saved successfully`);
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const performBackup = async () => {
    setLoading(true);
    try {
      await axios.post('/admin/backup');
      toast.success('Backup completed successfully');
      fetchSystemInfo(); // Refresh system info
    } catch (error) {
      toast.error('Backup failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleMaintenanceMode = async () => {
    try {
      await axios.post('/admin/maintenance-mode', {
        enabled: !settings.maintenance_mode
      });
      handleSettingChange('maintenance_mode', !settings.maintenance_mode);
      toast.success(
        `Maintenance mode ${!settings.maintenance_mode ? 'enabled' : 'disabled'}`
      );
    } catch (error) {
      toast.error('Failed to toggle maintenance mode');
    }
  };

  const clearCache = async () => {
    setLoading(true);
    try {
      await axios.post('/admin/clear-cache');
      toast.success('System cache cleared successfully');
    } catch (error) {
      toast.error('Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      {/* Navigation */}
      <nav className="navbar">
        <div className="navbar-content">
          <Link to="/admin-dashboard" className="navbar-brand">
            <ArrowLeft className="w-5 h-5 inline mr-2" />
            Back to Dashboard
          </Link>
          <div className="navbar-nav">
            <span className="nav-link">System Settings</span>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">System Settings</h1>
          <p className="dashboard-subtitle">Configure your healthcare platform</p>
        </div>

        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="card">
              <CardHeader>
                <h3 className="card-title flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Notification Settings
                </h3>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <Label className="font-medium">Email Notifications</Label>
                      <p className="text-sm text-gray-600">
                        Receive email notifications for appointments and updates
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.email_notifications}
                    onCheckedChange={(checked) => handleSettingChange('email_notifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="w-5 h-5 text-gray-400" />
                    <div>
                      <Label className="font-medium">SMS Notifications</Label>
                      <p className="text-sm text-gray-600">
                        Receive SMS notifications for urgent updates
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.sms_notifications}
                    onCheckedChange={(checked) => handleSettingChange('sms_notifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bell className="w-5 h-5 text-gray-400" />
                    <div>
                      <Label className="font-medium">Appointment Reminders</Label>
                      <p className="text-sm text-gray-600">
                        Send reminders to patients before appointments
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.appointment_reminders}
                    onCheckedChange={(checked) => handleSettingChange('appointment_reminders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <Label className="font-medium">Marketing Emails</Label>
                      <p className="text-sm text-gray-600">
                        Receive promotional and marketing emails
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.marketing_emails}
                    onCheckedChange={(checked) => handleSettingChange('marketing_emails', checked)}
                  />
                </div>

                <Button
                  onClick={() => saveSettings('notifications')}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card className="card">
              <CardHeader>
                <h3 className="card-title flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Security Settings
                </h3>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-gray-400" />
                    <div>
                      <Label className="font-medium">Two-Factor Authentication</Label>
                      <p className="text-sm text-gray-600">
                        Add an extra layer of security to user accounts
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.two_factor_enabled}
                    onCheckedChange={(checked) => handleSettingChange('two_factor_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Eye className="w-5 h-5 text-gray-400" />
                    <div>
                      <Label className="font-medium">Login Notifications</Label>
                      <p className="text-sm text-gray-600">
                        Notify users about new login attempts
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.login_notifications}
                    onCheckedChange={(checked) => handleSettingChange('login_notifications', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Session Timeout (minutes)</Label>
                  <Select
                    value={settings.session_timeout.toString()}
                    onValueChange={(value) => handleSettingChange('session_timeout', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="480">8 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Password Expiry (days)</Label>
                  <Select
                    value={settings.password_expiry.toString()}
                    onValueChange={(value) => handleSettingChange('password_expiry', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="0">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => saveSettings('security')}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Security Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="card">
                <CardHeader>
                  <h3 className="card-title flex items-center">
                    <Database className="w-5 h-5 mr-2" />
                    Backup Settings
                  </h3>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Automatic Backups</Label>
                      <p className="text-sm text-gray-600">
                        Enable automatic system backups
                      </p>
                    </div>
                    <Switch
                      checked={settings.auto_backup}
                      onCheckedChange={(checked) => handleSettingChange('auto_backup', checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-medium">Backup Frequency</Label>
                    <Select
                      value={settings.backup_frequency}
                      onValueChange={(value) => handleSettingChange('backup_frequency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-medium">Data Retention (days)</Label>
                    <Input
                      type="number"
                      value={settings.data_retention_days}
                      onChange={(e) => handleSettingChange('data_retention_days', parseInt(e.target.value))}
                    />
                  </div>

                  <Button
                    onClick={performBackup}
                    className="btn btn-outline w-full"
                    disabled={loading}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Run Backup Now
                  </Button>
                </CardContent>
              </Card>

              <Card className="card">
                <CardHeader>
                  <h3 className="card-title">System Information</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Version:</span>
                    <span className="font-medium">{systemInfo.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Backup:</span>
                    <span className="font-medium">{systemInfo.last_backup}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Database Size:</span>
                    <span className="font-medium">{systemInfo.database_size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">System Uptime:</span>
                    <span className="font-medium">{systemInfo.uptime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Sessions:</span>
                    <span className="font-medium">{systemInfo.active_sessions}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="card mt-6">
              <CardContent className="pt-6">
                <Button
                  onClick={() => saveSettings('system')}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save System Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <Card className="card">
              <CardHeader>
                <h3 className="card-title flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Appearance Settings
                </h3>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-medium">Theme</Label>
                  <Select
                    value={settings.theme}
                    onValueChange={(value) => handleSettingChange('theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto (System)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Language</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value) => handleSettingChange('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) => handleSettingChange('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="EST">Eastern Time</SelectItem>
                      <SelectItem value="PST">Pacific Time</SelectItem>
                      <SelectItem value="GMT">Greenwich Mean Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Date Format</Label>
                  <Select
                    value={settings.date_format}
                    onValueChange={(value) => handleSettingChange('date_format', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => saveSettings('appearance')}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Appearance Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance">
            <Card className="card">
              <CardHeader>
                <h3 className="card-title flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  System Maintenance
                </h3>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <div>
                      <Label className="font-medium">Maintenance Mode</Label>
                      <p className="text-sm text-gray-600">
                        Temporarily disable access for maintenance
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.maintenance_mode}
                    onCheckedChange={toggleMaintenanceMode}
                  />
                </div>

                {settings.maintenance_mode && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                      <div className="ml-3">
                        <h4 className="text-yellow-800 font-medium">Maintenance Mode Active</h4>
                        <p className="text-yellow-700 text-sm mt-1">
                          The system is currently in maintenance mode. Users cannot access the platform.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={clearCache}
                    className="btn btn-outline"
                    disabled={loading}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Clear System Cache
                  </Button>

                  <Button
                    onClick={performBackup}
                    className="btn btn-outline"
                    disabled={loading}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Create Backup
                  </Button>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">System Health Check</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <p className="text-sm font-medium">Database</p>
                      <p className="text-xs text-green-600">Healthy</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <p className="text-sm font-medium">Server</p>
                      <p className="text-xs text-green-600">Online</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <p className="text-sm font-medium">Storage</p>
                      <p className="text-xs text-green-600">75% Free</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;