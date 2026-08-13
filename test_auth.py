import requests

res_login = requests.post("http://127.0.0.1:5000/api/v1/auth/login", json={"email": "admin@gogreen.com", "password": "AdminPass123!"})
print("Login:", res_login.status_code, res_login.text)

if res_login.status_code == 200:
    token = res_login.json().get("access_token")
    res_me = requests.get("http://127.0.0.1:5000/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    print("Me:", res_me.status_code, res_me.text)
