from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from base64 import b64encode, b64decode
import os

class PHIEncryption:
    def __init__(self, key=None):
        """Initialize encryption with a key or generate a new one"""
        if key:
            self.key = key
        else:
            self.key = self._generate_key()
        self.fernet = Fernet(self.key)

    @staticmethod
    def _generate_key():
        """Generate a new encryption key"""
        salt = os.urandom(16)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = b64encode(kdf.derive(os.urandom(32)))
        return key

    def encrypt_phi(self, data: str) -> str:
        """Encrypt Protected Health Information"""
        try:
            return self.fernet.encrypt(data.encode()).decode()
        except Exception as e:
            raise Exception(f"Encryption failed: {str(e)}")

    def decrypt_phi(self, encrypted_data: str) -> str:
        """Decrypt Protected Health Information"""
        try:
            return self.fernet.decrypt(encrypted_data.encode()).decode()
        except Exception as e:
            raise Exception(f"Decryption failed: {str(e)}")

    def rotate_key(self):
        """Rotate encryption key (should be done periodically)"""
        new_key = self._generate_key()
        old_fernet = self.fernet
        self.key = new_key
        self.fernet = Fernet(new_key)
        return old_fernet  # Return old key for re-encryption of existing data