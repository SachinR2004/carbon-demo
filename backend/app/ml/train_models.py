import os
import sys
import pandas as pd
import joblib
import json
from datetime import datetime, timezone
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

# Add backend dir to sys.path so we can import app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from app import create_app, db
from app.models import MLModel

def train_and_save():
    data_path = os.path.join(os.path.dirname(__file__), 'synthetic_trip_data.csv')
    if not os.path.exists(data_path):
        print("Data not found. Run generate_synthetic_data.py first.")
        return
        
    df = pd.read_csv(data_path)
    
    features = ['distance_km', 'vehicle_load_kg', 'traffic_density', 'weather_condition', 'vehicle_type']
    X = df[features]
    
    # Model 1: Fuel Consumption
    y_fuel = df['fuel_consumed_l']
    X_train_f, X_test_f, y_train_f, y_test_f = train_test_split(X, y_fuel, test_size=0.2, random_state=42)
    
    rf_fuel = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_fuel.fit(X_train_f, y_train_f)
    
    fuel_preds = rf_fuel.predict(X_test_f)
    fuel_metrics = {
        "mae": mean_absolute_error(y_test_f, fuel_preds),
        "r2": r2_score(y_test_f, fuel_preds)
    }
    
    # Model 2: CO2 Emissions
    y_co2 = df['co2_emissions_kg']
    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(X, y_co2, test_size=0.2, random_state=42)
    
    rf_co2 = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_co2.fit(X_train_c, y_train_c)
    
    co2_preds = rf_co2.predict(X_test_c)
    co2_metrics = {
        "mae": mean_absolute_error(y_test_c, co2_preds),
        "r2": r2_score(y_test_c, co2_preds)
    }
    
    # Save models
    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    fuel_path = os.path.join(models_dir, 'fuel_model.joblib')
    co2_path = os.path.join(models_dir, 'co2_model.joblib')
    
    joblib.dump(rf_fuel, fuel_path)
    joblib.dump(rf_co2, co2_path)
    print("Models saved successfully.")
    
    # Save metadata to DB
    app = create_app()
    with app.app_context():
        # Clear old records
        MLModel.query.filter(MLModel.model_name.in_(['fuel_predictor', 'co2_predictor'])).delete()
        
        db.session.add(MLModel(
            model_name='fuel_predictor',
            version='1.0',
            trained_at=datetime.now(timezone.utc),
            metrics_json=json.dumps(fuel_metrics)
        ))
        
        db.session.add(MLModel(
            model_name='co2_predictor',
            version='1.0',
            trained_at=datetime.now(timezone.utc),
            metrics_json=json.dumps(co2_metrics)
        ))
        
        db.session.commit()
        print("Model metadata saved to database.")

if __name__ == '__main__':
    train_and_save()
