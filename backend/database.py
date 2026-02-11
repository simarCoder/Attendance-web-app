import sqlite3

DB_PATH = "db/attendance.db"

def get_connection():
    """
    Docstring for get_connection

    returns a SQLite connection with foreign keys enabled.
    This function must be used everywhere.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def employee_db():

    """
    Docstring for employee_db

    Creates all required tables if they do not exist.
    Run this once at application startup.
    """
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
    # ATTENDANCE (DAILY RECORDS)
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
                    FOREIGN KEY (employee_id) REFERENCES employees(employee_id))
            """)

    # =========================
    # SALARY (MONTHLY SNAPSHOT)
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
    # USERS (ROLE BASED ACCESS)
    # =========================

    cursor.execute("""
            CREATE TABLE IF NOT EXISTS users(
                   user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                   username TEXT UNIQUE NOT NULL,
                   password_hash TEXT NOT NULL,
                   role TEXT NOT NULL)
            """)
    
    # =========================
    # AUDIT LOG (TRACEABILITY)
    # =========================
    cursor.execute("""  
        CREATE TABLE IF NOT EXISTS audit_logs(
                log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                entity TEXT,
                timestamp TEXT NOT NULL,
                reason TEXT,
                FOREIGN KEY (user_id)
                    REFERENCES users(user_id)
                   )

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

    conn.commit()
    cursor.close()
    conn.close()
if __name__ == "__main__":
    employee_db()