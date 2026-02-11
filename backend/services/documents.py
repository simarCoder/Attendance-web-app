import os
from datetime import datetime
from backend.database import   get_connection

UPLOAD_FOLDER = "UPLOADS"


def get_documents_by_employee(employee_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT doc_type, adhaar_no, file_path, upload_at FROM employee_docs WHERE employee_id = ?
""", (employee_id,))
    
    docs = cursor.fetchall()

    cursor.close()
    conn.close()

    return docs
    
def add_document(employee_id, doc_type, adhaar_no, file_path):
    conn = get_connection()
    cursor = conn.cursor()

    upload_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        INSERT INTO employee_docs (employee_id, adhaar_no, doc_type, file_path, upload_at)
        VALUES (?, ?, ?, ?, ?)
    """, (employee_id, adhaar_no, doc_type, file_path, upload_time))

    conn.commit()
    cursor.close()
    conn.close()