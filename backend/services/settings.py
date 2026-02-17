import os
import sys
import shutil
from datetime import datetime
from backend.database import get_connection
from backend.services.employee import recalculate_all_employee_rates
from backend.utils.security import encrypt_date, decrypt_date

# ---------------------------------------------------------
# PATH LOGIC FOR PYINSTALLER
# ---------------------------------------------------------
if getattr(sys, 'frozen', False):
    # Exe Directory
    BASE_DIR = os.path.dirname(sys.executable)
else:
    # Dev Directory (Assuming services/settings.py -> go up 2 levels)
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

DB_SOURCE_PATH = os.path.join(BASE_DIR, 'db', 'attendance.db')
BACKUP_DIR = os.path.join(BASE_DIR, 'BACKUPS')

def get_working_hours():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'daily_hours'")
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return float(row[0]) if row else 16.0

def update_working_hours(new_hours):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO system_settings (setting_key, setting_value) 
        VALUES ('daily_hours', ?) 
        ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
    """, (str(new_hours),))
    conn.commit()
    cursor.close()
    conn.close()
    recalculate_all_employee_rates()

# --- BACKUP LOGIC ---
def create_database_backup():
    """
    Creates a timestamped copy of the database in the BACKUPS folder.
    """
    if not os.path.exists(DB_SOURCE_PATH):
        raise FileNotFoundError(f"Live database file not found at {DB_SOURCE_PATH}")

    # Ensure Backup Directory Exists
    os.makedirs(BACKUP_DIR, exist_ok=True)

    # Create filename: attendance_backup_YYYY-MM-DD_HH-MM-SS.db
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_filename = f"attendance_backup_{timestamp}.db"
    backup_path = os.path.join(BACKUP_DIR, backup_filename)

    # Copy the file (copy2 preserves metadata)
    shutil.copy2(DB_SOURCE_PATH, backup_path)
    
    return backup_filename

# --- SaaS SUBSCRIPTION LOGIC ---

def update_subscription_expiry(date_str):
    encrypted_val = encrypt_date(date_str)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO system_settings (setting_key, setting_value) 
        VALUES ('sub_expiry', ?) 
        ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
    """, (encrypted_val,))
    conn.commit()
    cursor.close()
    conn.close()

def get_subscription_expiry_encrypted():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'sub_expiry'")
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row[0] if row else None

# --- USER MANAGEMENT HELPERS ---

def _renumber_users(cursor):
    cursor.execute("PRAGMA foreign_keys = OFF")
    cursor.execute("SELECT user_id FROM users ORDER BY user_id ASC")
    users = cursor.fetchall()
    
    for index, user in enumerate(users):
        current_id = user[0]
        expected_id = index + 1
        if current_id != expected_id:
            cursor.execute("UPDATE users SET user_id = ? WHERE user_id = ?", (expected_id, current_id))

    cursor.execute("DELETE FROM sqlite_sequence WHERE name='users'")
    cursor.execute("INSERT INTO sqlite_sequence (name, seq) VALUES ('users', ?)", (len(users),))
    cursor.execute("PRAGMA foreign_keys = ON")

def add_system_user(username, password, role):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id FROM users WHERE username = ?", (username,))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        raise ValueError("Username already exists")

    cursor.execute("""
        INSERT INTO users (username, password_hash, role)
        VALUES (?, ?, ?)
    """, (username, password, role))
    _renumber_users(cursor)
    conn.commit()
    cursor.close()
    conn.close()

def get_all_system_users():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, username, password_hash, role FROM users ORDER BY user_id ASC")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

def update_user_password(user_id, new_password):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", (new_password, user_id))
    conn.commit()
    cursor.close()
    conn.close()

def delete_system_user(target_user_id, current_user_id_requesting=None):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT role FROM users WHERE user_id = ?", (target_user_id,))
    target = cursor.fetchone()
    
    if not target:
        cursor.close()
        conn.close()
        raise ValueError("User not found")
        
    target_role = target[0]

    if current_user_id_requesting and str(target_user_id) == str(current_user_id_requesting):
        cursor.close()
        conn.close()
        raise ValueError("You cannot delete your own account while logged in.")

    if target_role == 'head':
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'head'")
        head_count = cursor.fetchone()[0]
        if head_count <= 1:
            cursor.close()
            conn.close()
            raise ValueError("Cannot delete the only remaining Head/Developer account.")

    cursor.execute("DELETE FROM users WHERE user_id = ?", (target_user_id,))
    _renumber_users(cursor)
    
    conn.commit()
    cursor.close()
    conn.close()