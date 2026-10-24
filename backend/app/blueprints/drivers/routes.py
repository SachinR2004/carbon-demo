from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Driver, UserRole, ApprovalStatus, AuditLog, Notification, Trip
from app.utils.rbac import role_required
from datetime import datetime, timezone

drivers_bp = Blueprint('drivers', __name__)


def _write_audit(actor_id, action, entity, entity_id):
    log = AuditLog(actor_id=actor_id, action=action, entity=entity, entity_id=entity_id)
    db.session.add(log)


def _notify(user_id, notif_type, message):
    n = Notification(user_id=user_id, type=notif_type, message=message)
    db.session.add(n)


def _is_driver_or_admin(user):
    if not user:
        return False
    role_val = user.role.value if hasattr(user.role, 'value') else str(user.role)
    return role_val.lower() in ['driver', 'admin']


# ── Driver Stats ─────────────────────────────────────────────────────────────

@drivers_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_driver_stats():
    """Real totals from this driver's completed trips (no placeholder numbers)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not _is_driver_or_admin(user):
        return jsonify({"error": "forbidden", "message": "Driver access only"}), 403

    driver = Driver.query.filter_by(user_id=user_id).first()
    empty = {"completed_runs": 0, "distance_km": 0.0, "co2_kg": 0.0, "fuel_used": 0.0, "avg_eco_score": None}
    if not driver:
        return jsonify(empty), 200

    from app.models import TripStatus, Route
    from sqlalchemy import func
    row = (db.session.query(
                func.count(Trip.id),
                func.coalesce(func.sum(Trip.actual_co2_kg), 0.0),
                func.coalesce(func.sum(Trip.actual_fuel_l), 0.0))
           .filter(Trip.driver_id == driver.id, Trip.status == TripStatus.completed).one())
    dist, eco = (db.session.query(func.coalesce(func.sum(Route.distance_km), 0.0), func.avg(Route.eco_score))
                 .join(Trip, Trip.id == Route.trip_id)
                 .filter(Trip.driver_id == driver.id, Trip.status == TripStatus.completed).one())
    return jsonify({
        "completed_runs": int(row[0]),
        "co2_kg": round(float(row[1]), 2),
        "fuel_used": round(float(row[2]), 2),
        "distance_km": round(float(dist), 1),
        "avg_eco_score": round(float(eco), 1) if eco is not None else None,
    }), 200


# ── Driver self-service ──────────────────────────────────────────────────────

@drivers_bp.route('/me', methods=['GET'])
@jwt_required()
def get_my_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not _is_driver_or_admin(user):
        return jsonify({"error": "forbidden", "message": "Driver access only"}), 403

    driver = Driver.query.filter_by(user_id=user_id).first()
    if not driver:
        return jsonify({"error": "not_found", "message": "Driver profile not found"}), 404

    from app.models import Vehicle
    vehicle = Vehicle.query.filter_by(assigned_driver_id=driver.id).first()

    return jsonify({
        "id": driver.id,
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "dob": str(driver.dob) if driver.dob else None,
        "address": driver.address,
        "license_no": driver.license_no,
        "experience_years": driver.experience_years,
        "emergency_contact": driver.emergency_contact,
        "profile_photo_url": driver.profile_photo_url,
        "approval_status": driver.approval_status.value,
        "rejection_reason": driver.rejection_reason,
        "vehicle": {
            "id": vehicle.id,
            "vehicle_no": vehicle.vehicle_no,
            "type": vehicle.type,
            "fuel_type": vehicle.fuel_type,
            "load_capacity_kg": vehicle.load_capacity_kg,
            "emission_factor_g_per_km": vehicle.emission_factor_g_per_km,
            "status": vehicle.status.value
        } if vehicle else None
    }), 200


@drivers_bp.route('/me', methods=['PATCH'])
@jwt_required()
def update_my_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not _is_driver_or_admin(user):
        return jsonify({"error": "forbidden", "message": "Driver access only"}), 403

    driver = Driver.query.filter_by(user_id=user_id).first()
    if not driver:
        return jsonify({"error": "not_found", "message": "Driver profile not found"}), 404

    data = request.get_json() or {}
    allowed = ['address', 'emergency_contact', 'experience_years']
    for field in allowed:
        if field in data:
            setattr(driver, field, data[field])
    if 'name' in data:
        user.name = data['name']
    if 'phone' in data:
        user.phone = data['phone']

    db.session.commit()
    return jsonify({"message": "Profile updated"}), 200


# ── Admin: driver management ─────────────────────────────────────────────────

@drivers_bp.route('', methods=['GET'])
@role_required('admin')
def list_drivers():
    status = request.args.get('status')
    query = Driver.query
    if status:
        try:
            query = query.filter_by(approval_status=ApprovalStatus[status])
        except KeyError:
            return jsonify({"error": "invalid_status", "message": "Unknown status filter"}), 422

    drivers = query.all()
    result = []
    for d in drivers:
        u = User.query.get(d.user_id)
        result.append({
            "id": d.id,
            "name": u.name if u else None,
            "email": u.email if u else None,
            "phone": u.phone if u else None,
            "license_no": d.license_no,
            "experience_years": d.experience_years,
            "approval_status": d.approval_status.value,
            "rejection_reason": d.rejection_reason,
            "approved_at": str(d.approved_at) if d.approved_at else None,
            "profile_photo_url": d.profile_photo_url,
            "license_doc_url": d.license_doc_url,
            "address_proof_url": d.address_proof_url,
        })
    return jsonify(result), 200


@drivers_bp.route('/<int:driver_id>/approval', methods=['PATCH'])
@role_required('admin')
def update_approval(driver_id):
    actor_id = get_jwt_identity()
    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify({"error": "not_found", "message": "Driver not found"}), 404

    data = request.get_json() or {}
    action = data.get('action')  # 'approve' or 'reject'

    if action == 'approve':
        driver.approval_status = ApprovalStatus.approved
        driver.approved_by = actor_id
        driver.approved_at = datetime.now(timezone.utc)
        driver.rejection_reason = None
        msg = "Your driver account has been approved! You can now log in."
        notif_type = "approval"
    elif action == 'reject':
        reason = data.get('reason', '').strip()
        if not reason:
            return jsonify({"error": "validation_error", "message": "Rejection reason is required"}), 422
        driver.approval_status = ApprovalStatus.rejected
        driver.rejection_reason = reason
        msg = f"Your driver application was rejected. Reason: {reason}"
        notif_type = "rejection"
    else:
        return jsonify({"error": "validation_error", "message": "action must be 'approve' or 'reject'"}), 422

    _notify(driver.user_id, notif_type, msg)
    _write_audit(actor_id, action, 'driver', driver_id)
    db.session.commit()

    return jsonify({"message": f"Driver {action}d successfully"}), 200