
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
