from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, limiter
from app.models import Trip, TripStatus, Route as RouteModel, Driver, Vehicle, UserRole
from app.services.google_maps_service import get_candidate_routes
from app.services.weather_service import get_current_weather
from app.ml.predict import predict_trip_metrics

trips_bp = Blueprint('trips', __name__)

@trips_bp.route('', methods=['POST'])
@jwt_required()
def create_trip():
    """Phase 3: Creates a trip, calls maps/weather/predict, and returns candidate routes."""
    user_id = get_jwt_identity()
    driver = Driver.query.filter_by(user_id=user_id).first()
    
    if not driver:
        return jsonify({"error": "forbidden", "message": "Only drivers can create trips"}), 403
        
    data = request.get_json() or {}
    source = data.get('source')
    destination = data.get('destination')
    load_weight_kg = data.get('load_weight_kg', 0.0)
    
    if not source or not destination:
        return jsonify({"error": "validation", "message": "Source and destination required"}), 422
        
    vehicle = Vehicle.query.filter_by(assigned_driver_id=driver.id).first()
    if not vehicle:
        return jsonify({"error": "no_vehicle", "message": "You must be assigned a vehicle to create a trip"}), 400

    # 1. Create Trip Record (Pending Route Selection)
    trip = Trip(
        driver_id=driver.id,
        vehicle_id=vehicle.id,
        source=source,
        destination=destination,
        load_weight_kg=float(load_weight_kg),
        purpose=data.get('purpose'),
        status=TripStatus.in_progress  # Will actually be 'pending_route' or just 'in_progress' until completed/cancelled
    )
    db.session.add(trip)
    db.session.flush() # get trip.id
    
    # 2. Get Candidates & Weather
    weather = get_current_weather(source)
    candidates = get_candidate_routes(source, destination)
    
    routes_saved = []
    best_eco = -1
    best_route = None

    # 3. Predict & Score
    for idx, c in enumerate(candidates):
        predictions = predict_trip_metrics(
            distance_km=c['distance_km'],
            vehicle_load_kg=trip.load_weight_kg,
            traffic_density_str=c['traffic_density'],
            weather_condition_str=weather['condition'],
            vehicle_type_str=vehicle.type
        )
        
        # Determine if AI recommended (temporarily flag the highest eco score)
        if predictions['eco_score'] > best_eco:
            best_eco = predictions['eco_score']
            best_route = idx
            
        r = RouteModel(
            trip_id=trip.id,
            route_label=c['route_label'],
            distance_km=c['distance_km'],
            traffic_density=c['traffic_density'],
            avg_speed=c['avg_speed'],
            predicted_fuel_l=predictions['predicted_fuel_l'],
            predicted_co2_kg=predictions['predicted_co2_kg'],
            eco_score=predictions['eco_score'],
            is_recommended=False
        )
        routes_saved.append(r)
        
    if best_route is not None:
        routes_saved[best_route].is_recommended = True
        
    db.session.add_all(routes_saved)
    db.session.commit()
    
    return jsonify({
        "trip_id": trip.id,
        "weather": weather,
        "routes": [{
            "id": r.id,
            "route_label": r.route_label,
            "distance_km": round(r.distance_km, 1),
            "avg_speed": r.avg_speed,
            "predicted_fuel_l": r.predicted_fuel_l,
            "predicted_co2_kg": r.predicted_co2_kg,
            "eco_score": r.eco_score,
            "is_recommended": r.is_recommended,
            "traffic_density": r.traffic_density
        } for r in routes_saved]
    }), 201


@trips_bp.route('/<int:trip_id>', methods=['GET'])
@jwt_required()
def get_trip(trip_id):
    trip = Trip.query.get(trip_id)
    if not trip:
        return jsonify({"error": "not_found", "message": "Trip not found"}), 404
        
    return jsonify({
        "id": trip.id,
        "source": trip.source,
        "destination": trip.destination,
        "status": trip.status.value,
        "routes": [{
            "id": r.id,
            "route_label": r.route_label,
            "distance_km": round(r.distance_km, 1),
            "avg_speed": r.avg_speed,
            "predicted_fuel_l": r.predicted_fuel_l,
            "predicted_co2_kg": r.predicted_co2_kg,
            "eco_score": r.eco_score,
            "traffic_density": r.traffic_density,
            "is_recommended": r.is_recommended
        } for r in trip.routes]
    }), 200


