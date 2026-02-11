from backend.database import get_connection
from datetime import datetime
import calendar



def generate_salary(employee_id, month):
    """
    Generates salary for one employee for a given month (YYYY-MM).
    Uses salary_cal table.
    """


    
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Check if salary already generated
    cursor.execute("""
        SELECT salary_id
        FROM salary_cal
        WHERE employee_id = ? AND month = ?
    """, (employee_id, month))

    if cursor.fetchone():
        cursor.close()
        conn.close()
        raise Exception("Salary already generated for this month")

    # 2. Sum worked hours from attendance
    cursor.execute("""
        SELECT SUM(worked_hours)
        FROM attendance
        WHERE employee_id = ?
          AND date LIKE ?
          AND locked = 0
    """, (employee_id, f"{month}-%"))

    result = cursor.fetchone()
    total_hours = result[0] if result and result[0] else 0.0

    # 3. Fetch hourly rate from employee
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

    hourly_rate_snapshot = row[0]

    # 4. Calculate salary
    total_salary = round(total_hours * hourly_rate_snapshot, 2)

    # 5. Insert salary snapshot
    cursor.execute("""
        INSERT INTO salary_cal (
            employee_id,
            month,
            total_hours,
            hourly_rate_snapshot,
            total_salary,
            locked
        )
        VALUES (?, ?, ?, ?, ?, 1)
    """, (
        employee_id,
        month,
        total_hours,
        hourly_rate_snapshot,
        total_salary
    ))

    # 6. Lock attendance for this month
    cursor.execute("""
        UPDATE attendance
        SET locked = 1
        WHERE employee_id = ?
          AND date LIKE ?
    """, (employee_id, f"{month}-%"))

    conn.commit()
    cursor.close()
    conn.close()


def get_salary(employee_id, month):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT month, total_hours, hourly_rate_snapshot, total_salary
        FROM salary_cal
        WHERE employee_id = ? AND month = ?
    """, (employee_id, month))

    row = cursor.fetchone()

    cursor.close()
    conn.close()
    return row