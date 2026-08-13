import pandas as pd
import numpy as np
import os

def generate_data(num_samples=5000):
    np.random.seed(42)
    
    # Features
    distance_km = np.random.uniform(5, 500, num_samples)
    vehicle_load_kg = np.random.uniform(0, 5000, num_samples)
    
    # 1=Low, 2=Medium, 3=High
    traffic_density = np.random.choice([1, 2, 3], num_samples, p=[0.5, 0.3, 0.2])
    
    # 1=Clear, 2=Rain, 3=Snow
    weather_condition = np.random.choice([1, 2, 3], num_samples, p=[0.7, 0.2, 0.1])
    
    # 1=Van, 2=Truck, 3=EV
    vehicle_type = np.random.choice([1, 2, 3], num_samples, p=[0.4, 0.4, 0.2])
    
    # Targets
    # Base fuel is ~ 0.1 L per km for Van, 0.25 for Truck, 0 for EV (EV uses kWh but we map to equivalent or just 0 for simplicity/CO2)
    base_fuel = np.where(vehicle_type == 1, 0.1, np.where(vehicle_type == 2, 0.25, 0.0))
    
    fuel_consumed_l = distance_km * base_fuel * \
                      (1 + (vehicle_load_kg / 10000)) * \
                      (1 + (traffic_density * 0.1)) * \
                      (1 + (weather_condition * 0.05))
    
    # Add noise
    fuel_consumed_l += np.random.normal(0, 0.5, num_samples)
    fuel_consumed_l = np.maximum(0, fuel_consumed_l) # no negative fuel
    
    # CO2 base is ~ 2.68 kg per L of diesel/petrol. EV is 0 direct emissions.
    co2_emissions_kg = fuel_consumed_l * 2.68
    co2_emissions_kg = np.where(vehicle_type == 3, 0, co2_emissions_kg)
    co2_emissions_kg += np.random.normal(0, 1.0, num_samples)
    co2_emissions_kg = np.maximum(0, co2_emissions_kg)
    
    df = pd.DataFrame({
        'distance_km': distance_km,
        'vehicle_load_kg': vehicle_load_kg,
        'traffic_density': traffic_density,
        'weather_condition': weather_condition,
        'vehicle_type': vehicle_type,
        'fuel_consumed_l': fuel_consumed_l,
        'co2_emissions_kg': co2_emissions_kg
    })
    
    output_path = os.path.join(os.path.dirname(__file__), 'synthetic_trip_data.csv')
    df.to_csv(output_path, index=False)
    print(f"Generated {num_samples} records to {output_path}")

if __name__ == '__main__':
    generate_data()
