import hashlib
import hmac
import os
import re
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import (create_access_token, create_refresh_token, jwt_required,
                                get_jwt_identity, verify_jwt_in_request)
from flask_jwt_extended.utils import decode_token
from sqlalchemy.exc import IntegrityError

from app import db, limiter
from app.models import User, Driver, UserRole, UserStatus, Vehicle
from app.models.email_otp import EmailOtp
from app.utils.mailer import MailError, send_email, otp_email_html
from app.utils.rbac import role_required

auth_bp = Blueprint('auth', __name__)

OTP_TTL = timedelta(minutes=5)
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN = 60  # seconds

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]{2,}$')
PHONE_RE = re.compile(r'^\d{10}$')
LICENSE_RE = re.compile(r'^[A-Z0-9-]{8,20}$')
ALLOWED_DOCS = {'.pdf': b'%PDF', '.png': b'\x89PNG', '.jpg': b'\xff\xd8\xff', '.jpeg': b'\xff\xd8\xff'}
MAX_DOC_BYTES = 5 * 1024 * 1024


# ── helpers ──────────────────────────────────────────────────────────────────

def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _err(code, message, http, **extra):
    return jsonify({'error': code, 'message': message, **extra}), http


def _payload():
    """Accept JSON or multipart form data."""
    if request.is_json:
        return request.get_json(silent=True) or {}
    return request.form.to_dict()


def _email_of(data):
    return str(data.get('email') or '').strip().lower()


def _hash_code(email, purpose, code):
    key = current_app.config['SECRET_KEY'].encode()
    return hmac.new(key, f'{email}:{purpose}:{code}'.encode(), hashlib.sha256).hexdigest()


def _password_problem(pw):
    if len(pw) < 8:
        return 'Password must be at least 8 characters'
    if len(pw.encode('utf-8')) > 72:
        return 'Password is too long (max 72 bytes)'
    if not re.search(r'[A-Za-z]', pw) or not re.search(r'\d', pw):
        return 'Password must contain at least one letter and one number'
    return None


def _hash_pw(pw):
    return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def _issue_otp(email, purpose, heading, intro):
    """Create + email a fresh code. Returns (ok, http_error_tuple_or_None)."""
    existing = EmailOtp.query.filter_by(email=email, purpose=purpose).first()
    if existing:
        age = (_now() - existing.created_at).total_seconds()
        if age < OTP_RESEND_COOLDOWN:
            wait = int(OTP_RESEND_COOLDOWN - age) + 1
            return False, _err('too_soon', f'Please wait {wait}s before requesting another code', 429, retry_after=wait)
        db.session.delete(existing)
        db.session.flush()

    code = f'{secrets.randbelow(10**6):06d}'
    row = EmailOtp(email=email, purpose=purpose, code_hash=_hash_code(email, purpose, code),
                   expires_at=_now() + OTP_TTL)
    db.session.add(row)
    db.session.commit()
    try:
        send_email(email, 'Your GoGreen verification code', otp_email_html(code, heading, intro))
    except MailError as exc:
        current_app.logger.error('OTP email failed: %s', exc)
        db.session.delete(row)
        db.session.commit()
        return False, _err('email_unavailable', 'We could not send the email right now. Please try again shortly.', 503)
    return True, None


def _check_otp(email, purpose, code, consume=False):
    """Returns (ok, error_tuple_or_None). Wrong guesses are counted; too many burns the code."""
    code = str(code or '').strip()
    row = EmailOtp.query.filter_by(email=email, purpose=purpose).first()
    if not row or row.expires_at < _now():
        if row:
            db.session.delete(row)
            db.session.commit()
        return False, _err('invalid_otp', 'Code expired or not found. Request a new one.', 400)
    if row.attempts >= OTP_MAX_ATTEMPTS:
        db.session.delete(row)
        db.session.commit()
        return False, _err('otp_locked', 'Too many wrong attempts. Request a new code.', 400)
    if not (len(code) == 6 and code.isdigit()) or not hmac.compare_digest(row.code_hash, _hash_code(email, purpose, code)):
        row.attempts += 1
        db.session.commit()
        left = max(0, OTP_MAX_ATTEMPTS - row.attempts)
        return False, _err('invalid_otp', f'Incorrect code. {left} attempt(s) left.', 400)
    if consume:
        db.session.delete(row)
    return True, None


