from pydantic import BaseModel, EmailStr
from typing import Optional, Dict
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional["User"] = None

class TokenData(BaseModel):
    email: Optional[str] = None

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class UserBase(BaseModel):
    email: EmailStr
    role: str = "patient"  # Default role is patient
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    created_at: datetime
    disabled: Optional[bool] = None
    email_verified: bool = False  # New field for email verification status