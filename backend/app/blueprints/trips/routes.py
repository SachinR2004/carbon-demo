from datetime import datetime, timedelta, timezone

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models import Trip, Driver, Vehicle, TripStatus, Route, User

trips_bp = Blueprint('trips', __name__)

IST = timedelta(hours=5, minutes=30)


# ── helpers ──────────────────────────────────────────────────────────────────

def _current_user():
    return User.query.get(get_jwt_identity())


def _is_admin(user):
    return bool(user) and getattr(user.role, 'value', str(user.role)) == 'admin'


def _driver_for(user):
    return Driver.query.filter_by(user_id=user.id).first() if user else None


def _vehicle_for(driver, requested_id=None):
    """Vehicle used for a trip. trips.vehicle_id is NOT NULL, so we always need one."""
    if requested_id:
        v = Vehicle.query.get(requested_id)
        if v:
            return v
    v = Vehicle.query.filter_by(assigned_driver_id=driver.id).first()
    # demo fallback: no assigned vehicle -> first vehicle on file
    return v or Vehicle.query.order_by(Vehicle.id).first()


def _num(value, default=0.0, lo=0.0, hi=1_000_000.0):
    try:
        n = float(value)
    except (TypeError, ValueError):
        return default
    return min(max(n, lo), hi) if n == n else default  # n == n filters NaN


def _can_access(user, trip):
    if _is_admin(user):
        return True
    driver = _driver_for(user)
    return bool(driver) and trip.driver_id == driver.id


def _split_ref(purpose):
    """Trips saved from the app store '<clientTripId>|<energy unit>' in `purpose`."""
    ref, _, unit = (purpose or '').partition('|')
    return ref, (unit or 'L')


def _serialize(trip):
    ref, unit = _split_ref(trip.purpose)
    route = trip.routes[0] if trip.routes else None
    done = trip.end_time
    return {
        'id': trip.id,
        'tripId': ref or f'TRIP-{trip.id}',
        'origin': trip.source,
        'destination': trip.destination,
        'load_weight_kg': trip.load_weight_kg,
        'status': getattr(trip.status, 'value', str(trip.status)),
        'title': route.route_label if route else None,
        'distanceKm': route.distance_km if route else None,
        'ecoScore': route.eco_score if route else None,
        'fuelLiters': trip.actual_fuel_l,
        'fuelUnit': unit,
        'co2Kg': trip.actual_co2_kg,
        'completedAtIso': done.replace(tzinfo=timezone.utc).isoformat() if done else None,
        'completedAt': (done + IST).strftime('%d/%m/%Y, %I:%M:%S %p') if done else None,
        'synced': True,
    }


# ── endpoints ────────────────────────────────────────────────────────────────

@trips_bp.route('/', methods=['GET'])
@jwt_required()
def get_trips():
    """Drivers see their own trips; admins see all."""
    user = _current_user()
    if not user:
        return jsonify({'error': 'unauthorized'}), 401
    q = Trip.query
    if not _is_admin(user):
        driver = _driver_for(user)
        if not driver:
            return jsonify([]), 200
        q = q.filter_by(driver_id=driver.id)
    return jsonify([_serialize(t) for t in q.order_by(Trip.id.desc()).limit(500).all()]), 200


@trips_bp.route('/history', methods=['GET'])
@jwt_required()
def trip_history():
    """Completed trips for the logged-in driver (admins: everyone)."""
    user = _current_user()
    if not user:
        return jsonify({'error': 'unauthorized'}), 401
    q = Trip.query.filter_by(status=TripStatus.completed)
    if not _is_admin(user):
        driver = _driver_for(user)
        if not driver:
            return jsonify({'trips': []}), 200
        q = q.filter_by(driver_id=driver.id)
    trips = q.order_by(Trip.end_time.desc()).limit(200).all()
    return jsonify({'trips': [_serialize(t) for t in trips]}), 200


