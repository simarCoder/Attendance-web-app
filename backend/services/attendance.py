from datetime import datetime, date
from backend.database import get_connection


def check_in(employee_id, custom_time=None, target_date=None):
    # Use target_date if provided (Admin/Head), else today
    today = target_date if target_date else date.today().isoformat()
    
    # Use custom time if provided (Head Override), else current time
    if custom_time:
        # Ensure format allows adding minutes/seconds if user only sent HH:MM
        if len(custom_time) == 5: # HH:MM
            custom_time += ":00"
        now = custom_time
    else:
        now = datetime.now().strftime("%H:%M:%S")

    conn = get_connection()
    cursor = conn.cursor()

    # Check if already checked in for the target date
    cursor.execute("""
        SELECT attendance_id, check_out, locked
        FROM attendance
        WHERE employee_id = ? AND date = ?
    """, (employee_id, today))

    existing_record = cursor.fetchone()

    if existing_record:
        attendance_id, current_check_out, locked = existing_record
        
        # If custom_time is provided (Head override), allow update even if record exists/locked
        if custom_time:
            # Update the check_in time
            cursor.execute("""
                UPDATE attendance
                SET check_in = ?
                WHERE attendance_id = ?
            """, (now, attendance_id))
            
            # If there was already a check-out, recalculate worked hours based on new check-in
            if current_check_out:
                try:
                    check_in_dt = datetime.strptime(now, "%H:%M:%S")
                    check_out_dt = datetime.strptime(current_check_out, "%H:%M:%S")
                    
                    if check_out_dt < check_in_dt:
                         # If new in-time is after out-time, this is invalid for a single day shift.
                         # We allow the update but worked hours will be negative or zero.
                         worked_hours = 0.0
                    else:
                        worked_hours = (check_out_dt - check_in_dt).seconds / 3600
                        
                    cursor.execute("UPDATE attendance SET worked_hours = ? WHERE attendance_id = ?", (worked_hours, attendance_id))
                except ValueError:
                    pass # Ignore time format errors during recalc

        else:
            # Standard user trying to check in again
            cursor.close()
            conn.close()
            raise Exception("Already checked in for this date")
    else:
        # New record
        cursor.execute("""
            INSERT INTO attendance (employee_id, date, check_in)
            VALUES (?, ?, ?)
        """, (employee_id, today, now))

    conn.commit()
    cursor.close()
    conn.close()


def check_out(employee_id, custom_time=None, target_date=None):
    today = target_date if target_date else date.today().isoformat()
    
    # Use custom time if provided
    if custom_time:
        if len(custom_time) == 5:
            custom_time += ":00"
        now = custom_time
    else:
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
        raise Exception("No check-in found for this date")

    attendance_id, check_in_time, locked = record

    # Only allow update if NOT locked OR if it IS a custom_time override
    if locked and not custom_time:
        cursor.close()
        conn.close()
        raise Exception("Attendance record is locked")

    try:
        check_in_dt = datetime.strptime(check_in_time, "%H:%M:%S")
        check_out_dt = datetime.strptime(now, "%H:%M:%S")
        
        if check_out_dt < check_in_dt:
             # If manual checkout is earlier than checkin, set hours to 0 or raise error. 
             # Here we raise error to alert the user.
             raise ValueError("Check-out time cannot be before check-in time")

        worked_hours = (check_out_dt - check_in_dt).seconds / 3600
    except ValueError as ve:
        cursor.close()
        conn.close()
        raise Exception(f"Time Calculation Error: {str(ve)}")

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