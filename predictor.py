from datetime import datetime

def calculate_age(dob_str):
    """
    Calculates age based on Date of Birth string (YYYY-MM-DD).
    Returns 0 if calculation fails.
    """
    try:
        birth_date = datetime.strptime(dob_str, "%Y-%m-%d")
        today = datetime.today()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return age
    except Exception:
        return 0

def predict_health_status(glucose, haemoglobin, cholesterol, dob):
    """
    Analyzes patient blood test results (glucose, haemoglobin, cholesterol) and DOB.
    Returns a dictionary with status, key findings, and a text remark.
    """
    # Parse inputs to float
    try:
        g = float(glucose)
        h = float(haemoglobin)
        c = float(cholesterol)
    except ValueError:
        return {
            "status": "Error",
            "remarks": "Invalid blood test metrics. Values must be numeric."
        }

    age = calculate_age(dob)
    findings = []
    alerts = 0
    warnings = 0

    # 1. Glucose Analysis (mg/dL)
    glucose_status = "Normal"
    if g < 70:
        glucose_status = "Low"
        findings.append("Hypoglycemia risk (Low Glucose)")
        warnings += 1
    elif 70 <= g <= 100:
        glucose_status = "Normal"
    elif 100 < g <= 125:
        glucose_status = "Prediabetes"
        findings.append("Impaired Fasting Glucose (Prediabetes)")
        warnings += 1
    else:
        glucose_status = "Diabetes Risk"
        findings.append("Hyperglycemia (High Diabetes Risk)")
        alerts += 1

    # 2. Haemoglobin Analysis (g/dL)
    haemoglobin_status = "Normal"
    if h < 12.0:
        haemoglobin_status = "Low"
        findings.append("Anemia Risk (Low Haemoglobin)")
        warnings += 1
    elif 12.0 <= h <= 17.5:
        haemoglobin_status = "Normal"
    else:
        haemoglobin_status = "High"
        findings.append("Polycythemia Risk (High Haemoglobin)")
        warnings += 1

    # 3. Cholesterol Analysis (mg/dL)
    cholesterol_status = "Normal"
    if c < 200:
        cholesterol_status = "Optimal"
    elif 200 <= c <= 239:
        cholesterol_status = "Borderline High"
        findings.append("Borderline High Cholesterol")
        warnings += 1
    else:
        cholesterol_status = "High"
        findings.append("High Cholesterol (Cardiovascular Risk)")
        alerts += 1

    # 4. Synergistic Risks
    synergy = []
    if glucose_status == "Diabetes Risk" and cholesterol_status == "High":
        synergy.append("High risk of Metabolic Syndrome")
        alerts += 1
    elif (glucose_status == "Prediabetes" or glucose_status == "Diabetes Risk") and cholesterol_status == "Borderline High":
        synergy.append("Moderate metabolic/cardiac risk")
        warnings += 1

    if age > 45 and (cholesterol_status in ["Borderline High", "High"] or glucose_status in ["Prediabetes", "Diabetes Risk"]):
        synergy.append("Age-related elevated cardiovascular risk")
        warnings += 1

    # Construct the remarks string
    if alerts > 0:
        overall_status = "CRITICAL"
        status_symbol = "🚨"
    elif warnings > 0:
        overall_status = "WARNING"
        status_symbol = "⚠️"
    else:
        overall_status = "HEALTHY"
        status_symbol = "✅"

    # Merge standard findings and synergies
    all_points = findings + synergy
    if not all_points:
        remarks = f"{status_symbol} Healthy: All parameters are within normal reference ranges."
    else:
        remarks = f"{status_symbol} {overall_status}: " + "; ".join(all_points) + "."

    return {
        "status": overall_status,
        "remarks": remarks
    }
