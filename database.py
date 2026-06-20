import sqlite3
import os

DB_NAME = "health_records.db"

def get_db_connection(db_path=None):
    """
    Establishes a connection to the SQLite database.
    Configures the row_factory to return sqlite3.Row objects which behave like dictionaries.
    """
    if db_path is None:
        db_path = DB_NAME
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path=None):
    """
    Initializes the SQLite database and creates the patients table if it does not exist.
    """
    if db_path is None:
        db_path = DB_NAME
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            dob TEXT NOT NULL,
            email TEXT NOT NULL,
            glucose REAL NOT NULL,
            haemoglobin REAL NOT NULL,
            cholesterol REAL NOT NULL,
            remarks TEXT
        )
    """)
    conn.commit()
    conn.close()

def add_patient(name, dob, email, glucose, haemoglobin, cholesterol, remarks, db_path=None):
    """
    Adds a new patient record to the database.
    Returns the ID of the newly inserted record.
    """
    if db_path is None:
        db_path = DB_NAME
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO patients (name, dob, email, glucose, haemoglobin, cholesterol, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (name, dob, email, float(glucose), float(haemoglobin), float(cholesterol), remarks))
    conn.commit()
    patient_id = cursor.lastrowid
    conn.close()
    return patient_id

def get_all_patients(db_path=None):
    """
    Retrieves all patient records from the database.
    """
    if db_path is None:
        db_path = DB_NAME
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patients ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_patient(patient_id, db_path=None):
    """
    Retrieves a single patient record by its ID.
    Returns None if not found.
    """
    if db_path is None:
        db_path = DB_NAME
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def update_patient(patient_id, name, dob, email, glucose, haemoglobin, cholesterol, remarks, db_path=None):
    """
    Updates an existing patient record in the database.
    Returns True if the record was successfully updated, False otherwise.
    """
    if db_path is None:
        db_path = DB_NAME
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE patients
        SET name = ?, dob = ?, email = ?, glucose = ?, haemoglobin = ?, cholesterol = ?, remarks = ?
        WHERE id = ?
    """, (name, dob, email, float(glucose), float(haemoglobin), float(cholesterol), remarks, patient_id))
    conn.commit()
    updated = cursor.rowcount > 0
    conn.close()
    return updated

def delete_patient(patient_id, db_path=None):
    """
    Deletes a patient record from the database.
    Returns True if a record was deleted, False otherwise.
    """
    if db_path is None:
        db_path = DB_NAME
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted
