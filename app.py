import re
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory
import database
import predictor

app = Flask(__name__, static_folder="static", static_url_path="")

# Initialize database
database.init_db()

EMAIL_REGEX = r"(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)"

def validate_patient_data(data):
    """
    Validates incoming patient data.
    Returns (is_valid, error_message, cleaned_data).
    """
    name = data.get("name", "").strip()
    dob = data.get("dob", "").strip()
    email = data.get("email", "").strip()
    glucose = data.get("glucose")
    haemoglobin = data.get("haemoglobin")
    cholesterol = data.get("cholesterol")

    if not name:
        return False, "Full Name is required.", None

    if not dob:
        return False, "Date of Birth is required.", None
    try:
        birth_date = datetime.strptime(dob, "%Y-%m-%d")
        if birth_date > datetime.today():
            return False, "Date of Birth cannot be a future date.", None
    except ValueError:
        return False, "Date of Birth must be in YYYY-MM-DD format.", None

    if not email:
        return False, "Email Address is required.", None
    if not re.match(EMAIL_REGEX, email):
        return False, "Invalid email address format.", None

    try:
        gl = float(glucose)
        if gl < 0:
            return False, "Glucose value cannot be negative.", None
    except (ValueError, TypeError):
        return False, "Glucose must be a valid number.", None

    try:
        hb = float(haemoglobin)
        if hb < 0:
            return False, "Haemoglobin value cannot be negative.", None
    except (ValueError, TypeError):
        return False, "Haemoglobin must be a valid number.", None

    try:
        ch = float(cholesterol)
        if ch < 0:
            return False, "Cholesterol value cannot be negative.", None
    except (ValueError, TypeError):
        return False, "Cholesterol must be a valid number.", None

    cleaned_data = {
        "name": name,
        "dob": dob,
        "email": email,
        "glucose": gl,
        "haemoglobin": hb,
        "cholesterol": ch
    }
    return True, None, cleaned_data

@app.route("/")
def index():
    return app.send_static_file("index.html")

@app.route("/api/patients", methods=["GET"])
def get_patients():
    try:
        patients = database.get_all_patients()
        return jsonify(patients), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve patients: {str(e)}"}), 500

@app.route("/api/patients/<int:patient_id>", methods=["GET"])
def get_patient(patient_id):
    try:
        patient = database.get_patient(patient_id)
        if not patient:
            return jsonify({"error": "Patient record not found."}), 404
        return jsonify(patient), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve patient: {str(e)}"}), 500

@app.route("/api/patients", methods=["POST"])
def create_patient():
    try:
        data = request.get_json() or {}
        is_valid, err_msg, cleaned = validate_patient_data(data)
        if not is_valid:
            return jsonify({"error": err_msg}), 400

        # Predict status and generate remarks
        prediction = predictor.predict_health_status(
            cleaned["glucose"],
            cleaned["haemoglobin"],
            cleaned["cholesterol"],
            cleaned["dob"]
        )

        patient_id = database.add_patient(
            name=cleaned["name"],
            dob=cleaned["dob"],
            email=cleaned["email"],
            glucose=cleaned["glucose"],
            haemoglobin=cleaned["haemoglobin"],
            cholesterol=cleaned["cholesterol"],
            remarks=prediction["remarks"]
        )

        new_patient = database.get_patient(patient_id)
        return jsonify(new_patient), 201
    except Exception as e:
        return jsonify({"error": f"Failed to create patient: {str(e)}"}), 500

@app.route("/api/patients/<int:patient_id>", methods=["PUT"])
def update_patient(patient_id):
    try:
        data = request.get_json() or {}
        is_valid, err_msg, cleaned = validate_patient_data(data)
        if not is_valid:
            return jsonify({"error": err_msg}), 400

        existing_patient = database.get_patient(patient_id)
        if not existing_patient:
            return jsonify({"error": "Patient record not found."}), 404

        # Predict status and generate remarks
        prediction = predictor.predict_health_status(
            cleaned["glucose"],
            cleaned["haemoglobin"],
            cleaned["cholesterol"],
            cleaned["dob"]
        )

        updated = database.update_patient(
            patient_id=patient_id,
            name=cleaned["name"],
            dob=cleaned["dob"],
            email=cleaned["email"],
            glucose=cleaned["glucose"],
            haemoglobin=cleaned["haemoglobin"],
            cholesterol=cleaned["cholesterol"],
            remarks=prediction["remarks"]
        )

        if not updated:
            return jsonify({"error": "Failed to update patient record."}), 500

        updated_patient = database.get_patient(patient_id)
        return jsonify(updated_patient), 200
    except Exception as e:
        return jsonify({"error": f"Failed to update patient: {str(e)}"}), 500

@app.route("/api/patients/<int:patient_id>", methods=["DELETE"])
def delete_patient(patient_id):
    try:
        existing_patient = database.get_patient(patient_id)
        if not existing_patient:
            return jsonify({"error": "Patient record not found."}), 404

        deleted = database.delete_patient(patient_id)
        if not deleted:
            return jsonify({"error": "Failed to delete patient record."}), 500

        return jsonify({"message": "Patient record successfully deleted.", "id": patient_id}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to delete patient: {str(e)}"}), 500

if __name__ == "__main__":
    # In production, uvicorn/gunicorn is standard, but for this dev setup running python app.py directly is ideal.
    app.run(host="127.0.0.1", port=5000, debug=True)
