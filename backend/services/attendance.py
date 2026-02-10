from datetime import datetime, date
from backend.database import get_connection


def check_in(employee_id):
    today = date.today().isoformat()
    now = datetime.now().strftime("%H:%M:%S")

    conn = get_connection()
    cursor = conn.cursor()

    # Check if already checked in today
    cursor.execute("""
        SELECT attendance_id
        FROM attendance
        WHERE employee_id = ? AND date = ?
    """, (employee_id, today))

    if cursor.fetchone():
        cursor.close()
        conn.close()
        raise Exception("Already checked in for today")

    cursor.execute("""
        INSERT INTO attendance (employee_id, date, check_in)
        VALUES (?, ?, ?)
    """, (employee_id, today, now))

    conn.commit()
    cursor.close()
    conn.close()


def check_out(employee_id):
    today = date.today().isoformat()
    now = datetime.now().strftime("%H:%M:%S")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT attendance_id, check_in, locked
        FROM attendance
        WHERE employee_id = ? AND date = ?
    """, (employee_id, today))

    record = cursor.fetchone()

    if not record:
        cursor.close()
        conn.close()
        raise Exception("No check-in found for today")

    attendance_id, check_in_time, locked = record

    if locked:
        cursor.close()
        conn.close()
        raise Exception("Attendance record is locked")

    check_in_dt = datetime.strptime(check_in_time, "%H:%M:%S")
    check_out_dt = datetime.strptime(now, "%H:%M:%S")

    worked_hours = (check_out_dt - check_in_dt).seconds / 3600

    cursor.execute("""
        UPDATE attendance
        SET check_out = ?, worked_hours = ?
        WHERE attendance_id = ?
    """, (now, worked_hours, attendance_id))

    conn.commit()
    cursor.close()
    conn.close()


def get_attendance_by_employee(employee_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT date, check_in, check_out, worked_hours
        FROM attendance
        WHERE employee_id = ?
        ORDER BY date DESC
    """, (employee_id,))

    rows = cursor.fetchall()

    cursor.close()
    conn.close()
    return rows
