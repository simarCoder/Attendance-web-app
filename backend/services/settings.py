from backend.database import get_connection
from backend.services.employee import recalculate_all_employee_rates

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

# --- HELPER: ENFORCE CONTIGUOUS IDS (1, 2, 3...) ---
def _renumber_users(cursor):
    """
    Internal helper to reorder User IDs to be contiguous (1, 2, 3...).
    This effectively resets the 'gap' left by deletions or auto-increment jumps.
    """
    cursor.execute("PRAGMA foreign_keys = OFF")
    
    # Get all users ordered by their current ID
    cursor.execute("SELECT user_id FROM users ORDER BY user_id ASC")
    users = cursor.fetchall()
    
    for index, user in enumerate(users):
        current_id = user[0]
        expected_id = index + 1
        
        if current_id != expected_id:
            cursor.execute("UPDATE users SET user_id = ? WHERE user_id = ?", (expected_id, current_id))
            # Optional: If you had an audit_logs table linked, update it here too.
            # cursor.execute("UPDATE audit_logs SET user_id = ? WHERE user_id = ?", (expected_id, current_id))

    # Reset the internal SQLite AutoIncrement counter to the new count
    cursor.execute("DELETE FROM sqlite_sequence WHERE name='users'")
    cursor.execute("INSERT INTO sqlite_sequence (name, seq) VALUES ('users', ?)", (len(users),))
    
    cursor.execute("PRAGMA foreign_keys = ON")

def add_system_user(username, password, role):
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Check if username exists
    cursor.execute("SELECT user_id FROM users WHERE username = ?", (username,))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        raise ValueError("Username already exists")

    # 2. Insert User
    cursor.execute("""
        INSERT INTO users (username, password_hash, role)
        VALUES (?, ?, ?)
    """, (username, password, role))
    
    # 3. FIX: Renumber immediately to fix gaps (e.g., changing 28 -> 3)
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
    """
    Deletes a user and reorders IDs.
    Constraints:
    1. Cannot delete self.
    2. Cannot delete the last remaining HEAD account.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # --- CHECK 1: GET TARGET INFO ---
    cursor.execute("SELECT role FROM users WHERE user_id = ?", (target_user_id,))
    target = cursor.fetchone()
    
    if not target:
        cursor.close()
        conn.close()
        raise ValueError("User not found")
        
    target_role = target[0]

    # --- CHECK 2: SELF DELETION ---
    if current_user_id_requesting and str(target_user_id) == str(current_user_id_requesting):
        cursor.close()
        conn.close()
        raise ValueError("You cannot delete your own account while logged in.")

    # --- CHECK 3: LAST HEAD STANDING ---
    if target_role == 'head':
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'head'")
        head_count = cursor.fetchone()[0]
        
        if head_count <= 1:
            cursor.close()
            conn.close()
            raise ValueError("Cannot delete the only remaining Head/Developer account.")

    # --- EXECUTE DELETE ---
    cursor.execute("DELETE FROM users WHERE user_id = ?", (target_user_id,))
    
    # --- EXECUTE REORDERING ---
    _renumber_users(cursor)
    
    conn.commit()
    cursor.close()
    conn.close()