import os
import random

def get_candidate_routes(origin, destination):
    """
    Returns alternative routes for a trip.
    Falls back to MOCK_MODE if API key is missing.
    """
    api_key = os.environ.get('GOOGLE_MAPS_API_KEY')
    
    if not api_key:
        print(f"[MOCK_MODE] Generating mock routes for {origin} -> {destination}")
        # Generate 2-3 mock routes with varying distance and traffic
        base_dist = random.uniform(10, 150)
        
        routes = []
        
        # Route 1: Fastest
        routes.append({
            "route_label": "Fastest Route (Highway)",
            "distance_km": round(base_dist, 1),
            "traffic_density": "High",
            "avg_speed": 80.0
        })
        
        # Route 2: Eco Route (slower, less traffic, often slightly shorter or longer)
        routes.append({
            "route_label": "Eco-Friendly Route (City/Backroads)",
            "distance_km": round(base_dist * 0.95, 1),
            "traffic_density": "Low",
            "avg_speed": 45.0
        })
        
        # Route 3: Alternative
        if random.random() > 0.5:
            routes.append({
                "route_label": "Alternative Scenic Route",
                "distance_km": round(base_dist * 1.15, 1),
                "traffic_density": "Medium",
                "avg_speed": 60.0
            })
            
        return routes

    # TODO: Real Google Maps Directions API integration
    # requests.get("https://maps.googleapis.com/maps/api/directions/json", params={"origin": origin, "destination": destination, "alternatives": "true", "key": api_key})
    return []
