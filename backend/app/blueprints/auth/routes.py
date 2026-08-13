from flask import Blueprint, request, jsonify
from app import db, limiter
from app.models import User, Driver, UserRole
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
import bcrypt
import os
import random
import string

auth_bp = Blueprint('auth', __name__)

# In-memory OTP store: {email: otp_code}
_otp_store = {}

def _generate_otp():
    return ''.join(random.choices(string.digits, k=6))


@auth_bp.route('/request-otp', methods=['POST'])
@limiter.limit("5 per minute")
def request_otp():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    if not email:
        return jsonify({"error": "validation_error", "message": "Email is required"}), 422

    otp = _generate_otp()
    _otp_store[email] = otp

    flask_env = os.environ.get('FLASK_ENV', 'development')
    if flask_env == 'development':
        print(f"[DEMO MODE] OTP for {email}: {otp}")
        return jsonify({
            "message": "OTP sent (demo mode — no email configured)",
            "demo_otp": otp
        }), 200

    # Production: send via SMTP/Twilio (not configured yet)
    return jsonify({"message": "OTP sent to your email"}), 200


@auth_bp.route('/verify-otp', methods=['POST'])
@limiter.limit("10 per minute")
def verify_otp():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    otp = data.get('otp', '').strip()
    if not email or not otp:
        return jsonify({"error": "validation_error", "message": "Email and OTP required"}), 422

    stored = _otp_store.get(email)
    if stored is None or stored != otp:
        return jsonify({"error": "invalid_otp", "message": "Invalid or expired OTP"}), 400

    return jsonify({"message": "OTP verified", "verified": True}), 200


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    required = ['email', 'name', 'phone', 'password', 'otp']
    for field in required:
        if not data.get(field):
            return jsonify({"error": "validation_error", "message": f"{field} is required"}), 422

    email = data['email'].strip().lower()
    otp = data['otp'].strip()

    # Verify OTP first
    stored = _otp_store.get(email)
    if stored is None or stored != otp:
        return jsonify({"error": "invalid_otp", "message": "Invalid or expired OTP. Please restart registration."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "conflict", "message": "An account with this email already exists"}), 409

    if User.query.filter_by(phone=data['phone']).first():
        return jsonify({"error": "conflict", "message": "An account with this phone already exists"}), 409

    pw_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user = User(
        name=data['name'],
        email=email,
        phone=data['phone'],
        password_hash=pw_hash,
        role=UserRole.driver
    )
    db.session.add(user)
    db.session.flush()  # get user.id

    # Parse dob string to date
    from datetime import datetime
    try:
        dob_date = datetime.strptime(data.get('dob'), '%Y-%m-%d').date()
    except (ValueError, TypeError):
        dob_date = None

    driver = Driver(
        user_id=user.id,
        dob=dob_date,
        address=data.get('address'),
        license_no=data.get('license_no'),
        experience_years=data.get('experience_years'),
        emergency_contact=data.get('emergency_contact'),
    )
    db.session.add(driver)
    db.session.commit()

    # Clear OTP after successful registration
    _otp_store.pop(email, None)

    return jsonify({"message": "Registration submitted. Pending admin approval.", "driver_id": driver.id}), 201


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({"error": "validation_error", "message": "Email and password required"}), 422

    user = User.query.filter_by(email=email).first()
    if user and bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        # For drivers, verify approval status
        if user.role == UserRole.driver:
            driver = Driver.query.filter_by(user_id=user.id).first()
            if driver and driver.approval_status.value != 'approved':
                return jsonify({
                    "error": "not_approved",
                    "message": f"Your account is {driver.approval_status.value}. Please wait for admin approval.",
                    "status": driver.approval_status.value
                }), 403

        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        return jsonify({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "role": user.role.value,
            "name": user.name
        }), 200

    return jsonify({"error": "invalid_credentials", "message": "Invalid email or password"}), 401


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify({"access_token": access_token}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "not_found", "message": "User not found"}), 404

    result = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role.value
    }

    if user.role == UserRole.driver:
        driver = Driver.query.filter_by(user_id=user.id).first()
        if driver:
            result["driver"] = {
                "id": driver.id,
                "approval_status": driver.approval_status.value,
                "license_no": driver.license_no,
                "experience_years": driver.experience_years,
            }
            # Include assigned vehicle
            from app.models import Vehicle
            vehicle = Vehicle.query.filter_by(assigned_driver_id=driver.id).first()
            if vehicle:
                result["driver"]["vehicle"] = {
                    "id": vehicle.id,
                    "vehicle_no": vehicle.vehicle_no,
                    "type": vehicle.type,
                    "fuel_type": vehicle.fuel_type,
                    "load_capacity_kg": vehicle.load_capacity_kg,
                    "emission_factor_g_per_km": vehicle.emission_factor_g_per_km,
                    "status": vehicle.status.value
                }

    return jsonify(result), 200
