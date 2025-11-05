from datetime import datetime, timezone
from typing import Optional, Dict, Any
import hashlib
import logging
import json

# Configure logging for HIPAA compliance
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
hipaa_logger = logging.getLogger('hipaa_audit')

class HIPAACompliance:
    @staticmethod
    def mask_sensitive_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Mask sensitive data like SSN, phone numbers, etc."""
        masked_data = data.copy()
        sensitive_fields = ['ssn', 'phone', 'date_of_birth']
        
        for field in sensitive_fields:
            if field in masked_data:
                if field == 'phone' and isinstance(masked_data[field], str):
                    # Mask all but last 4 digits of phone number
                    masked_data[field] = 'XXX-XXX-' + masked_data[field][-4:]
                elif field == 'ssn' and isinstance(masked_data[field], str):
                    # Mask all but last 4 digits of SSN
                    masked_data[field] = 'XXX-XX-' + masked_data[field][-4:]
                elif field == 'date_of_birth' and isinstance(masked_data[field], str):
                    # Only show year for date of birth
                    masked_data[field] = 'XXXX-XX-XX'
        
        return masked_data

    @staticmethod
    def hash_phi(value: str) -> str:
        """Create a secure hash of Protected Health Information (PHI)"""
        return hashlib.sha256(value.encode()).hexdigest()

    @staticmethod
    def log_phi_access(
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        reason: Optional[str] = None,
        additional_info: Optional[Dict] = None
    ):
        """Log access to Protected Health Information (PHI) for audit purposes"""
        audit_entry = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'user_id': user_id,
            'action': action,
            'resource_type': resource_type,
            'resource_id': resource_id,
            'reason': reason or 'Standard access',
            'additional_info': additional_info or {}
        }
        
        hipaa_logger.info(f'PHI Access: {json.dumps(audit_entry)}')
        return audit_entry

    @staticmethod
    def verify_hipaa_authorization(user_role: str, resource_type: str, action: str) -> bool:
        """Verify if a user has HIPAA-compliant authorization for an action"""
        authorization_matrix = {
            'doctor': {
                'medical_records': ['read', 'write', 'update'],
                'prescriptions': ['read', 'write', 'update'],
                'appointments': ['read', 'write', 'update'],
                'patient_info': ['read']
            },
            'patient': {
                'medical_records': ['read'],
                'prescriptions': ['read'],
                'appointments': ['read', 'write'],
                'patient_info': ['read', 'update']
            },
            'admin': {
                'medical_records': ['read'],
                'prescriptions': ['read'],
                'appointments': ['read'],
                'patient_info': ['read']
            }
        }
        
        allowed_actions = authorization_matrix.get(user_role, {}).get(resource_type, [])
        return action in allowed_actions

    @staticmethod
    def validate_emergency_access(user_id: str, resource_type: str) -> bool:
        """Validate emergency access to PHI (break-glass protocol)"""
        # In a real implementation, this would check emergency status
        # and create special audit logs
        return False  # Default to False for safety