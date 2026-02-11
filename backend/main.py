import os

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# ---DATABASE IMPORT---

from backend.database import employee_db, get_connection

# ---DOCUMENT IMPORTS---

from backend.services.documents import get_documents_by_employee, add_document

# ---EMPLOYEE SERVICE IMPORT---

from backend.services.employee import (
    add_employee,
    get_all_employees,
    update_monthly_salary,
    deactivate_employee,
    delete_employee,
    get_employee_by_id
)

# ---ATTENDANCE IMPORT---

from backend.services.attendance import (
    check_in,
    check_out,
    get_attendance_by_employee
)

# ---SALARY IMPORT---

from backend.services.salary import (
    generate_salary,
    get_salary
)

app = Flask(__name__)
CORS(app)
employee_db()

# -------------------------
# BASIC HEALTH CHECK
# -------------------------
@app.route("/")
def home():
    return "Attendance & Salary System Running"

# -------------------------
# EMPLOYEE ROUTES
# -------------------------
@app.route("/employee/add", methods=["POST"])
def add_employee_route():
    data = request.json
    try:
        add_employee(data.get("name"), data.get("role"), data.get("phone"), data.get("address"),data.get("monthly_salary"))
        return jsonify({"message": "Employee added successfully"})
    except Exception as e:
        return jsonify({"message": str(e)}), 400

@app.route("/employees", methods=["GET"])
def get_employees_route():
    employees = get_all_employees()
    result = []
    for emp in employees:
            result.append({
        "id": emp[0],
        "name": emp[1],
        "role": emp[2],
        "phone": emp[3],
        "address": emp[4],
        "monthly_salary": emp[5],
        "status": emp[6]
    })
    return jsonify(result)

@app.route("/employee/update_salary", methods=["POST"])
def update_salary_route():
    data = request.json
    update_monthly_salary(data.get("employee_id"), data.get("monthly_salary"))
    return jsonify({"message": "Salary updated successfully"})

@app.route("/employee/deactivate", methods=["POST"])
def deactivate_employee_route():
    data = request.json
    deactivate_employee(data.get("employee_id"))
    return jsonify({"message": "Employee deactivated"})


@app.route("/employee/activate", methods=["POST"])
def activate_employee_route():
    data = request.json

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE employees
        SET status = 'active'
        WHERE employee_id = ?
    """, (data.get("employee_id"),))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Employee activated"})



@app.route("/employee/delete", methods=["POST"])
def delete_employee_route():
    data = request.json
    try:
        delete_employee(data.get("employee_id"))
        return jsonify({"message": "Employee permanently deleted"})
    except Exception as e:
        return jsonify({"message": str(e)}), 400

# -------------------------
# ATTENDANCE ROUTES
# -------------------------
@app.route("/attendance/checkin", methods=["POST"])
def checkin_route():
    try:
        check_in(request.json.get("employee_id"))
        return jsonify({"message": "Check-in successful"})
    except Exception as e:
        return jsonify({"message": str(e)}), 400

@app.route("/attendance/checkout", methods=["POST"])
def checkout_route():
    try:
        check_out(request.json.get("employee_id"))
        return jsonify({"message": "Check-out successful"})
    except Exception as e:
        return jsonify({"message": str(e)}), 400

@app.route("/attendance/<int:employee_id>", methods=["GET"])
def attendance_view_route(employee_id):
    records = get_attendance_by_employee(employee_id)
    result = []
    # FIX: Corrected indices to 0, 1, 2, 3 based on SQL query
    for r in records:
        result.append({
            "date": r[0],
            "check_in": r[1],
            "check_out": r[2],
            "worked_hours": r[3]
        })
    return jsonify(result)

# -------------------------
# SALARY ROUTES
# -------------------------
@app.route("/salary/generate", methods=["POST"])
def generate_salary_route():
    data = request.json
    try:
        generate_salary(data.get("employee_id"), data.get("month"))
        return jsonify({"message": "Salary generated", "status": "new"})
    except Exception as e:
        if "already generated" in str(e):
            return jsonify({"message": "Salary already generated", "status": "exists"}), 200
        return jsonify({"message": str(e), "status": "error"}), 400

@app.route("/salary/view", methods=["GET"])
def get_salary_route():
    employee_id = request.args.get("employee_id", type=int)
    month = request.args.get("month")
    salary = get_salary(employee_id, month)
    if not salary:
        return jsonify({"error": "Salary not found"}), 404

    return jsonify({
        "employee_id": employee_id,
        "month": salary[0],
        "total_hours": salary[1],
        "hourly_rate": salary[2],
        "total_salary": salary[3],
        "locked": salary[4]
    })

@app.route("/salary/update", methods=["POST"])
def update_generated_salary_route():
    data = request.json

    employee_id = data.get("employee_id")
    month = data.get("month")
    new_salary = data.get("total_salary")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE salary_cal
        SET total_salary = ?
        WHERE employee_id = ? AND month = ? AND locked = 0
    """, (new_salary, employee_id, month))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Salary updated successfully"})



# -------------------------
# EMPLOYEE DOCUMENT ROUTES
# -------------------------

@app.route("/employee/<int:employee_id>", methods=["GET"])
def get_employee_profile(employee_id):
    emp = get_employee_by_id(employee_id)
    if not emp:
        return jsonify({"error": "Employee not found"}), 404
    return jsonify({
        "id": emp[0],
        "name": emp[1],
        "role": emp[2],
        "phone": emp[3],
        "address": emp[4],
        "monthly_salary": emp[5],
        "status": emp[6]
    })


@app.route("/employee/<int:employee_id>/documents", methods=["GET"])
def get_employee_documents(employee_id):
    docs = get_documents_by_employee(employee_id)
    result = []
    for d in docs:
        result.append({
            "doc_type": d[0],
            "adhaar_no": d[1],
            "file_path": d[2],
            "uploaded_at": d[3]
        })
    return jsonify(result)


@app.route("/employee/<int:employee_id>/documents", methods=["POST"])
def upload_employee_document(employee_id):
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    doc_type = request.form.get("doc_type")
    adhaar_no = request.form.get("adhaar_no")

    if file.filename == "":
        return jsonify({"error": "Empty file"}), 400

    # Create employee folder
    emp_folder = os.path.join("UPLOADS", f"employee_{employee_id}")
    os.makedirs(emp_folder, exist_ok=True)

    file_path = os.path.join(emp_folder, file.filename)
    file.save(file_path)

    # Save to DB
    add_document(employee_id, doc_type, adhaar_no, file_path)

    return jsonify({"message": "Document uploaded successfully"})


@app.route('/UPLOADS/<path:filename>')
def uploaded_file(filename):
    return send_from_directory('UPLOADS', filename)



if __name__ == "__main__":
    # FIX: use_reloader=False prevents server restart loop on DB write
    app.run(debug=True, use_reloader=False)