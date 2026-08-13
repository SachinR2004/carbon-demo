from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import MLModel, Vehicle, Driver
from app.utils.rbac import role_required
import json

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/fleet-health', methods=['GET'])
@role_required('admin')
def get_fleet_health():
    """Phase 3/5: AI Fleet Health Overview"""
    
    # Retrieve the latest ML models metrics
    models = MLModel.query.order_by(MLModel.trained_at.desc()).limit(2).all()
    models_data = []
    for m in models:
        try:
            metrics = json.loads(m.metrics_json)
        except:
            metrics = {}
        models_data.append({
            "model_name": m.model_name,
            "version": m.version,
            "metrics": metrics,
            "trained_at": str(m.trained_at)
        })
        
    # Get basic predictive maintenance overview (dummy aggregation for now)
    from app.ml.predict import calculate_maintenance_risk
    
    vehicles = Vehicle.query.all()
    high_risk_count = 0
    for v in vehicles:
        # Assuming age=2 years, distance=20000 km as default mock
        risk = calculate_maintenance_risk(2, 20000)
        if risk > 60:
            high_risk_count += 1
            
    return jsonify({
        "models": models_data,
        "predictive_maintenance": {
            "vehicles_at_risk": high_risk_count,
            "total_vehicles": len(vehicles)
        },
        "system_status": "Healthy"
    }), 200

from flask import request
@ai_bp.route('/insights', methods=['GET'])
@role_required('admin')
def get_insights():
    """Returns AI-generated insights based on a query parameter."""
    query = request.args.get('q', '').lower()
    
    # Mock AI insights responses
    if 'driver' in query or 'eco' in query:
        insight = "The current top eco driver is Sarah Jenkins (Score 96). Consider setting up a reward program to incentivize others."
    elif 'fuel' in query or 'co2' in query:
        insight = "Fleet CO2 emissions are down 12% this month. The AI model predicts an additional 5% drop if 2 more electric vans are deployed."
    elif 'maintenance' in query or 'risk' in query:
        insight = "Vehicle V-901 and V-902 show high risk of engine component wear based on their mileage patterns."
    else:
        insight = "Ask me about drivers, emissions, or predictive maintenance to get a specific AI insight."
        
    return jsonify({"insight": insight}), 200
