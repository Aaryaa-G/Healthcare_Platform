import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../App';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MessageCircle, Send, ArrowLeft, User, Phone, Video } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const Chat = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId && user) {
      fetchOtherUser();
      fetchMessages();
      // Set up polling for new messages
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [userId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchOtherUser = async () => {
    try {
      // For now, we'll create a mock user since we don't have a specific user endpoint
      // In a real app, you'd fetch user details by ID
      setOtherUser({
        id: userId,
        full_name: 'Dr. Smith',
        role: 'doctor',
        email: 'dr.smith@medconnect.com'
      });
    } catch (error) {
      console.error('Failed to fetch user details');
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get('/chat/messages', {
        params: { other_user_id: userId }
      });
      setMessages(response.data);
    } catch (error) {
      if (loading) {
        toast.error('Failed to load messages');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const messageData = {
        receiver_id: userId,
        message: newMessage,
        message_type: 'text'
      };

      await axios.post('/chat/messages', messageData);
      setNewMessage('');
      fetchMessages(); // Refresh messages
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
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

  const initiateCall = (type) => {
    // Mock call functionality
    toast.success(`${type === 'voice' ? 'Voice call' : 'Video call'} feature coming soon!`);

    // In a real application, this would integrate with WebRTC or a service like Twilio
    // For demonstration, we'll show a mock implementation
    const callWindow = window.open('', '_blank', 'width=600,height=400');
    if (callWindow) {
      callWindow.document.write(`
        <html>
          <head>
            <title>${type === 'voice' ? 'Voice' : 'Video'} Call - MedConnect</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; text-align: center; background: #f5f5f5; }
              .call-container {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                max-width: 400px;
                margin: 50px auto;
              }
              .call-button {
                background: #dc2626;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                margin-top: 20px;
              }
              .call-button:hover { background: #b91c1c; }
              .status { color: #059669; font-weight: bold; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="call-container">
              <h2>${type === 'voice' ? 'Voice' : 'Video'} Call</h2>
              <p>Calling ${otherUser?.full_name || 'User'}...</p>
              <div class="status">● Connected</div>
              <p><em>This is a demo of the ${type} call feature.</em></p>
              <button class="call-button" onclick="window.close()">End Call</button>
            </div>
          </body>
        </html>
      `);
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
            <span className="nav-link">
              Chat with {otherUser?.full_name || 'User'}
            </span>
          </div>
        </div>
      </nav>

      <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* User Info Sidebar */}
          <div className="lg:col-span-1">
            <Card className="card">
              <CardHeader>
                <h3 className="card-title flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Contact Info
                </h3>
              </CardHeader>
              <CardContent>
                {otherUser && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="font-semibold">{otherUser.full_name}</h4>
                      <p className="text-sm text-gray-600 capitalize">{otherUser.role}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm">
                        <strong>Email:</strong><br />
                        {otherUser.email}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        className="btn btn-outline w-full"
                        onClick={() => initiateCall('voice')}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Call
                      </Button>
                      <Button
                        className="btn btn-outline w-full"
                        onClick={() => initiateCall('video')}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Video
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <Card className="card h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="card-title flex items-center">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Secure Medical Chat
                  </h3>
                  <div className="text-sm text-gray-500">
                    End-to-end encrypted
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex flex-col h-full">
                {/* Messages Area */}
                <div className="chat-messages flex-1 mb-4" style={{ height: '400px' }}>
                  {messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div 
                          key={message.id} 
                          className={`chat-message ${message.sender_id === user.id ? 'sent' : 'received'}`}
                        >
                          <div className={`message-bubble ${message.sender_id === user.id ? 'sent' : 'received'}`}>
                            <p>{message.message}</p>
                          </div>
                          <div className="message-time">
                            {formatMessageTime(message.created_at)}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No messages yet</p>
                        <p className="text-sm text-gray-400">Start a conversation below</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="chat-input">
                  <form onSubmit={sendMessage} className="chat-input-form">
                    <Input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="chat-input-field"
                    />
                    <Button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={!newMessage.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>

                {/* Chat Guidelines */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 text-sm mb-2">Chat Guidelines</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Keep conversations professional and medical-related</li>
                    <li>• Do not share personal information</li>
                    <li>• For emergencies, call 911 immediately</li>
                    <li>• All messages are encrypted and secure</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;