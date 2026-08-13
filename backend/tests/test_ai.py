def test_ai_fleet_health(client, admin_headers):
    res = client.get('/api/v1/ai/fleet-health', headers=admin_headers)
    assert res.status_code == 200
    assert "models" in res.json
    assert "predictive_maintenance" in res.json
    assert "system_status" in res.json
