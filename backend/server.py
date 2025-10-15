from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone, date, time
from typing import List, Optional, Dict, Any
from pathlib import Path
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import os
import uuid
import logging

# Import Stripe and SendGrid from emergentintegrations
# from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-here-change-in-production")
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

# Add CORS middleware
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

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str = "patient"  # patient, doctor, admin
    phone: Optional[str] = None
    specialization: Optional[str] = None  # for doctors
    experience: Optional[str] = None  # for doctors
    medical_history: Optional[List[str]] = []
    allergies: Optional[List[str]] = []
    medications: Optional[List[str]] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "patient"
    phone: Optional[str] = None
    specialization: Optional[str] = None
    experience: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

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
@api_router.post("/auth/register", response_model=Token)
async def register(user: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    del user_dict["password"]
    user_dict["hashed_password"] = hashed_password
    user_dict["id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.now(timezone.utc)
    
    # Prepare for MongoDB
    user_dict = prepare_for_mongo(user_dict)
    
    # Insert user
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # Return user info without password
    user_obj = User(**{k: v for k, v in user_dict.items() if k != "hashed_password"})
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.post("/auth/login", response_model=Token)
async def login(user: UserLogin):
    # Find user
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # Return user info without password
    user_obj = User(**{k: v for k, v in db_user.items() if k != "hashed_password"})
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# User endpoints
@api_router.get("/users/doctors", response_model=List[User])
async def get_doctors():
    doctors = await db.users.find({"role": "doctor"}).to_list(length=None)
    return [User(**{k: v for k, v in doctor.items() if k != "hashed_password"}) for doctor in doctors]

@api_router.get("/users/patients", response_model=List[User])
async def get_patients(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    patients = await db.users.find({"role": "patient"}).to_list(length=None)
    return [User(**{k: v for k, v in patient.items() if k != "hashed_password"}) for patient in patients]

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
    
    appointment_dict = appointment.dict()
    appointment_dict["patient_id"] = current_user.id
    appointment_dict["id"] = str(uuid.uuid4())
    appointment_dict["created_at"] = datetime.now(timezone.utc)
    appointment_dict["payment_status"] = "pending"  # Default to pending
    appointment_dict["status"] = "scheduled"  # Default status
    
    # Prepare for MongoDB
    appointment_dict = prepare_for_mongo(appointment_dict)
    
    await db.appointments.insert_one(appointment_dict)
    return Appointment(**appointment_dict)

@api_router.get("/appointments", response_model=List[Appointment])
async def get_appointments(current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role == "patient":
        query["patient_id"] = current_user.id
    elif current_user.role == "doctor":
        query["doctor_id"] = current_user.id
    
    appointments = await db.appointments.find(query).to_list(length=None)
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
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can create medical records")
    
    record_dict = record.dict()
    record_dict["doctor_id"] = current_user.id
    record_dict["id"] = str(uuid.uuid4())
    record_dict["created_at"] = datetime.now(timezone.utc)
    
    # Prepare for MongoDB
    record_dict = prepare_for_mongo(record_dict)
    
    await db.medical_records.insert_one(record_dict)
    return MedicalRecord(**record_dict)

@api_router.get("/medical-records", response_model=List[MedicalRecord])
async def get_medical_records(patient_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
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
    
    records = await db.medical_records.find(query).to_list(length=None)
    return [MedicalRecord(**parse_from_mongo(record)) for record in records]

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
async def get_prescriptions(patient_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
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
    
    prescriptions = await db.prescriptions.find(query).to_list(length=None)
    return [Prescription(**parse_from_mongo(prescription)) for prescription in prescriptions]

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