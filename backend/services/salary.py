from backend.database import get_connection
from datetime import datetime
import calendar
# Import the helper to get dynamic hours from DB
from backend.services.employee import get_daily_required_hours

def generate_salary(employee_id, month, role=None):
    """
    Generate or update salary for a given employee and month (YYYY-MM).
    If role == 'head', allows regeneration even if locked.
    """

    conn = get_connection()
    cursor = conn.cursor()

    # ------------------------------------
    # 1️⃣ Check if salary already exists
    # ------------------------------------
    cursor.execute("""
        SELECT salary_id, locked
        FROM salary_cal
        WHERE employee_id = ? AND month = ?
    """, (employee_id, month))

    existing = cursor.fetchone()

    # ------------------------------------
    # 2️⃣ Calculate total worked hours
    # ------------------------------------
    cursor.execute("""
        SELECT SUM(worked_hours)
        FROM attendance
        WHERE employee_id = ?
          AND date LIKE ?
    """, (employee_id, f"{month}-%"))

    result = cursor.fetchone()
    total_hours = result[0] if result and result[0] else 0.0

    # ------------------------------------
    # 3️⃣ Get Monthly Salary & Calculate Dynamic Rate
    # ------------------------------------
    cursor.execute("""
        SELECT monthly_salary
        FROM employees
        WHERE employee_id = ?
    """, (employee_id,))

    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        raise Exception("Employee not found")

    monthly_salary = row[0] if row[0] else 0.0

    # Calculate rate dynamically based on THIS month and CURRENT settings
    year, month_num = map(int, month.split("-"))
    days_in_month = calendar.monthrange(year, month_num)[1]
    
    # Fetch the dynamic setting from DB
    required_hours_per_day = get_daily_required_hours()

    # Avoid division by zero
    total_month_hours = days_in_month * required_hours_per_day
    if total_month_hours > 0:
        hourly_rate_snapshot = round(monthly_salary / total_month_hours, 2)
    else:
        hourly_rate_snapshot = 0.0

    # ------------------------------------
    # 4️⃣ Calculate total salary
    # ------------------------------------
    total_salary = round(total_hours * hourly_rate_snapshot, 2)

    # ------------------------------------
    # 5️⃣ Determine lock status
    # ------------------------------------
    last_day = calendar.monthrange(year, month_num)[1]
    last_date = datetime(year, month_num, last_day, 23, 59, 59)
    today = datetime.now()

    if today > last_date:
        lock_value = 1   # Auto lock after month ends
    else:
        lock_value = 0   # Editable during month

    # ------------------------------------
    # 6️⃣ Insert or Update salary record
    # ------------------------------------
    if existing:
        salary_id, current_locked_status = existing

        # Only block if it is locked AND the month has officially ended
        if current_locked_status == 1 and lock_value == 1:
            # EDGE CASE FIX: Allow HEAD to regenerate locked salary
            if role != 'head':
                cursor.close()
                conn.close()
                raise Exception("Salary already locked for this month. Only Head Developer can regenerate.")

        # Update existing draft salary
        cursor.execute("""
            UPDATE salary_cal
            SET total_hours = ?,
                hourly_rate_snapshot = ?,
                total_salary = ?,
                locked = ?
            WHERE salary_id = ?
        """, (
            total_hours,
            hourly_rate_snapshot,
            total_salary,
            lock_value,
            salary_id
        ))

    else:
        # Insert new salary record
        cursor.execute("""
            INSERT INTO salary_cal (
                employee_id,
                month,
                total_hours,
                hourly_rate_snapshot,
                total_salary,
                locked
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            employee_id,
            month,
            total_hours,
            hourly_rate_snapshot,
            total_salary,
            lock_value
        ))

    conn.commit()
    cursor.close()
    conn.close()


def get_salary(employee_id, month):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT month,
                total_hours,
                hourly_rate_snapshot,
                total_salary,
                locked
        FROM salary_cal
        WHERE employee_id = ? AND month = ?
    """, (employee_id, month))

    row = cursor.fetchone()

    cursor.close()
    conn.close()
    return row

def update_salary_details(employee_id, month, new_salary, role):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check current lock status
    cursor.execute("SELECT locked FROM salary_cal WHERE employee_id = ? AND month = ?", (employee_id, month))
    row = cursor.fetchone()
    
    if not row:
        cursor.close()
        conn.close()
        raise Exception("Salary record not found")
        
    is_locked = row[0]
    
    # GOD MODE LOGIC: If role is 'head', allow update even if locked.
    if is_locked == 1 and role != 'head':
        cursor.close()
        conn.close()
        raise Exception("Salary is locked. Only Head Developer can edit.")

    cursor.execute("""
        UPDATE salary_cal
        SET total_salary = ?
        WHERE employee_id = ? AND month = ?
    """, (new_salary, employee_id, month))
    
    conn.commit()
    cursor.close()
    conn.close()