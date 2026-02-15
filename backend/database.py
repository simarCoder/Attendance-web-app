import sqlite3

DB_PATH = "db/attendance.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def employee_db():
    conn = get_connection()
    cursor = conn.cursor()

    # =========================
    # EMPLOYEE RECORDS
    # =========================
    cursor.execute ('''
    CREATE TABLE IF NOT EXISTS employees (
        employee_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT,
        phone TEXT,
        address TEXT,
        hourly_rate NUMERIC,
        monthly_salary REAL NOT NULL,
        status TEXT DEFAULT 'active'
    )
    ''')

    # =========================
    # ATTENDANCE
    # =========================
    cursor.execute ("""
        CREATE TABLE IF NOT EXISTS attendance (
            attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL, 
            date TEXT NOT NULL,
            check_in TEXT,
            check_out TEXT,
            worked_hours REAL,
            locked INTEGER DEFAULT 0,
            FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        )
    """)

    # =========================
    # SALARY
    # =========================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS salary_cal(
            salary_id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            month TEXT NOT NULL,
            total_hours REAL,
            hourly_rate_snapshot REAL,
            total_salary REAL,
            locked INTEGER DEFAULT 0,
            FOREIGN KEY (employee_id) REFERENCES employees(employee_id)   
        )
    """)
    
    # =========================
    # USERS
    # =========================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users(
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL
        )
    """)
    
    # Seed ADMIN and HEAD (Developer)
    cursor.execute("""
        INSERT OR IGNORE INTO users (username, password_hash, role)
        VALUES ('admin', 'admin', 'admin')
    """)

    cursor.execute("""
        INSERT OR IGNORE INTO users (username, password_hash, role)
        VALUES ('developer', 'DEV1234', 'head')
    """)

    # =========================
    # SYSTEM SETTINGS (New)
    # =========================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_settings(
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT NOT NULL
        )
    """)

    # Seed Default Working Hours (16)
    cursor.execute("""
        INSERT OR IGNORE INTO system_settings (setting_key, setting_value)
        VALUES ('daily_hours', '16')
    """)

    # =========================
    # DOCUMENT TABLES
    # =========================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS employee_docs(
            doc_id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER,
            adhaar_no INTEGER NOT NULL,
            doc_type TEXT NOT NULL,
            file_path TEXT,
            upload_at TEXT,
            FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        )
    """)
    
    # =========================
    # AUDIT LOGS
    # =========================
    cursor.execute("""  
        CREATE TABLE IF NOT EXISTS audit_logs(
                log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                entity TEXT,
                timestamp TEXT NOT NULL,
                reason TEXT,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    """)

    conn.commit()
    cursor.close()
    conn.close()

if __name__ == "__main__":
    employee_db()