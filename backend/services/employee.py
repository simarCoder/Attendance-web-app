from datetime import date
import calendar
from backend.database import get_connection

DAILY_REQUIRED_HOURS = 16

def calculate_hourly_rate(monthly_salary):
    today = date.today()
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    # Prevent division by zero
    divisor = days_in_month * DAILY_REQUIRED_HOURS
    if divisor == 0: return 0
    return round(monthly_salary / divisor, 2)

def add_employee(name, role, phone, address, monthly_salary):
    if not name or monthly_salary is None:
        raise ValueError("Name and monthly salary are required")

    monthly_salary = float(monthly_salary)
    hourly_rate = calculate_hourly_rate(monthly_salary)

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO employees (name, role, phone, address, monthly_salary, hourly_rate)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (name, role, phone, address, monthly_salary, hourly_rate))

    conn.commit()
    cursor.close()
    conn.close()

def get_all_employees():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT employee_id, name, role, phone, address, monthly_salary, status
        FROM employees
        WHERE status = 'active'
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

def get_employee_by_id(employee_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT employee_id, name, role, phone, address, monthly_salary, status
        FROM employees
        WHERE employee_id = ?
    """, (employee_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row

def update_monthly_salary(employee_id, new_monthly_salary):
    hourly_rate = calculate_hourly_rate(new_monthly_salary)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE employees
        SET monthly_salary = ?, hourly_rate = ?
        WHERE employee_id = ?
    """, (new_monthly_salary, hourly_rate, employee_id))
    conn.commit()
    cursor.close()
    conn.close()

def deactivate_employee(employee_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE employees SET status = 'inactive' WHERE employee_id = ?", (employee_id,))
    conn.commit()
    cursor.close()
    conn.close()

def delete_employee(employee_id):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Must delete related records first to avoid Foreign Key errors
    cursor.execute("DELETE FROM attendance WHERE employee_id = ?", (employee_id,))
    cursor.execute("DELETE FROM salary_cal WHERE employee_id = ?", (employee_id,))
    cursor.execute("DELETE FROM employees WHERE employee_id = ?", (employee_id,))
    
    conn.commit()
    cursor.close()
    conn.close()