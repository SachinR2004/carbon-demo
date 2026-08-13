import os
import joblib
import pandas as pd

_models = {}

def _load_models():
    if not _models:
        models_dir = os.path.join(os.path.dirname(__file__), 'models')
        fuel_path = os.path.join(models_dir, 'fuel_model.joblib')
        co2_path = os.path.join(models_dir, 'co2_model.joblib')
        
        if os.path.exists(fuel_path) and os.path.exists(co2_path):
            _models['fuel'] = joblib.load(fuel_path)
            _models['co2'] = joblib.load(co2_path)
        else:
            print("WARNING: ML Models not found. Using fallback heuristics.")

def predict_trip_metrics(distance_km, vehicle_load_kg, traffic_density_str, weather_condition_str, vehicle_type_str):
    """
    traffic_density_str: Low, Medium, High
    weather_condition_str: Clear, Rain, Snow
    vehicle_type_str: Van, Truck, Electric Van, etc.
    """
    _load_models()
    
    # Map strings to integers
    traffic_map = {'Low': 1, 'Medium': 2, 'High': 3}
    weather_map = {'Clear': 1, 'Rain': 2, 'Snow': 3}
    
    # Very basic vehicle type mapping: Van=1, Truck=2, EV=3
    v_type_str = (vehicle_type_str or '').lower()
    if 'truck' in v_type_str:
        v_type = 2
    elif 'electric' in v_type_str or 'ev' in v_type_str:
        v_type = 3
    else:
        v_type = 1
        
    t_dens = traffic_map.get(traffic_density_str, 2)
    w_cond = weather_map.get(weather_condition_str, 1)
    
    features = pd.DataFrame([{
        'distance_km': distance_km,
        'vehicle_load_kg': vehicle_load_kg,
        'traffic_density': t_dens,
        'weather_condition': w_cond,
        'vehicle_type': v_type
    }])
    
    if 'fuel' in _models and 'co2' in _models:
        fuel_l = float(_models['fuel'].predict(features)[0])
        co2_kg = float(_models['co2'].predict(features)[0])
    else:
        # Fallback heuristic
        base_fuel = 0.1 if v_type == 1 else (0.25 if v_type == 2 else 0)
        fuel_l = distance_km * base_fuel * (1 + (t_dens * 0.1))
        co2_kg = fuel_l * 2.68
        
    # Apply rule-based Eco Score (0-100)
    # Lower CO2 per km is better. Baseline: 0.2 kg/km is around 50 score for a standard vehicle.
    if distance_km > 0:
        co2_per_km = co2_kg / distance_km
    else:
        co2_per_km = 0
        
    if v_type == 3:
        # EVs still get a friendlier curve (their per-km footprint is typically much lower),
        # but the score now actually varies with distance/traffic/weather instead of being
        # pinned at a flat value — otherwise every EV route ties and "AI Recommended"
        # ends up picking whichever route happened to be evaluated first.
        eco_score = max(0, min(100, 100 - (co2_per_km * 120)))
    else:
        # e.g. 0.1 -> 70, 0.2 -> 40, 0.4 -> -20 (clamped to 0)
        eco_score = max(0, min(100, 100 - (co2_per_km * 300)))
        
    return {
        "predicted_fuel_l": round(fuel_l, 2),
        "predicted_co2_kg": round(co2_kg, 2),
        "eco_score": round(eco_score, 1)
    }

def calculate_maintenance_risk(vehicle_age_years, total_distance_km):
    """Rule-based predictive maintenance risk (0-100)"""
    base_risk = min(100, vehicle_age_years * 5)
    usage_risk = min(100, (total_distance_km / 100000) * 20)
    risk = base_risk + usage_risk
    return min(100, round(risk, 1))
