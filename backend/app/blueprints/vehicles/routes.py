from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models import Vehicle, VehicleStatus, Driver, AuditLog, User
from app.utils.rbac import role_required

vehicles_bp = Blueprint('vehicles', __name__)


def _write_audit(actor_id, action, entity_id):
    log = AuditLog(actor_id=actor_id, action=action, entity='vehicle', entity_id=entity_id)
    db.session.add(log)


@vehicles_bp.route('', methods=['GET'])
@role_required('admin')
def list_vehicles():
    vehicles = Vehicle.query.all()
    result = []
    for v in vehicles:
        driver = Driver.query.get(v.assigned_driver_id) if v.assigned_driver_id else None
        driver_user = User.query.get(driver.user_id) if driver else None
        result.append({
            "id": v.id,
            "vehicle_no": v.vehicle_no,
            "type": v.type,
            "fuel_type": v.fuel_type,
            "load_capacity_kg": v.load_capacity_kg,
            "emission_factor_g_per_km": v.emission_factor_g_per_km,
            "status": v.status.value,
            "assigned_driver_id": v.assigned_driver_id,
            "assigned_driver_name": driver_user.name if driver_user else None,
        })
    return jsonify(result), 200


@vehicles_bp.route('', methods=['POST'])
@role_required('admin')
def create_vehicle():
    actor_id = get_jwt_identity()
    data = request.get_json() or {}
    required = ['vehicle_no', 'type', 'fuel_type']
    for f in required:
        if not data.get(f):
            return jsonify({"error": "validation_error", "message": f"{f} is required"}), 422

    if Vehicle.query.filter_by(vehicle_no=data['vehicle_no']).first():
        return jsonify({"error": "conflict", "message": "Vehicle number already exists"}), 409

    # Handle driver_id from either assigned_driver_id or driver_id payload keys
    driver_id = data.get('assigned_driver_id') or data.get('driver_id')
    if driver_id == '' or driver_id == 'Unassigned':
        driver_id = None

    vehicle = Vehicle(
        vehicle_no=data['vehicle_no'],
        type=data['type'],
        fuel_type=data['fuel_type'],
        load_capacity_kg=data.get('load_capacity_kg', 1000),
        emission_factor_g_per_km=data.get('emission_factor_g_per_km', 120.0),
        assigned_driver_id=int(driver_id) if driver_id else None,
        status=VehicleStatus.active
    )
    db.session.add(vehicle)
    db.session.flush()
    _write_audit(actor_id, 'create', vehicle.id)
    db.session.commit()

    return jsonify({"message": "Vehicle created", "id": vehicle.id}), 201


@vehicles_bp.route('/<int:vehicle_id>/assign', methods=['POST'])
@role_required('admin')
def assign_vehicle(vehicle_id):
    actor_id = get_jwt_identity()
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify({"error": "not_found", "message": "Vehicle not found"}), 404

    data = request.get_json() or {}
    driver_id = data.get('driver_id')

    if not driver_id or driver_id == '' or driver_id == 'Unassigned':
        vehicle.assigned_driver_id = None
    else:
        try:
            vehicle.assigned_driver_id = int(driver_id)
        except (ValueError, TypeError):
            return jsonify({"error": "validation_error", "message": "Invalid driver ID"}), 422

    _write_audit(actor_id, 'update', vehicle_id)
    db.session.commit()
    return jsonify({"message": "Vehicle assignment updated successfully"}), 200


@vehicles_bp.route('/<int:vehicle_id>', methods=['PATCH'])
@role_required('admin')
def update_vehicle(vehicle_id):
    actor_id = get_jwt_identity()
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify({"error": "not_found", "message": "Vehicle not found"}), 404

    data = request.get_json() or {}
    allowed = ['type', 'fuel_type', 'load_capacity_kg', 'emission_factor_g_per_km',
               'assigned_driver_id', 'status']
    for field in allowed:
        if field in data:
            if field == 'status':
                try:
                    setattr(vehicle, field, VehicleStatus[data[field]])
                except KeyError:
                    return jsonify({"error": "validation_error", "message": "Invalid status"}), 422
            else:
                setattr(vehicle, field, data[field])

    _write_audit(actor_id, 'update', vehicle_id)
    db.session.commit()
    return jsonify({"message": "Vehicle updated"}), 200


@vehicles_bp.route('/<int:vehicle_id>', methods=['DELETE'])
@role_required('admin')
def delete_vehicle(vehicle_id):
    actor_id = get_jwt_identity()
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return jsonify({"error": "not_found", "message": "Vehicle not found"}), 404

    _write_audit(actor_id, 'delete', vehicle_id)
    db.session.delete(vehicle)
    db.session.commit()
    return jsonify({"message": "Vehicle deleted"}), 200
