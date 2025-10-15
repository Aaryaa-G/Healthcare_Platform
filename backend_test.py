import requests
import sys
import json
from datetime import datetime, timedelta
import time

class MedConnectAPITester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.patient_token = None
        self.doctor_token = None
        self.admin_token = None
        self.patient_id = None
        self.doctor_id = None
        self.admin_id = None
        self.appointment_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text[:200]}")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration for all roles"""
        print("\n=== Testing User Registration ===")
        
        # Test patient registration
        patient_data = {
            "email": "patient@test.com",
            "password": "test123",
            "full_name": "Test Patient",
            "role": "patient",
            "phone": "123-456-7890"
        }
        success, response = self.run_test(
            "Patient Registration",
            "POST",
            "auth/register",
            200,
            data=patient_data
        )
        if success and 'access_token' in response:
            self.patient_token = response['access_token']
            self.patient_id = response['user']['id']
            print(f"Patient ID: {self.patient_id}")

        # Test doctor registration
        doctor_data = {
            "email": "doctor@test.com",
            "password": "test123",
            "full_name": "Dr. Test Doctor",
            "role": "doctor",
            "specialization": "Cardiology",
            "experience": "5 years",
            "phone": "123-456-7891"
        }
        success, response = self.run_test(
            "Doctor Registration",
            "POST",
            "auth/register",
            200,
            data=doctor_data
        )
        if success and 'access_token' in response:
            self.doctor_token = response['access_token']
            self.doctor_id = response['user']['id']
            print(f"Doctor ID: {self.doctor_id}")

        # Test admin registration
        admin_data = {
            "email": "admin@test.com",
            "password": "test123",
            "full_name": "Test Admin",
            "role": "admin",
            "phone": "123-456-7892"
        }
        success, response = self.run_test(
            "Admin Registration",
            "POST",
            "auth/register",
            200,
            data=admin_data
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.admin_id = response['user']['id']
            print(f"Admin ID: {self.admin_id}")

    def test_user_login(self):
        """Test user login"""
        print("\n=== Testing User Login ===")
        
        # Test patient login
        login_data = {"email": "patient@test.com", "password": "test123"}
        success, response = self.run_test(
            "Patient Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        if success and 'access_token' in response:
            self.patient_token = response['access_token']

        # Test doctor login
        login_data = {"email": "doctor@test.com", "password": "test123"}
        success, response = self.run_test(
            "Doctor Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        if success and 'access_token' in response:
            self.doctor_token = response['access_token']

        # Test admin login
        login_data = {"email": "admin@test.com", "password": "test123"}
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']

    def test_auth_me(self):
        """Test getting current user info"""
        print("\n=== Testing Auth Me Endpoint ===")
        
        if self.patient_token:
            self.run_test("Patient Auth Me", "GET", "auth/me", 200, token=self.patient_token)
        
        if self.doctor_token:
            self.run_test("Doctor Auth Me", "GET", "auth/me", 200, token=self.doctor_token)
        
        if self.admin_token:
            self.run_test("Admin Auth Me", "GET", "auth/me", 200, token=self.admin_token)

    def test_user_endpoints(self):
        """Test user-related endpoints"""
        print("\n=== Testing User Endpoints ===")
        
        # Test get doctors (public endpoint)
        self.run_test("Get Doctors", "GET", "users/doctors", 200)
        
        # Test get patients (doctor access)
        if self.doctor_token:
            self.run_test("Get Patients (Doctor)", "GET", "users/patients", 200, token=self.doctor_token)
        
        # Test get patients (admin access)
        if self.admin_token:
            self.run_test("Get Patients (Admin)", "GET", "users/patients", 200, token=self.admin_token)

    def test_appointment_endpoints(self):
        """Test appointment-related endpoints"""
        print("\n=== Testing Appointment Endpoints ===")
        
        if not self.patient_token or not self.doctor_id:
            print("❌ Cannot test appointments - missing patient token or doctor ID")
            return

        # Create appointment
        appointment_date = (datetime.now() + timedelta(days=1)).isoformat()
        appointment_data = {
            "doctor_id": self.doctor_id,
            "appointment_date": appointment_date,
            "duration_minutes": 30,
            "notes": "Test appointment"
        }
        
        success, response = self.run_test(
            "Create Appointment",
            "POST",
            "appointments",
            200,
            data=appointment_data,
            token=self.patient_token
        )
        if success and 'id' in response:
            self.appointment_id = response['id']
            print(f"Appointment ID: {self.appointment_id}")

        # Get appointments (patient)
        self.run_test("Get Appointments (Patient)", "GET", "appointments", 200, token=self.patient_token)
        
        # Get appointments (doctor)
        if self.doctor_token:
            self.run_test("Get Appointments (Doctor)", "GET", "appointments", 200, token=self.doctor_token)

        # Update appointment status
        if self.appointment_id and self.doctor_token:
            self.run_test(
                "Update Appointment Status",
                "PUT",
                f"appointments/{self.appointment_id}?status=completed",
                200,
                token=self.doctor_token
            )

    def test_medical_records_endpoints(self):
        """Test medical records endpoints"""
        print("\n=== Testing Medical Records Endpoints ===")
        
        if not self.doctor_token or not self.patient_id:
            print("❌ Cannot test medical records - missing doctor token or patient ID")
            return

        # Create medical record
        record_data = {
            "patient_id": self.patient_id,
            "diagnosis": "Test diagnosis",
            "treatment": "Test treatment",
            "notes": "Test medical record notes"
        }
        
        success, response = self.run_test(
            "Create Medical Record",
            "POST",
            "medical-records",
            200,
            data=record_data,
            token=self.doctor_token
        )

        # Get medical records (patient)
        if self.patient_token:
            self.run_test("Get Medical Records (Patient)", "GET", "medical-records", 200, token=self.patient_token)
        
        # Get medical records (doctor)
        self.run_test("Get Medical Records (Doctor)", "GET", "medical-records", 200, token=self.doctor_token)

    def test_prescription_endpoints(self):
        """Test prescription endpoints"""
        print("\n=== Testing Prescription Endpoints ===")
        
        if not self.doctor_token or not self.patient_id:
            print("❌ Cannot test prescriptions - missing doctor token or patient ID")
            return

        # Create prescription
        prescription_data = {
            "patient_id": self.patient_id,
            "medications": [
                {
                    "name": "Aspirin",
                    "dosage": "100mg",
                    "frequency": "Once daily",
                    "duration": "30 days"
                },
                {
                    "name": "Lisinopril",
                    "dosage": "10mg",
                    "frequency": "Once daily",
                    "duration": "90 days"
                }
            ],
            "instructions": "Take with food"
        }
        
        success, response = self.run_test(
            "Create Prescription",
            "POST",
            "prescriptions",
            200,
            data=prescription_data,
            token=self.doctor_token
        )

        # Get prescriptions (patient)
        if self.patient_token:
            self.run_test("Get Prescriptions (Patient)", "GET", "prescriptions", 200, token=self.patient_token)
        
        # Get prescriptions (doctor)
        self.run_test("Get Prescriptions (Doctor)", "GET", "prescriptions", 200, token=self.doctor_token)

    def test_chat_endpoints(self):
        """Test chat endpoints"""
        print("\n=== Testing Chat Endpoints ===")
        
        if not self.patient_token or not self.doctor_token or not self.doctor_id or not self.patient_id:
            print("❌ Cannot test chat - missing tokens or user IDs")
            return

        # Send message from patient to doctor
        message_data = {
            "receiver_id": self.doctor_id,
            "message": "Hello doctor, I have a question about my prescription.",
            "message_type": "text"
        }
        
        self.run_test(
            "Send Chat Message (Patient to Doctor)",
            "POST",
            "chat/messages",
            200,
            data=message_data,
            token=self.patient_token
        )

        # Send message from doctor to patient
        message_data = {
            "receiver_id": self.patient_id,
            "message": "Hello, I'm here to help. What's your question?",
            "message_type": "text"
        }
        
        self.run_test(
            "Send Chat Message (Doctor to Patient)",
            "POST",
            "chat/messages",
            200,
            data=message_data,
            token=self.doctor_token
        )

        # Get messages (patient view)
        self.run_test(
            "Get Chat Messages (Patient)",
            "GET",
            f"chat/messages?other_user_id={self.doctor_id}",
            200,
            token=self.patient_token
        )

        # Get messages (doctor view)
        self.run_test(
            "Get Chat Messages (Doctor)",
            "GET",
            f"chat/messages?other_user_id={self.patient_id}",
            200,
            token=self.doctor_token
        )

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoints"""
        print("\n=== Testing Dashboard Stats ===")
        
        if self.patient_token:
            self.run_test("Patient Dashboard Stats", "GET", "dashboard/stats", 200, token=self.patient_token)
        
        if self.doctor_token:
            self.run_test("Doctor Dashboard Stats", "GET", "dashboard/stats", 200, token=self.doctor_token)
        
        if self.admin_token:
            self.run_test("Admin Dashboard Stats", "GET", "dashboard/stats", 200, token=self.admin_token)

    def test_payment_endpoints(self):
        """Test payment endpoints"""
        print("\n=== Testing Payment Endpoints ===")
        
        if not self.patient_token or not self.appointment_id:
            print("❌ Cannot test payments - missing patient token or appointment ID")
            return

        # Test create checkout session
        success, response = self.run_test(
            "Create Checkout Session",
            "POST",
            f"payments/create-checkout?appointment_id={self.appointment_id}",
            200,
            token=self.patient_token
        )
        
        if success and 'session_id' in response:
            session_id = response['session_id']
            print(f"Checkout Session ID: {session_id}")
            
            # Test get payment status
            self.run_test(
                "Get Payment Status",
                "GET",
                f"payments/status/{session_id}",
                200,
                token=self.patient_token
            )

def main():
    print("🏥 Starting MedConnect API Testing...")
    print("=" * 50)
    
    tester = MedConnectAPITester()
    
    # Run all tests
    try:
        tester.test_user_registration()
        tester.test_user_login()
        tester.test_auth_me()
        tester.test_user_endpoints()
        tester.test_appointment_endpoints()
        tester.test_medical_records_endpoints()
        tester.test_prescription_endpoints()
        tester.test_chat_endpoints()
        tester.test_dashboard_stats()
        tester.test_payment_endpoints()
    except Exception as e:
        print(f"❌ Critical error during testing: {str(e)}")
        return 1

    # Print results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS")
    print("=" * 50)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests ({len(tester.failed_tests)}):")
        for failed_test in tester.failed_tests:
            print(f"  - {failed_test}")
    else:
        print("\n✅ All tests passed!")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"\nSuccess Rate: {success_rate:.1f}%")
    
    return 0 if success_rate >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())