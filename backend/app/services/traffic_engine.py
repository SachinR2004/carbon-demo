import datetime

def calculate_traffic_impact(route_type, distance_km, base_duration_min):
    """
    Simulates real-time regional traffic congestion (Bengaluru & Karnataka corridors)
    based on time-of-day peak hours and route strategy.
    """
    # Servers run in UTC; traffic patterns must follow India time (IST, UTC+5:30).
    ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    now = datetime.datetime.now(ist)
    minute_of_day = now.hour * 60 + now.minute
    is_weekend = now.weekday() >= 5

    # Peak traffic windows (Morning 8:30-11:00, Evening 17:00-20:30)
    is_peak_morning = (8 * 60 + 30 <= minute_of_day <= 11 * 60)
    is_peak_evening = (17 * 60 <= minute_of_day <= 20 * 60 + 30)
    is_heavy_traffic = (is_peak_morning or is_peak_evening) and not is_weekend

    congestion_multiplier = 1.0
    traffic_note = "Free-flow traffic conditions"

    if route_type == 'fastest':
        # Fastest routes take major expressways/arterial trunks heavily impacted during rush hour
        if is_heavy_traffic:
            congestion_multiplier = 1.38
            traffic_note = "Heavy congestion on primary expressway trunk"
        else:
            congestion_multiplier = 1.10

    elif route_type == 'eco':
        # Eco routes utilize smoother secondary connectors avoiding major gridlocks
        if is_heavy_traffic:
            congestion_multiplier = 1.04
            traffic_note = "Optimized smooth bypass avoiding peak congestion"
        else:
            congestion_multiplier = 1.01

    elif route_type == 'shortest' or route_type == 'alternative':
        if is_heavy_traffic:
            congestion_multiplier = 1.22
            traffic_note = "Moderate arterial cross-traffic delay"
        else:
            congestion_multiplier = 1.06

    adjusted_duration = round(base_duration_min * congestion_multiplier)
    idling_penalty_factor = 1.0 + (max(0, congestion_multiplier - 1.0) * 0.6)

    return {
        "adjustedDurationMin": adjusted_duration,
        "idlingPenaltyFactor": idling_penalty_factor,
        "trafficStatus": traffic_note
    }