from cryptography.fernet import Fernet
from datetime import datetime

# A static key is used so that data persists across server restarts.
# In a real scenario, you might obfuscate this further.
# This key allows us to encrypt "2025-12-31" into a secure hash.
SECRET_KEY = b'wJ-W8_5Tq7p2qL9vX0kR4zY6nB1mH3gF5cD8sA2eQ1x=' 
cipher = Fernet(SECRET_KEY)

def encrypt_date(date_str):
    """Encrypts a date string (YYYY-MM-DD) into a byte token."""
    if not date_str:
        return None
    return cipher.encrypt(date_str.encode()).decode()

def decrypt_date(token):
    """Decrypts a token back into a date string."""
    if not token:
        return None
    try:
        return cipher.decrypt(token.encode()).decode()
    except Exception:
        return None

def encrypt_password(password):
    """Encrypts a password into a reversible token."""
    if not password:
        return None
    return cipher.encrypt(password.encode()).decode()

def decrypt_password(token):
    """Decrypts a password token back into plain text."""
    if not token:
        return None
    try:
        return cipher.decrypt(token.encode()).decode()
    except Exception:
        return "Decryption Error"

def is_subscription_active(encrypted_expiry_date):
    """
    Checks if the current date is before the expiry date.
    Returns: (Boolean is_active, String expiry_date_readable)
    """
    if not encrypted_expiry_date:
        # If no date set, assume strictly locked or trial (logic choice)
        # Here we default to Active for safety, or you can default to False.
        return True, "No Limit"

    try:
        decrypted_date_str = decrypt_date(encrypted_expiry_date)
        expiry_date = datetime.strptime(decrypted_date_str, "%Y-%m-%d")
        
        if datetime.now() < expiry_date:
            return True, decrypted_date_str
        else:
            return False, decrypted_date_str
    except Exception as e:
        print(f"Crypto Error: {e}")
        return False, "Error"