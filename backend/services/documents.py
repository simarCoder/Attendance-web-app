import os
from datetime import datetime
from backend.database import   get_connection

UPLOAD_FOLDER = "UPLOADS"


def get_documents_by_employee(employee_id):
    conn = get_connection()
    cursor = conn.cursor()

    # UPDATED: Added doc_id to the selection
    cursor.execute("""
        SELECT doc_id, doc_type, adhaar_no, file_path, upload_at 
        FROM employee_docs 
        WHERE employee_id = ?
    """, (employee_id,))
    
    docs = cursor.fetchall()

    cursor.close()
    conn.close()

    return docs

def get_document_by_id(doc_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT file_path FROM employee_docs WHERE doc_id = ?", (doc_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row

def delete_document_record(doc_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM employee_docs WHERE doc_id = ?", (doc_id,))
    conn.commit()
    cursor.close()
    conn.close()
    
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