def _save_license_doc(file):
    if not file or not file.filename:
        return None, 'License document is required'
    ext = os.path.splitext(file.filename.lower())[1]
    if ext not in ALLOWED_DOCS:
        return None, 'License document must be a PDF, JPG or PNG'
    blob = file.read(MAX_DOC_BYTES + 1)
    if len(blob) > MAX_DOC_BYTES:
        return None, 'License document must be 5 MB or smaller'
    if not blob.startswith(ALLOWED_DOCS[ext]):
        return None, 'License document content does not match its file type'
    folder = os.environ.get('UPLOAD_DIR') or os.path.join(current_app.instance_path, 'uploads')
    os.makedirs(folder, exist_ok=True)
    name = secrets.token_hex(16) + ext
    with open(os.path.join(folder, name), 'wb') as fh:
        fh.write(blob)
    return name, None


# ── registration ─────────────────────────────────────────────────────────────

@auth_bp.route('/send-otp', methods=['POST'])
@limiter.limit('5 per minute')
def send_otp():
    email = _email_of(request.get_json(silent=True) or {})
    if not EMAIL_RE.match(email):
        return _err('validation_error', 'Enter a valid email address', 422)
    if User.query.filter_by(email=email).first():
        return _err('conflict', 'An account with this email already exists. Please sign in.', 409)
    ok, error = _issue_otp(email, 'register', 'Verify your email',
                           'Use this code to continue your driver registration.')
    if not ok:
        return error
    return jsonify({'message': 'Verification code sent to your email', 'expires_in': int(OTP_TTL.total_seconds()),
                    'resend_after': OTP_RESEND_COOLDOWN}), 200


@auth_bp.route('/verify-otp', methods=['POST'])
@limiter.limit('10 per minute')
def verify_otp():
    data = request.get_json(silent=True) or {}
    email = _email_of(data)
    ok, error = _check_otp(email, 'register', data.get('otp'))
    if not ok:
        return error
    return jsonify({'message': 'Email verified', 'verified': True}), 200


@auth_bp.route('/register', methods=['POST'])
@limiter.limit('10 per hour')
def register():
    data = _payload()
    email = _email_of(data)
    name = str(data.get('name') or '').strip()
    phone = str(data.get('phone') or '').strip()
    password = str(data.get('password') or '')
    license_no = str(data.get('license_no') or '').strip().upper()

    if not EMAIL_RE.match(email):
        return _err('validation_error', 'Enter a valid email address', 422)
    if not 2 <= len(name) <= 100:
        return _err('validation_error', 'Full name is required', 422)
    if not PHONE_RE.match(phone):
        return _err('validation_error', 'Phone number must be exactly 10 digits', 422)
    if not LICENSE_RE.match(license_no):
        return _err('validation_error', 'Enter a valid license number (8-20 letters/digits)', 422)
    problem = _password_problem(password)
    if problem:
        return _err('validation_error', problem, 422)
    try:
        years = int(data.get('experience_years') or 0)
        if not 0 <= years <= 60:
            raise ValueError
    except (TypeError, ValueError):
        return _err('validation_error', 'Experience must be a number of years (0-60)', 422)

    if User.query.filter_by(email=email).first():
        return _err('conflict', 'An account with this email already exists', 409)
    if User.query.filter_by(phone=phone).first():
        return _err('conflict', 'An account with this phone number already exists', 409)
    if Driver.query.filter_by(license_no=license_no).first():
        return _err('conflict', 'This license number is already registered', 409)

    ok, error = _check_otp(email, 'register', data.get('otp'), consume=True)
    if not ok:
        return error

    doc_name, doc_error = _save_license_doc(request.files.get('license_doc'))
    if doc_error:
        db.session.rollback()  # keep the OTP: the user only needs to fix the file
        return _err('validation_error', doc_error, 422)

    try:
        user = User(name=name, email=email, phone=phone, password_hash=_hash_pw(password), role=UserRole.driver)
        db.session.add(user)
        db.session.flush()
        driver = Driver(user_id=user.id, license_no=license_no, experience_years=years,
                        license_doc_url=doc_name, address=(data.get('address') or None))
        db.session.add(driver)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _err('conflict', 'An account with these details already exists', 409)

    return jsonify({'message': 'Application submitted. An administrator will review it before you can sign in.',
                    'driver_id': driver.id}), 201


# ── login / session ──────────────────────────────────────────────────────────

