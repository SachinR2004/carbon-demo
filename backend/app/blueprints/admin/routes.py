from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app import db
from app.models import Driver, Vehicle, Trip, TripStatus
from app.models.driver import ApprovalStatus
from app.utils.rbac import role_required
from sqlalchemy import func

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/stats', methods=['GET'])
@role_required('admin')
def get_stats():
    """Aggregates system-wide metrics for the Admin Dashboard."""
    
    total_drivers = Driver.query.filter(Driver.approval_status == ApprovalStatus.approved).count()
    pending_approvals = Driver.query.filter(Driver.approval_status == ApprovalStatus.pending).count()
    total_vehicles = Vehicle.query.count()
    active_trips = Trip.query.filter(Trip.status == TripStatus.in_progress).count()
    total_trips = Trip.query.filter(Trip.status == TripStatus.completed).count()
    
    # Calculate CO2 saved (simplification: if eco_score > 50, assume we saved some CO2 vs baseline)
    # Or calculate it by predicting baseline vs actual. Here we use a dummy aggregate.
    co2_saved_kg = db.session.query(func.sum(Trip.actual_co2_kg)).filter(Trip.status == TripStatus.completed).scalar() or 0.0
    # Let's say baseline was 20% higher than actual on average
    co2_saved_kg = co2_saved_kg * 0.2 
    
    return jsonify({
        "total_drivers": total_drivers,
        "pending_approvals": pending_approvals,
        "total_vehicles": total_vehicles,
        "active_trips": active_trips,
        "total_trips": total_trips,
        "co2_saved_kg": round(co2_saved_kg, 1)
    }), 200

# Mock DB Settings Table (since we don't have a real one in models for simplicity, we mock it)
_MOCK_SETTINGS = {
    "auto_approve_drivers": False,
    "strict_routing": True,
    "ml_retrain_interval_days": 7
}

@admin_bp.route('/settings', methods=['GET'])
@role_required('admin')
def get_settings():
    return jsonify(_MOCK_SETTINGS), 200

@admin_bp.route('/settings', methods=['PATCH'])
@role_required('admin')
def update_settings():
    data = request.get_json() or {}
    for k, v in data.items():
        if k in _MOCK_SETTINGS:
            _MOCK_SETTINGS[k] = v
    return jsonify({"message": "Settings updated", "settings": _MOCK_SETTINGS}), 200

@admin_bp.route('/backup', methods=['POST'])
@role_required('admin')
def trigger_backup():
    # Mock backup
    return jsonify({"message": "Database backup triggered successfully", "timestamp": "2026-07-04T12:00:00Z"}), 200

@admin_bp.route('/restore', methods=['POST'])
@role_required('admin')
def trigger_restore():
    # Mock restore
    return jsonify({"message": "Database restore initiated", "status": "pending"}), 200
