from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from typing import Optional
import time
import json
import logging

class HIPAAMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.logger = logging.getLogger("hipaa_middleware")
        self.sensitive_paths = [
            "/api/medical-records",
            "/api/prescriptions",
            "/api/appointments",
            "/api/users"
        ]

    async def dispatch(self, request: Request, call_next) -> Response:
        # Start timer for response time logging
        start_time = time.time()
        
        # Check for required security headers
        if not self._verify_security_headers(request):
            return Response(
                content=json.dumps({"detail": "Required security headers missing"}),
                status_code=403,
                media_type="application/json"
            )
        
        # Add HIPAA security headers to response
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        
        # Log access to sensitive endpoints
        if any(path in str(request.url.path) for path in self.sensitive_paths):
            self._log_sensitive_access(request, time.time() - start_time)
        
        return response

    def _verify_security_headers(self, request: Request) -> bool:
        """Verify required security headers for HIPAA compliance"""
        # In production, verify specific security requirements
        required_headers = [
            # "X-Security-Token",  # Custom security token
            # "X-Client-Cert",     # Client certificate validation
        ]
        
        # For development, return True
        return True
        
        # For production, uncomment:
        # return all(header in request.headers for header in required_headers)

    def _log_sensitive_access(self, request: Request, response_time: float):
        """Log access to sensitive endpoints"""
        log_entry = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "method": request.method,
            "path": request.url.path,
            "client_ip": request.client.host,
            "response_time": f"{response_time:.3f}s",
            "user_agent": request.headers.get("user-agent"),
        }
        
        self.logger.info(f"PHI Access: {json.dumps(log_entry)}")