@auth_bp.route('/login', methods=['POST'])
@limiter.limit('10 per minute')
def login():
    data = request.get_json(silent=True) or {}
    email = _email_of(data)
    password = str(data.get('password') or '')
    if not email or not password:
        return _err('validation_error', 'Email and password are required', 422)

    user = User.query.filter_by(email=email).first()
    valid = bool(user) and bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8'))
    if not valid:
        return _err('invalid_credentials', 'Invalid email or password', 401)

    if user.status == UserStatus.inactive:
        return _err('inactive', 'This account has been deactivated. Contact your administrator.', 403)

    if user.role == UserRole.driver:
        driver = Driver.query.filter_by(user_id=user.id).first()
        if not driver:
            return _err('not_approved', 'Your driver profile is incomplete. Contact your administrator.', 403)
        if driver.approval_status.value != 'approved':
            msgs = {
                'pending': 'Your application is awaiting administrator approval.',
                'rejected': 'Your application was rejected.' + (f' Reason: {driver.rejection_reason}' if driver.rejection_reason else ''),
                'blocked': 'Your account has been blocked. Contact your administrator.',
            }
            return _err('not_approved', msgs.get(driver.approval_status.value, 'Your account is not approved yet.'),
                        403, status=driver.approval_status.value)

    return jsonify({
        'access_token': create_access_token(identity=str(user.id)),
        'refresh_token': create_refresh_token(identity=str(user.id)),
        'role': user.role.value,
        'name': user.name,
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    return jsonify({'access_token': create_access_token(identity=get_jwt_identity())}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user = User.query.get(get_jwt_identity())
    if not user:
        return _err('not_found', 'User not found', 404)
    result = {'id': user.id, 'name': user.name, 'email': user.email, 'phone': user.phone, 'role': user.role.value}
    if user.role == UserRole.driver:
        driver = Driver.query.filter_by(user_id=user.id).first()
        if driver:
            result['driver'] = {
                'id': driver.id,
                'approval_status': driver.approval_status.value,
                'license_no': driver.license_no,
                'experience_years': driver.experience_years,
            }
            v = Vehicle.query.filter_by(assigned_driver_id=driver.id).first()
            if v:
                result['driver']['vehicle'] = {
                    'id': v.id, 'vehicle_no': v.vehicle_no, 'type': v.type, 'fuel_type': v.fuel_type,
                    'load_capacity_kg': v.load_capacity_kg,
                    'emission_factor_g_per_km': v.emission_factor_g_per_km, 'status': v.status.value,
                }
    return jsonify(result), 200


# ── password reset (real email OTP) ──────────────────────────────────────────

@auth_bp.route('/forgot-password', methods=['POST'])
@limiter.limit('3 per minute')
def forgot_password():
    email = _email_of(request.get_json(silent=True) or {})
    generic = jsonify({'message': 'If an account exists for that email, a reset code has been sent.',
                       'resend_after': OTP_RESEND_COOLDOWN}), 200
    if not EMAIL_RE.match(email):
        return _err('validation_error', 'Enter a valid email address', 422)
    if User.query.filter_by(email=email).first():
        _issue_otp(email, 'reset', 'Reset your password', 'Use this code to choose a new password.')
    return generic  # same answer whether or not the account exists


@auth_bp.route('/reset-password', methods=['POST'])
@limiter.limit('5 per minute')
def reset_password():
    data = request.get_json(silent=True) or {}
    email = _email_of(data)
    new_pw = str(data.get('new_password') or '')
    problem = _password_problem(new_pw)
    if problem:
        return _err('validation_error', problem, 422)
    user = User.query.filter_by(email=email).first()
    ok, error = _check_otp(email, 'reset', data.get('otp'), consume=bool(user))
    if not ok or not user:
        return error or _err('invalid_otp', 'Code expired or not found. Request a new one.', 400)
    user.password_hash = _hash_pw(new_pw)
    db.session.commit()
    return jsonify({'message': 'Password updated. You can sign in now.'}), 200


# ── admin: view an applicant's license document ──────────────────────────────

@auth_bp.route('/license-doc/<int:driver_id>', methods=['GET'])
def license_doc(driver_id):
    token = request.args.get('token')
    if token:
        try:
            dec = decode_token(token)
            user = User.query.get(dec['sub'])
            if not user or (user.role.value if hasattr(user.role, 'value') else str(user.role)).lower() != 'admin':
                return _err('forbidden', 'Admin access only', 403)
        except Exception:
            return _err('unauthorized', 'Invalid or expired token', 401)
    else:
        try:
            verify_jwt_in_request()
            user = User.query.get(get_jwt_identity())
            if not user or (user.role.value if hasattr(user.role, 'value') else str(user.role)).lower() != 'admin':
                return _err('forbidden', 'Admin access only', 403)
        except Exception:
            return _err('unauthorized', 'Authentication required', 401)

    driver = Driver.query.get(driver_id)
    if not driver or not driver.license_doc_url:
        return _err('not_found', 'No document on file', 404)
    folder = os.environ.get('UPLOAD_DIR') or os.path.join(current_app.instance_path, 'uploads')
    return send_from_directory(folder, os.path.basename(driver.license_doc_url))
