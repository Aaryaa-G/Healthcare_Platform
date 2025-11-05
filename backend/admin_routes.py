from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Optional, Any
from models.auth import User
from datetime import datetime
from server import get_current_user, db

router = APIRouter(prefix="/admin", tags=["admin"])

def get_current_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access this resource"
        )
    return current_user

@router.get("/dashboard/stats", response_model=Dict)
async def get_dashboard_stats(current_user: User = Depends(get_current_admin)):
    try:
        total_patients = await db.users.count_documents({"role": "patient"})
        total_doctors = await db.users.count_documents({"role": "doctor"})
        total_appointments = await db.appointments.count_documents({})
        total_revenue = await db.payments.aggregate([
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)

        return {
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "total_appointments": total_appointments,
            "total_revenue": total_revenue[0]["total"] if total_revenue else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users", response_model=List[User])
async def get_all_users(
    role: Optional[str] = None,
    skip: int = 0,
    limit: int = 10,
    current_user: User = Depends(get_current_admin)
):
    try:
        query = {"role": role} if role else {}
        users = await db.users.find(query).skip(skip).limit(limit).to_list(limit)
        return [User(**user) for user in users]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/users/{user_id}", response_model=User)
async def update_user(
    user_id: str,
    user_update: Dict[str, Any],
    current_user: User = Depends(get_current_admin)
):
    try:
        if "role" in user_update and user_update["role"] == "admin":
            raise HTTPException(status_code=400, detail="Cannot create admin users through this endpoint")
        
        result = await db.users.find_one_and_update(
            {"id": user_id},
            {"$set": user_update},
            return_document=True
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
            
        return User(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_admin)
):
    try:
        result = await db.users.find_one_and_delete({"id": user_id})
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/appointments", response_model=List[Dict])
async def get_all_appointments(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 10,
    current_user: User = Depends(get_current_admin)
):
    try:
        query = {"status": status} if status else {}
        appointments = await db.appointments.find(query).skip(skip).limit(limit).to_list(limit)
        
        # Enrich appointments with user data
        enriched_appointments = []
        for appointment in appointments:
            patient = await db.users.find_one({"id": appointment["patient_id"]})
            doctor = await db.users.find_one({"id": appointment["doctor_id"]})
            
            appointment["patient_name"] = f"{patient['first_name']} {patient['last_name']}" if patient else "Unknown"
            appointment["doctor_name"] = f"Dr. {doctor['first_name']} {doctor['last_name']}" if doctor else "Unknown"
            enriched_appointments.append(appointment)
            
        return enriched_appointments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/appointments/{appointment_id}")
async def update_appointment_status(
    appointment_id: str,
    status_update: Dict[str, str],
    current_user: User = Depends(get_current_admin)
):
    try:
        result = await db.appointments.find_one_and_update(
            {"id": appointment_id},
            {"$set": {"status": status_update["status"]}},
            return_document=True
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Appointment not found")
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/payments", response_model=List[Dict])
async def get_all_payments(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 10,
    current_user: User = Depends(get_current_admin)
):
    try:
        query = {"status": status} if status else {}
        payments = await db.payments.find(query).skip(skip).limit(limit).to_list(limit)
        return payments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/payments/{payment_id}")
async def update_payment_status(
    payment_id: str,
    status_update: Dict[str, str],
    current_user: User = Depends(get_current_admin)
):
    try:
        result = await db.payments.find_one_and_update(
            {"id": payment_id},
            {"$set": {"status": status_update["status"]}},
            return_document=True
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Payment not found")
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))