@trips_bp.route('/complete', methods=['POST'])
@jwt_required()
def complete_trip():
    """Save a finished trip. Safe to call twice for the same client trip id."""
    user = _current_user()
    driver = _driver_for(user)
    if not driver:
        return jsonify({'error': 'forbidden', 'message': 'Only drivers can complete trips'}), 403

    data = request.get_json(silent=True) or {}
    ref = str(data.get('tripId') or '').strip()[:60]
    origin = str(data.get('origin') or '').strip()
    destination = str(data.get('destination') or '').strip()
    if not ref or not origin or not destination:
        return jsonify({'error': 'validation_error', 'message': 'tripId, origin and destination are required'}), 422

    existing = Trip.query.filter(Trip.driver_id == driver.id, Trip.purpose.like(f'{ref}|%')).first()
    if existing:
        return jsonify({'message': 'Trip already saved', 'trip': _serialize(existing)}), 200

    vehicle = _vehicle_for(driver, data.get('vehicle_id'))
    if not vehicle:
        return jsonify({'error': 'no_vehicle', 'message': 'No vehicle is registered yet'}), 409

    unit = str(data.get('fuelUnit') or 'L')[:8]
    try:
        trip = Trip(
            driver_id=driver.id,
            vehicle_id=vehicle.id,
            source=origin[:255],
            destination=destination[:255],
            load_weight_kg=_num(data.get('loadWeightKg')),
            purpose=f'{ref}|{unit}',
            status=TripStatus.completed,
            end_time=datetime.now(timezone.utc).replace(tzinfo=None),
            actual_fuel_l=_num(data.get('fuelLiters')),
            actual_co2_kg=_num(data.get('co2Kg')),
        )
        db.session.add(trip)
        db.session.flush()
        db.session.add(Route(
            trip_id=trip.id,
            route_label=str(data.get('title') or 'Route')[:50],
            distance_km=_num(data.get('distanceKm')),
            predicted_fuel_l=_num(data.get('fuelLiters')),
            predicted_co2_kg=_num(data.get('co2Kg')),
            eco_score=_num(data.get('ecoScore'), default=None, hi=100.0) if data.get('ecoScore') is not None else None,
            is_recommended=False,
        ))
        db.session.commit()
        return jsonify({'message': 'Trip saved', 'trip': _serialize(trip)}), 201
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'database_error', 'message': 'Could not save trip'}), 400


@trips_bp.route('/create', methods=['POST'])
@jwt_required()
def create_trip():
    """Create a pending trip for the logged-in driver."""
    user = _current_user()
    driver = _driver_for(user)
    if not driver:
        return jsonify({'error': 'forbidden', 'message': 'Only drivers can create trips'}), 403

    data = request.get_json(silent=True) or {}
    origin = str(data.get('origin') or '').strip()
    destination = str(data.get('destination') or '').strip()
    if not origin or not destination:
        return jsonify({'error': 'validation_error', 'message': 'origin and destination are required'}), 422

    vehicle = _vehicle_for(driver, data.get('vehicle_id'))
    if not vehicle:
        return jsonify({'error': 'no_vehicle', 'message': 'No vehicle is registered yet'}), 409

    try:
        trip = Trip(
            driver_id=driver.id,
            vehicle_id=vehicle.id,
            source=origin[:255],
            destination=destination[:255],
            load_weight_kg=_num(data.get('load_weight_kg')),
            status=TripStatus.pending,
        )
        db.session.add(trip)
        db.session.commit()
        return jsonify({'message': 'Trip created successfully', 'trip_id': trip.id}), 201
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'database_error', 'message': 'Could not create trip'}), 400


@trips_bp.route('/<int:trip_id>/status', methods=['PATCH'])
@jwt_required()
def update_trip_status(trip_id):
    user = _current_user()
    data = request.get_json(silent=True) or {}
    new_status = data.get('status')
    if new_status not in [s.value for s in TripStatus]:
        return jsonify({'error': 'validation_error',
                        'message': f'status must be one of {[s.value for s in TripStatus]}'}), 422

    trip = Trip.query.get(trip_id)
    if not trip:
        return jsonify({'error': 'not_found', 'message': 'Trip not found'}), 404
    if not _can_access(user, trip):
        return jsonify({'error': 'forbidden', 'message': 'Not your trip'}), 403

    try:
        trip.status = TripStatus(new_status)
        db.session.commit()
        return jsonify({'message': 'Trip status updated', 'trip_id': trip.id, 'status': new_status}), 200
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'update_error', 'message': 'Could not update trip'}), 400
