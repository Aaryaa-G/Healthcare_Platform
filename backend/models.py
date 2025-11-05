from pydantic import BaseModel
from typing import Optional, Dict, Any

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
    additional_info: Optional[Dict[str, Any]] = None

class SuccessResponse(BaseModel):
    message: str
    data: Optional[Dict[str, Any]] = None