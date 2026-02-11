from backend.database import get_connection
from datetime import datetime
import calendar



def generate_salary(employee_id, month):
    """
    Generate or update salary for a given employee and month (YYYY-MM).

    Rules:
    - During the month → salary is editable and regeneratable.
    - After month ends → salary auto-locks.
    - If locked → cannot regenerate.
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
    # 3️⃣ Get hourly rate
    # ------------------------------------
    cursor.execute("""
        SELECT hourly_rate
        FROM employees
        WHERE employee_id = ?
    """, (employee_id,))

    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        raise Exception("Employee not found")

    hourly_rate_snapshot = row[0] if row[0] else 0.0

    # ------------------------------------
    # 4️⃣ Calculate salary
    # ------------------------------------
    total_salary = round(total_hours * hourly_rate_snapshot, 2)

    # ------------------------------------
    # 5️⃣ Determine lock status
    # ------------------------------------
    year, month_num = map(int, month.split("-"))
    last_day = calendar.monthrange(year, month_num)[1]
    last_date = datetime(year, month_num, last_day)
    today = datetime.now()

    if today > last_date:
        lock_value = 1   # Auto lock after month ends
    else:
        lock_value = 0   # Editable during month

    # ------------------------------------
    # 6️⃣ Insert or Update salary record
    # ------------------------------------
    if existing:
        salary_id, locked = existing

        if locked == 1:
            cursor.close()
            conn.close()
            raise Exception("Salary already locked for this month")

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
