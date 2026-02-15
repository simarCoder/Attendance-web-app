from datetime import date
import calendar
from backend.database import get_connection

def get_daily_required_hours():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'daily_hours'")
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return float(row[0]) if row else 16.0

def calculate_hourly_rate(monthly_salary):
    today = date.today()
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    
    # Fetch dynamic hours from DB
    required_hours = get_daily_required_hours()
    
    # Prevent division by zero
    divisor = days_in_month * required_hours
    if divisor == 0: return 0
    return round(monthly_salary / divisor, 2)

# NEW: Helper to refresh everyone's rate when settings change
def recalculate_all_employee_rates():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT employee_id, monthly_salary FROM employees")
    employees = cursor.fetchall()
    
    for emp in employees:
        emp_id = emp[0]
        salary = emp[1]
        new_rate = calculate_hourly_rate(salary)
        
        cursor.execute("UPDATE employees SET hourly_rate = ? WHERE employee_id = ?", (new_rate, emp_id))
        
    conn.commit()
    cursor.close()
    conn.close()

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
    
    cursor.execute("DELETE FROM attendance WHERE employee_id = ?", (employee_id,))
    cursor.execute("DELETE FROM salary_cal WHERE employee_id = ?", (employee_id,))
    cursor.execute("DELETE FROM employee_docs WHERE employee_id = ?", (employee_id,))
    cursor.execute("DELETE FROM employees WHERE employee_id = ?", (employee_id,))
    
    conn.commit()
    cursor.close()
    conn.close()