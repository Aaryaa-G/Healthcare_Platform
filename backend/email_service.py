from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
import asyncio
from datetime import datetime
import os
import random
import string
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        api_key = os.environ.get('SENDGRID_API_KEY')
        # If no API key is configured, don't attempt to call SendGrid in dev/test.
        # This lets local development proceed without failing registration.
        self.sg = SendGridAPIClient(api_key=api_key) if api_key else None
        self.from_email = Email(os.environ.get('SENDGRID_FROM_EMAIL', 'noreply@medconnect.com'))
        self._otp_store = {}  # In production, use Redis or another persistent store

    def generate_otp(self, email: str) -> str:
        """Generate a 6-digit OTP and store it"""
        otp = ''.join(random.choices(string.digits, k=6))
        self._otp_store[email] = {
            'otp': otp,
            'created_at': datetime.now(),
            'attempts': 0
        }
        return otp

    def verify_otp(self, email: str, otp: str) -> bool:
        """Verify the OTP for the given email"""
        stored_data = self._otp_store.get(email)
        if not stored_data:
            return False
        
        # Check if OTP is expired (10 minutes)
        if (datetime.now() - stored_data['created_at']).total_seconds() > 600:
            del self._otp_store[email]
            return False
        
        # Check attempts
        if stored_data['attempts'] >= 3:
            del self._otp_store[email]
            return False
        
        stored_data['attempts'] += 1
        
        if stored_data['otp'] == otp:
            del self._otp_store[email]
            return True
        return False

    async def send_verification_email(self, email: str, otp: str) -> bool:
        """Send verification email with OTP"""
        subject = "Verify your MedConnect account"
        template_data = {
            "otp": otp,
            "valid_minutes": 10
        }
        
        message = Mail(
            from_email=self.from_email,
            to_emails=To(email),
            subject=subject,
            html_content=f"""
            <h2>Welcome to MedConnect!</h2>
            <p>Your verification code is: <strong>{otp}</strong></p>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            """
        )
        
        try:
            if not self.sg:
                # Development fallback: log the OTP and return success so registration can continue
                logger.info(f"SENDGRID_API_KEY not set - skipping email send. OTP for {email}: {otp}")
                return True
            # SendGrid client is blocking; run in a thread to avoid blocking the event loop
            response = await asyncio.to_thread(self.sg.send, message)
            return response.status_code == 202
        except Exception as e:
            logger.error(f"Failed to send verification email: {str(e)}")
            return False

    async def send_appointment_notification(
        self, 
        email: str, 
        appointment_data: Dict[str, Any],
        notification_type: str = "confirmation"
    ) -> bool:
        """Send appointment-related notifications"""
        templates = {
            "confirmation": {
                "subject": "Appointment Confirmation - MedConnect",
                "template": "appointment_confirmation"
            },
            "reminder": {
                "subject": "Appointment Reminder - MedConnect",
                "template": "appointment_reminder"
            },
            "cancellation": {
                "subject": "Appointment Cancellation - MedConnect",
                "template": "appointment_cancellation"
            },
            "rescheduled": {
                "subject": "Appointment Rescheduled - MedConnect",
                "template": "appointment_rescheduled"
            }
        }
        
        template_info = templates.get(notification_type)
        if not template_info:
            raise ValueError(f"Invalid notification type: {notification_type}")

        message = Mail(
            from_email=self.from_email,
            to_emails=To(email),
            subject=template_info["subject"],
            html_content=self._get_appointment_email_content(
                notification_type,
                appointment_data
            )
        )
        
        try:
            if not self.sg:
                logger.info(f"SENDGRID_API_KEY not set - skipping appointment email to {email}")
                return True
            response = await asyncio.to_thread(self.sg.send, message)
            return response.status_code == 202
        except Exception as e:
            logger.error(f"Failed to send appointment notification: {str(e)}")
            return False

    def _get_appointment_email_content(
        self,
        notification_type: str,
        appointment_data: Dict[str, Any]
    ) -> str:
        """Generate HTML content for appointment emails"""
        date_str = appointment_data['appointment_date'].strftime("%B %d, %Y")
        time_str = appointment_data['appointment_date'].strftime("%I:%M %p")
        
        base_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">MedConnect Healthcare</h2>
            <p>Dear {appointment_data.get('patient_name', 'Patient')},</p>
        """
        
        if notification_type == "confirmation":
            content = f"""
                <p>Your appointment has been confirmed:</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px;">
                    <p><strong>Doctor:</strong> Dr. {appointment_data.get('doctor_name')}</p>
                    <p><strong>Date:</strong> {date_str}</p>
                    <p><strong>Time:</strong> {time_str}</p>
                    <p><strong>Duration:</strong> {appointment_data.get('duration_minutes', 30)} minutes</p>
                </div>
            """
        elif notification_type == "reminder":
            content = f"""
                <p>This is a reminder for your upcoming appointment:</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px;">
                    <p><strong>Doctor:</strong> Dr. {appointment_data.get('doctor_name')}</p>
                    <p><strong>Date:</strong> {date_str}</p>
                    <p><strong>Time:</strong> {time_str}</p>
                </div>
                <p>Please arrive 10 minutes before your scheduled time.</p>
            """
        elif notification_type == "cancellation":
            content = f"""
                <p>Your appointment has been cancelled:</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px;">
                    <p><strong>Doctor:</strong> Dr. {appointment_data.get('doctor_name')}</p>
                    <p><strong>Date:</strong> {date_str}</p>
                    <p><strong>Time:</strong> {time_str}</p>
                </div>
                <p>If you need to reschedule, please visit our portal or contact us.</p>
            """
        else:  # rescheduled
            new_date = appointment_data.get('new_appointment_date', appointment_data['appointment_date'])
            new_date_str = new_date.strftime("%B %d, %Y")
            new_time_str = new_date.strftime("%I:%M %p")
            content = f"""
                <p>Your appointment has been rescheduled:</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px;">
                    <p><strong>Doctor:</strong> Dr. {appointment_data.get('doctor_name')}</p>
                    <p><strong>New Date:</strong> {new_date_str}</p>
                    <p><strong>New Time:</strong> {new_time_str}</p>
                </div>
            """
        
        footer = """
            <p>For any questions or concerns, please contact us:</p>
            <p>Phone: (555) 123-4567<br>
            Email: support@medconnect.com</p>
        </div>
        """
        
        return base_content + content + footer