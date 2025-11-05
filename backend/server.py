from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks, Request, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime, timedelta, timezone, date, time
from typing import List, Optional, Dict, Any
from pathlib import Path
from contextlib import asynccontextmanager
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import uuid
import logging
import pytz

# Import local modules
from config import *
from database import db
from models.auth import User, UserCreate, Token, TokenData, OTPVerify
from routes import admin_router
from dependencies import get_current_user
from hipaa_compliance import HIPAACompliance
from phi_encryption import PHIEncryption
from email_service import EmailService

# Initialize services
email_service = EmailService()

# Initialize HIPAA compliance and PHI encryption
hipaa = HIPAACompliance()
phi_encryption = PHIEncryption()

# Import Stripe and SendGrid from emergentintegrations
# from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get("1223", "1223")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: nothing to do, client is already initialized
    yield
    # Shutdown: close MongoDB client
    client.close()

# Create the main app without a prefix
app = FastAPI(title="Medical Portal API", lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Add security middlewares
from hipaa_middleware import HIPAAMiddleware

app.add_middleware(HIPAAMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper functions for MongoDB serialization
def prepare_for_mongo(data):
    """Convert datetime objects to ISO strings for MongoDB storage"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
            elif isinstance(value, date):
                data[key] = value.isoformat()
            elif isinstance(value, time):
                data[key] = value.strftime('%H:%M:%S')
    return data

def parse_from_mongo(item):
    """Parse datetime strings from MongoDB"""
    if isinstance(item, dict):
        for key, value in item.items():
            if isinstance(value, str):
                try:
                    # Try to parse as datetime
                    if 'T' in value:
                        item[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                    elif ':' in value and len(value) == 8:  # Time format
                        item[key] = datetime.strptime(value, '%H:%M:%S').time()
                    elif '-' in value and len(value) == 10:  # Date format
                        item[key] = datetime.fromisoformat(value).date()
                except:
                    pass
    return item

# Authentication functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return User(**user)

# Import models
from models.auth import User, UserCreate, Token, TokenData, OTPVerify

class Appointment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    doctor_id: str
    appointment_date: datetime
    duration_minutes: int = 30
    status: str = "scheduled"  # scheduled, completed, cancelled
    notes: Optional[str] = None
    consultation_fee: float = 0.0
    payment_status: str = "pending"  # pending, paid, overdue
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AppointmentCreate(BaseModel):
    doctor_id: str
    appointment_date: datetime
    duration_minutes: int = 30
    notes: Optional[str] = None

class MedicalRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    doctor_id: str
    appointment_id: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    notes: Optional[str] = None
    file_urls: Optional[List[str]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MedicalRecordCreate(BaseModel):
    patient_id: str
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    notes: Optional[str] = None
    file_urls: Optional[List[str]] = []

class Prescription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    doctor_id: str
    appointment_id: Optional[str] = None
    medications: List[Dict[str, Any]]  # [{name, dosage, frequency, duration}]
    instructions: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PrescriptionCreate(BaseModel):
    patient_id: str
    appointment_id: Optional[str] = None
    medications: List[Dict[str, Any]]
    instructions: Optional[str] = None

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    receiver_id: str
    appointment_id: Optional[str] = None
    message: str
    message_type: str = "text"  # text, image, file
    file_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessageCreate(BaseModel):
    receiver_id: str
    appointment_id: Optional[str] = None
    message: str
    message_type: str = "text"
    file_url: Optional[str] = None

class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    appointment_id: Optional[str] = None
    amount: float
    currency: str = "usd"
    session_id: str
    payment_status: str = "pending"
    stripe_payment_intent: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Email service functions
def send_appointment_reminder(user_email: str, appointment_details: dict):
    """Send appointment reminder email (placeholder)"""
    # This would integrate with SendGrid
    print(f"Sending appointment reminder to {user_email}: {appointment_details}")
    return True

# Authentication endpoints
@api_router.post("/auth/register", response_model=Dict[str, str])
async def register(user: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate OTP and send verification email
    otp = email_service.generate_otp(user.email)
    email_sent = await email_service.send_verification_email(user.email, otp)
    
    if not email_sent:
        raise HTTPException(
            status_code=500,
            detail="Failed to send verification email"
        )
    
    # Hash password and create user
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    del user_dict["password"]
    user_dict["hashed_password"] = hashed_password
    user_dict["id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.now(timezone.utc)
    user_dict["email_verified"] = False
    
    # Prepare for MongoDB
    user_dict = prepare_for_mongo(user_dict)
    
    # Insert user
    await db.users.insert_one(user_dict)
    
    return {
        "message": "Registration initiated. Please check your email for verification code.",
        "email": user.email
    }

@api_router.post("/auth/verify-email", response_model=Token)
async def verify_email(verify_data: OTPVerify):
    # Verify OTP
    if not email_service.verify_otp(verify_data.email, verify_data.otp):
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification code"
        )
    
    # Update user's email verification status
    result = await db.users.update_one(
        {"email": verify_data.email},
        {"$set": {"email_verified": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    # Get user data
    user = await db.users.find_one({"email": verify_data.email})
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": verify_data.email},
        expires_delta=access_token_expires
    )
    
    # Return user info without password
    user_obj = User(**{k: v for k, v in user.items() if k != "hashed_password"})
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Find user
    db_user = await db.users.find_one({"email": form_data.username})
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(form_data.password, db_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not db_user.get("email_verified", False):
        raise HTTPException(status_code=400, detail="Email not verified. Please verify your email first.")
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": form_data.username}, expires_delta=access_token_expires
    )
    
    # Return user info without password
    user_obj = User(**{k: v for k, v in db_user.items() if k != "hashed_password"})
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.put("/auth/me", response_model=User)
async def update_me(
    updates: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    # Fields that cannot be updated
    protected_fields = {"id", "email", "role", "created_at", "hashed_password"}
    update_data = {k: v for k, v in updates.items() if k not in protected_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Prepare for MongoDB
    update_data = prepare_for_mongo(update_data)
    
    # Update user
    result = await db.users.update_one(
        {"id": current_user.id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Update failed")
    
    # Get updated user
    updated_user = await db.users.find_one({"id": current_user.id})
    return User(**{k: v for k, v in updated_user.items() if k != "hashed_password"})

# User endpoints
@api_router.get("/users/doctors", response_model=List[User])
async def get_doctors(
    specialization: Optional[str] = None,
    search: Optional[str] = None
):
    query = {"role": "doctor", "is_active": True}
    
    if specialization:
        query["specialization"] = specialization
    
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"specialization": {"$regex": search, "$options": "i"}}
        ]
    
    pipeline = [
        {"$match": query},
        {"$lookup": {
            "from": "appointments",
            "localField": "id",
            "foreignField": "doctor_id",
            "as": "appointments"
        }},
        {"$addFields": {
            "total_appointments": {"$size": "$appointments"},
            "rating": {"$avg": "$appointments.rating"}
        }},
        {"$project": {
            "hashed_password": 0,
            "appointments": 0
        }}
    ]
    
    doctors = await db.users.aggregate(pipeline).to_list(length=None)
    return [User(**doctor) for doctor in doctors]

@api_router.get("/users/patients", response_model=List[User])
async def get_patients(
    current_user: User = Depends(get_current_user),
    search: Optional[str] = None
):
    if current_user.role not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {"role": "patient"}
    
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    if current_user.role == "doctor":
        # Only return patients who have had appointments with this doctor
        patient_ids = await db.appointments.distinct(
            "patient_id",
            {"doctor_id": current_user.id}
        )
        query["id"] = {"$in": patient_ids}
    
    pipeline = [
        {"$match": query},
        {"$lookup": {
            "from": "appointments",
            "localField": "id",
            "foreignField": "patient_id",
            "as": "appointments"
        }},
        {"$addFields": {
            "total_appointments": {"$size": "$appointments"},
            "last_visit": {"$max": "$appointments.appointment_date"}
        }},
        {"$project": {
            "hashed_password": 0,
            "appointments": 0
        }}
    ]
    
    patients = await db.users.aggregate(pipeline).to_list(length=None)
    return [User(**patient) for patient in patients]

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    # Doctors can view their patients' profiles
    # Patients can view their doctors' profiles
    # Admins can view all profiles
    if current_user.role not in ["admin"]:
        if current_user.role == "doctor":
            # Verify this is a patient who has an appointment with this doctor
            appointment = await db.appointments.find_one({
                "doctor_id": current_user.id,
                "patient_id": user_id
            })
            if not appointment:
                raise HTTPException(status_code=403, detail="Access denied")
        elif current_user.role == "patient":
            # Verify this is a doctor who has an appointment with this patient
            appointment = await db.appointments.find_one({
                "patient_id": current_user.id,
                "doctor_id": user_id
            })
            if not appointment:
                raise HTTPException(status_code=403, detail="Access denied")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**{k: v for k, v in user.items() if k != "hashed_password"})

# Appointment endpoints
@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(appointment: AppointmentCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can book appointments")
    
    # Check if patient has any unpaid appointments
    unpaid_appointments = await db.appointments.count_documents({
        "patient_id": current_user.id,
        "payment_status": {"$in": ["pending", "overdue"]}
    })
    
    if unpaid_appointments > 0:
        raise HTTPException(
            status_code=402, 
            detail="You have unpaid appointments. Please settle payment before booking a new appointment."
        )
    
    # Check if the requested time slot is available
    existing_appointment = await db.appointments.find_one({
        "doctor_id": appointment.doctor_id,
        "appointment_date": appointment.appointment_date,
        "status": "scheduled"
    })
    
    if existing_appointment:
        raise HTTPException(
            status_code=409,
            detail="This time slot is already booked. Please choose another time."
        )
    
    # Verify doctor exists and is active
    doctor = await db.users.find_one({
        "id": appointment.doctor_id,
        "role": "doctor",
        "is_active": True
    })
    
    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found or is not available"
        )
    
    appointment_dict = appointment.dict()
    appointment_dict["patient_id"] = current_user.id
    appointment_dict["id"] = str(uuid.uuid4())
    appointment_dict["created_at"] = datetime.now(timezone.utc)
    appointment_dict["payment_status"] = "pending"  # Default to pending
    appointment_dict["status"] = "scheduled"  # Default status
    appointment_dict["consultation_fee"] = 50.00  # Default fee
    
    # Prepare for MongoDB
    appointment_dict = prepare_for_mongo(appointment_dict)
    
    await db.appointments.insert_one(appointment_dict)
    
    # Send email notification to doctor (background task)
    doctor_email = doctor.get("email")
    if doctor_email:
        try:
            send_appointment_reminder(doctor_email, {
                "patient_name": current_user.full_name,
                "appointment_date": appointment.appointment_date,
                "duration": appointment.duration_minutes
            })
        except Exception as e:
            logger.error(f"Failed to send email notification: {str(e)}")
    
    return Appointment(**appointment_dict)

@api_router.get("/appointments", response_model=List[Appointment])
async def get_appointments(
    status: Optional[str] = Query(None, enum=["scheduled", "completed", "cancelled"]),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if current_user.role == "patient":
        query["patient_id"] = current_user.id
    elif current_user.role == "doctor":
        query["doctor_id"] = current_user.id
    
    if status:
        query["status"] = status
    
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = datetime.fromisoformat(date_from)
        if date_to:
            date_query["$lte"] = datetime.fromisoformat(date_to)
        if date_query:
            query["appointment_date"] = date_query
    
    appointments = await db.appointments.find(query).sort("appointment_date", 1).to_list(length=None)
    return [Appointment(**parse_from_mongo(apt)) for apt in appointments]

@api_router.put("/appointments/{appointment_id}", response_model=Appointment)
async def update_appointment(appointment_id: str, status: str, current_user: User = Depends(get_current_user)):
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check permissions
    if current_user.role == "patient" and appointment["patient_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "doctor" and appointment["doctor_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.appointments.update_one({"id": appointment_id}, {"$set": {"status": status}})
    updated_appointment = await db.appointments.find_one({"id": appointment_id})
    return Appointment(**parse_from_mongo(updated_appointment))

# Medical Records endpoints
@api_router.post("/medical-records", response_model=MedicalRecord)
async def create_medical_record(record: MedicalRecordCreate, current_user: User = Depends(get_current_user)):
    if not hipaa.verify_hipaa_authorization(current_user.role, "medical_records", "write"):
        raise HTTPException(status_code=403, detail="HIPAA: Unauthorized access to medical records")
    
    record_dict = record.dict()
    record_dict["doctor_id"] = current_user.id
    record_dict["id"] = str(uuid.uuid4())
    record_dict["created_at"] = datetime.now(timezone.utc)
    
    # Encrypt sensitive PHI data
    if record_dict.get("diagnosis"):
        record_dict["diagnosis"] = phi_encryption.encrypt_phi(record_dict["diagnosis"])
    if record_dict.get("treatment"):
        record_dict["treatment"] = phi_encryption.encrypt_phi(record_dict["treatment"])
    if record_dict.get("notes"):
        record_dict["notes"] = phi_encryption.encrypt_phi(record_dict["notes"])
    
    # Log PHI access
    hipaa.log_phi_access(
        user_id=current_user.id,
        action="create",
        resource_type="medical_records",
        resource_id=record_dict["id"],
        additional_info={"patient_id": record_dict["patient_id"]}
    )
    
    # Prepare for MongoDB
    record_dict = prepare_for_mongo(record_dict)
    
    await db.medical_records.insert_one(record_dict)
    return MedicalRecord(**record_dict)

@api_router.get("/medical-records", response_model=List[MedicalRecord])
async def get_medical_records(
    patient_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    if not hipaa.verify_hipaa_authorization(current_user.role, "medical_records", "read"):
        raise HTTPException(status_code=403, detail="HIPAA: Unauthorized access to medical records")
    
    query = {}
    if current_user.role == "patient":
        query["patient_id"] = current_user.id
    elif current_user.role == "doctor":
        if patient_id:
            query["patient_id"] = patient_id
        else:
            query["doctor_id"] = current_user.id
    elif patient_id and current_user.role == "admin":
        query["patient_id"] = patient_id
    else:
        raise HTTPException(status_code=403, detail="HIPAA: Unauthorized access to medical records")
        
    # Log PHI access attempt
    hipaa.log_phi_access(
        user_id=current_user.id,
        action="read",
        resource_type="medical_records",
        resource_id="multiple",
        additional_info={"patient_id": patient_id if patient_id else current_user.id}
    )
    
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = datetime.fromisoformat(date_from)
        if date_to:
            date_query["$lte"] = datetime.fromisoformat(date_to)
        if date_query:
            query["created_at"] = date_query
    
    pipeline = [
        {"$match": query},
        {"$lookup": {
            "from": "users",
            "localField": "doctor_id",
            "foreignField": "id",
            "as": "doctor"
        }},
        {"$unwind": "$doctor"},
        {"$project": {
            "id": 1,
            "patient_id": 1,
            "doctor_id": 1,
            "appointment_id": 1,
            "diagnosis": 1,
            "treatment": 1,
            "notes": 1,
            "file_urls": 1,
            "created_at": 1,
            "doctor_name": "$doctor.full_name",
            "doctor_specialization": "$doctor.specialization"
        }}
    ]
    
    records = await db.medical_records.aggregate(pipeline).to_list(length=None)
    
    # Decrypt sensitive fields before returning
    decrypted_records = []
    for record in records:
        try:
            if record.get("diagnosis"):
                record["diagnosis"] = phi_encryption.decrypt_phi(record["diagnosis"])
            if record.get("treatment"):
                record["treatment"] = phi_encryption.decrypt_phi(record["treatment"])
            if record.get("notes"):
                record["notes"] = phi_encryption.decrypt_phi(record["notes"])
                
            # Mask sensitive data based on user role
            if current_user.role != "doctor":
                record = hipaa.mask_sensitive_data(record)
                
            decrypted_records.append(record)
        except Exception as e:
            logging.error(f"Error decrypting record {record.get('id')}: {str(e)}")
            continue
    
    return [MedicalRecord(**parse_from_mongo(record)) for record in decrypted_records]

@api_router.put("/medical-records/{record_id}", response_model=MedicalRecord)
async def update_medical_record(
    record_id: str,
    updates: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can update medical records")
    
    # Verify record exists and belongs to the doctor
    record = await db.medical_records.find_one({
        "id": record_id,
        "doctor_id": current_user.id
    })
    
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    
    # Remove protected fields
    protected_fields = {"id", "patient_id", "doctor_id", "created_at"}
    update_data = {k: v for k, v in updates.items() if k not in protected_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Prepare for MongoDB
    update_data = prepare_for_mongo(update_data)
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Update record
    result = await db.medical_records.update_one(
        {"id": record_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Update failed")
    
    # Get updated record
    updated_record = await db.medical_records.find_one({"id": record_id})
    return MedicalRecord(**parse_from_mongo(updated_record))

# Prescription endpoints
@api_router.post("/prescriptions", response_model=Prescription)
async def create_prescription(prescription: PrescriptionCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can create prescriptions")
    
    prescription_dict = prescription.dict()
    prescription_dict["doctor_id"] = current_user.id
    prescription_dict["id"] = str(uuid.uuid4())
    prescription_dict["created_at"] = datetime.now(timezone.utc)
    
    # Prepare for MongoDB
    prescription_dict = prepare_for_mongo(prescription_dict)
    
    await db.prescriptions.insert_one(prescription_dict)
    return Prescription(**prescription_dict)

@api_router.get("/prescriptions", response_model=List[Prescription])
async def get_prescriptions(
    patient_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if current_user.role == "patient":
        query["patient_id"] = current_user.id
    elif current_user.role == "doctor":
        if patient_id:
            query["patient_id"] = patient_id
        else:
            query["doctor_id"] = current_user.id
    elif patient_id:
        query["patient_id"] = patient_id
    
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = datetime.fromisoformat(date_from)
        if date_to:
            date_query["$lte"] = datetime.fromisoformat(date_to)
        if date_query:
            query["created_at"] = date_query
    
    pipeline = [
        {"$match": query},
        {"$lookup": {
            "from": "users",
            "localField": "doctor_id",
            "foreignField": "id",
            "as": "doctor"
        }},
        {"$unwind": "$doctor"},
        {"$lookup": {
            "from": "users",
            "localField": "patient_id",
            "foreignField": "id",
            "as": "patient"
        }},
        {"$unwind": "$patient"},
        {"$project": {
            "id": 1,
            "patient_id": 1,
            "doctor_id": 1,
            "appointment_id": 1,
            "medications": 1,
            "instructions": 1,
            "created_at": 1,
            "doctor_name": "$doctor.full_name",
            "doctor_specialization": "$doctor.specialization",
            "patient_name": "$patient.full_name"
        }}
    ]
    
    prescriptions = await db.prescriptions.aggregate(pipeline).to_list(length=None)
    return [Prescription(**parse_from_mongo(prescription)) for prescription in prescriptions]

@api_router.put("/prescriptions/{prescription_id}", response_model=Prescription)
async def update_prescription(
    prescription_id: str,
    updates: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can update prescriptions")
    
    # Verify prescription exists and belongs to the doctor
    prescription = await db.prescriptions.find_one({
        "id": prescription_id,
        "doctor_id": current_user.id
    })
    
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    # Remove protected fields
    protected_fields = {"id", "patient_id", "doctor_id", "created_at"}
    update_data = {k: v for k, v in updates.items() if k not in protected_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Prepare for MongoDB
    update_data = prepare_for_mongo(update_data)
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Update prescription
    result = await db.prescriptions.update_one(
        {"id": prescription_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Update failed")
    
    # Get updated prescription
    updated_prescription = await db.prescriptions.find_one({"id": prescription_id})
    return Prescription(**parse_from_mongo(updated_prescription))

# Chat endpoints
@api_router.post("/chat/messages", response_model=ChatMessage)
async def send_message(message: ChatMessageCreate, current_user: User = Depends(get_current_user)):
    message_dict = message.dict()
    message_dict["sender_id"] = current_user.id
    message_dict["id"] = str(uuid.uuid4())
    message_dict["created_at"] = datetime.now(timezone.utc)
    
    # Prepare for MongoDB
    message_dict = prepare_for_mongo(message_dict)
    
    await db.chat_messages.insert_one(message_dict)
    return ChatMessage(**message_dict)

@api_router.get("/chat/messages", response_model=List[ChatMessage])
async def get_messages(other_user_id: str, current_user: User = Depends(get_current_user)):
    messages = await db.chat_messages.find({
        "$or": [
            {"sender_id": current_user.id, "receiver_id": other_user_id},
            {"sender_id": other_user_id, "receiver_id": current_user.id}
        ]
    }).sort("created_at", 1).to_list(length=None)
    
    return [ChatMessage(**parse_from_mongo(message)) for message in messages]

# Payment management endpoints (Admin only)
@api_router.patch("/appointments/{appointment_id}/payment-status")
async def update_payment_status(
    appointment_id: str,
    payment_status: str,
    current_user: User = Depends(get_current_user)
):
    # Only admins can update payment status
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if payment_status not in ["pending", "paid", "overdue"]:
        raise HTTPException(status_code=400, detail="Invalid payment status")
    
    # Update appointment payment status
    result = await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {"payment_status": payment_status, "payment_updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return {"message": "Payment status updated successfully"}

# Dashboard endpoints
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    stats = {}
    
    if current_user.role == "patient":
        # Patient stats
        appointments_count = await db.appointments.count_documents({"patient_id": current_user.id})
        prescriptions_count = await db.prescriptions.count_documents({"patient_id": current_user.id})
        records_count = await db.medical_records.count_documents({"patient_id": current_user.id})
        
        stats = {
            "total_appointments": appointments_count,
            "total_prescriptions": prescriptions_count,
            "total_records": records_count,
            "upcoming_appointments": await db.appointments.count_documents({
                "patient_id": current_user.id,
                "status": "scheduled"
            })
        }
    
    elif current_user.role == "doctor":
        # Doctor stats
        appointments_count = await db.appointments.count_documents({"doctor_id": current_user.id})
        patients = await db.appointments.distinct("patient_id", {"doctor_id": current_user.id})
        
        stats = {
            "total_appointments": appointments_count,
            "total_patients": len(patients),
            "today_appointments": await db.appointments.count_documents({
                "doctor_id": current_user.id,
                "status": "scheduled"
            })
        }
    
    elif current_user.role == "admin":
        # Admin stats
        total_users = await db.users.count_documents({})
        total_doctors = await db.users.count_documents({"role": "doctor"})
        total_patients = await db.users.count_documents({"role": "patient"})
        total_appointments = await db.appointments.count_documents({})
        
        stats = {
            "total_users": total_users,
            "total_doctors": total_doctors,
            "total_patients": total_patients,
            "total_appointments": total_appointments
        }
    
    return stats

# Include the router in the main app
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)