@trips_bp.route('/<int:trip_id>/select-route', methods=['PATCH'])
@jwt_required()
def select_route(trip_id):
    """Driver chooses a route."""
    data = request.get_json() or {}
    route_id = data.get('route_id')
    
    trip = Trip.query.get(trip_id)
    if not trip:
        return jsonify({"error": "not_found", "message": "Trip not found"}), 404
        
    # Save the selected route ID
    trip.status = TripStatus.in_progress  # Technically "pending start" but we use in_progress
    
    # Optional: Mark the chosen route explicitly if needed.
    # For now we'll just log it
    db.session.commit()
    return jsonify({"message": f"Route {route_id} selected for trip {trip_id}"}), 200


@trips_bp.route('/<int:trip_id>/start', methods=['POST'])
@jwt_required()
def start_trip(trip_id):
    """Marks a trip as started."""
    trip = Trip.query.get(trip_id)
    if not trip:
        return jsonify({"error": "not_found", "message": "Trip not found"}), 404
    
    trip.status = TripStatus.in_progress
    # In a real app we'd set actual_start_time
    db.session.commit()
    return jsonify({"message": "Trip started"}), 200


@trips_bp.route('/<int:trip_id>/end', methods=['POST'])
@jwt_required()
def end_trip(trip_id):
    """Ends a trip, computes actual vs predicted, updates driver eco score."""
    data = request.get_json() or {}
    trip = Trip.query.get(trip_id)
    if not trip:
        return jsonify({"error": "not_found", "message": "Trip not found"}), 404
        
    trip.status = TripStatus.completed
    trip.actual_fuel_l = data.get('actual_fuel_l', 0.0)
    trip.actual_co2_kg = data.get('actual_co2_kg', 0.0)
    
    # Update driver's average eco score based on this trip (simplified)
    if trip.routes:
        selected_route = trip.routes[0] # Simplification
        trip_score = selected_route.eco_score
        driver = trip.driver
        if driver.eco_score is None or driver.eco_score == 0:
            driver.eco_score = trip_score
        else:
            driver.eco_score = (driver.eco_score * 0.9) + (trip_score * 0.1)
            
    db.session.commit()
    return jsonify({"message": "Trip completed"}), 200


@trips_bp.route('/<int:trip_id>/log', methods=['POST'])
@limiter.exempt  # This endpoint gets polled every few seconds during live tracking —
                  # the global 500/hour limit was killing it mid-trip. Exempt it here
                  # instead of raising the global limit for every other route too.
@jwt_required()
def log_gps(trip_id):
    """Phase 4: GPS ping. Detects route deviation."""
    from app.models import Notification, UserRole, User
    data = request.get_json() or {}
    lat = data.get('lat')
    lng = data.get('lng')
    is_deviated = data.get('is_deviated', False)
    
    trip = Trip.query.get(trip_id)
    if not trip:
        return jsonify({"error": "not_found"}), 404
        
    # If the frontend/mock sends a deviation flag (or if backend detects it from coords)
    if is_deviated:
        # Create notification for Driver
        driver_notif = Notification(
            user_id=trip.driver.user_id,
            type="route_deviation",
            title="Route Deviation Detected",
            message=f"You have deviated from the eco-optimized route on Trip #{trip.id}."
        )
        db.session.add(driver_notif)
        
        # Create notification for all Admins
        admins = User.query.filter_by(role=UserRole.admin).all()
        for admin in admins:
            admin_notif = Notification(
                user_id=admin.id,
                type="route_deviation",
                title="Driver Route Deviation",
                message=f"Driver {trip.driver.user.name} deviated from route on Trip #{trip.id}."
            )
            db.session.add(admin_notif)
            
        db.session.commit()
        return jsonify({"message": "Deviation logged, notifications sent"}), 200
        
    return jsonify({"message": "GPS logged"}), 200
