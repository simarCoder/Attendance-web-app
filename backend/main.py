import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# ---DATABASE IMPORT---
from backend.database import employee_db, get_connection

# ---DOCUMENT IMPORTS---
from backend.services.documents import (
    get_documents_by_employee, 
    add_document, 
    get_document_by_id, 
    delete_document_record
)

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
    get_salary,
    update_salary_details
)

# ---SETTINGS IMPORT---
from backend.services.settings import (
    get_working_hours,
    update_working_hours,
    add_system_user,
    get_all_system_users,
    update_user_password,
    delete_system_user
)

app = Flask(__name__)
CORS(app)

# Initialize DB
employee_db()

# Define Absolute Path for Uploads
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'UPLOADS')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# -------------------------
# BASIC HEALTH CHECK
# -------------------------
@app.route("/")
def home():
    return "Attendance & Salary System Running"

# -------------------------
# LOGIN ROUTES
# -------------------------
@app.route("/login", methods=["POST"])
def login_route():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT user_id, role
        FROM users
        WHERE username = ? AND password_hash = ?
    """, (username, password))

    user = cursor.fetchone()

    cursor.close()
    conn.close()

    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    return jsonify({
        "user_id": user[0],
        "role": user[1]
    })

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
        # Pass Role to allow Head Override
        generate_salary(data.get("employee_id"), data.get("month"), data.get("role"))
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
    try:
        update_salary_details(
            data.get("employee_id"), 
            data.get("month"), 
            data.get("total_salary"),
            data.get("role") 
        )
        return jsonify({"message": "Salary updated successfully"})
    except Exception as e:
        return jsonify({"message": str(e)}), 400

# -------------------------
# DOCUMENT ROUTES
# -------------------------
@app.route("/employee/<int:employee_id>/documents", methods=["GET"])
def get_employee_documents_route(employee_id):
    docs = get_documents_by_employee(employee_id)
    result = []
    
    for d in docs:
        doc_id = d[0]
        file_path_db = d[3]
        
        # Auto-Cleanup
        abs_path = os.path.join(BASE_DIR, file_path_db)
        if not os.path.exists(abs_path):
            print(f"⚠️ File missing for doc #{doc_id}, auto-cleaning record.")
            delete_document_record(doc_id)
            continue
            
        result.append({
            "doc_id": d[0],
            "doc_type": d[1],
            "adhaar_no": d[2],
            "file_path": d[3],
            "uploaded_at": d[4]
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

    emp_folder = os.path.join(UPLOAD_FOLDER, f"employee_{employee_id}")
    os.makedirs(emp_folder, exist_ok=True)
    
    file_path = os.path.join(emp_folder, file.filename)
    file.save(file_path)

    db_path = os.path.join("UPLOADS", f"employee_{employee_id}", file.filename)
    
    add_document(employee_id, doc_type, adhaar_no, db_path)
    return jsonify({"message": "Document uploaded successfully"})

@app.route("/documents/delete", methods=["POST"])
def delete_document_route_api():
    data = request.json
    doc_id = data.get("doc_id")
    
    if not doc_id:
        return jsonify({"error": "Missing Doc ID"}), 400
        
    doc = get_document_by_id(doc_id)
    if not doc:
        return jsonify({"message": "Document not found"}), 404
        
    file_path_db = doc[0]
    delete_document_record(doc_id)
    
    try:
        abs_path = os.path.join(BASE_DIR, file_path_db)
        if os.path.exists(abs_path):
            os.remove(abs_path)
    except Exception as e:
        print(f"Error deleting file: {e}")
        
    return jsonify({"message": "Document deleted successfully"})

@app.route('/UPLOADS/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# -------------------------
# SETTINGS ROUTES
# -------------------------
@app.route("/settings/hours", methods=["GET"])
def get_hours_route():
    try:
        hours = get_working_hours()
        return jsonify({"hours": hours})
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@app.route("/settings/hours", methods=["POST"])
def update_hours_route():
    try:
        update_working_hours(request.json.get("hours"))
        return jsonify({"message": "Working hours updated"})
    except Exception as e:
        return jsonify({"message": str(e)}), 400

@app.route("/users/add", methods=["POST"])
def add_user_route():
    data = request.json
    try:
        add_system_user(data.get("username"), data.get("password"), data.get("role"))
        return jsonify({"message": "User added successfully"})
    except Exception as e:
        return jsonify({"message": str(e)}), 400

@app.route("/users", methods=["GET"])
def get_users_route():
    try:
        users = get_all_system_users()
        result = [{"id": u[0], "username": u[1], "password": u[2], "role": u[3]} for u in users]
        return jsonify(result)
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@app.route("/users/password", methods=["POST"])
def update_password_route():
    data = request.json
    try:
        update_user_password(data.get("user_id"), data.get("password"))
        return jsonify({"message": "Password updated"})
    except Exception as e:
        return jsonify({"message": str(e)}), 400

@app.route("/users/delete", methods=["POST"])
def delete_user_route():
    data = request.json
    try:
        delete_system_user(data.get("user_id"), data.get("current_user_id"))
        return jsonify({"message": "User deleted and IDs reordered"})
    except Exception as e:
        return jsonify({"message": str(e)}), 400

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)