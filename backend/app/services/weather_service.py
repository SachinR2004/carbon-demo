import os
import random

def get_current_weather(location_string):
    """
    Returns weather at location. Falls back to MOCK_MODE.
    """
    api_key = os.environ.get('OPENWEATHER_API_KEY')
    
    if not api_key:
        print(f"[MOCK_MODE] Generating mock weather for {location_string}")
        conditions = ['Clear', 'Rain', 'Snow']
        weights = [0.7, 0.2, 0.1]
        c = random.choices(conditions, weights)[0]
        
        return {
            "condition": c,
            "temperature": random.uniform(5, 35) if c != 'Snow' else random.uniform(-10, 2),
            "alert_flag": True if c == 'Snow' else False
        }

    # TODO: Real OpenWeather integration
    return {"condition": "Clear", "temperature": 20, "alert_flag": False}
