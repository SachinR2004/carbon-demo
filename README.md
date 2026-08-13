# GoGreen Fleet AI

GoGreen Fleet AI is a full-stack platform for predictive logistics and sustainability tracking. It uses Machine Learning (RandomForestRegressor) to predict fuel consumption and CO₂ emissions, suggesting the most eco-friendly routes for delivery drivers.

## Project Structure
- `/backend`: Flask REST API serving ML inferences, JWT Auth, and Admin metrics.
- `/frontend`: React application built with Vite and TailwindCSS v3.
- `/backend/app/ml`: Scikit-Learn training pipelines and `.joblib` models.

## Default Demo Accounts
- **Admin**: `admin@gogreen.com` | `Pass123!`
- **Driver**: `driver@gogreen.com` | `Pass123!`

## Environment Variables
See `backend/.env.example` and `frontend/.env.example` for details.

## Running the App

### 1. Backend (Flask)
```bash
cd backend
# Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\activate   # Windows
# source venv/bin/activate # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run the backend server
python run.py
```

### 2. Frontend (React + Vite)
```bash
cd frontend
# Install dependencies
npm install

# Run the development server
npm run dev
```

## API Summary
- `POST /api/v1/auth/login`: Authenticate and receive JWT.
- `GET /api/v1/admin/stats`: Get system-wide fleet metrics.
- `GET /api/v1/ai/fleet-health`: ML model performance and maintenance risks.
- `POST /api/v1/trips/<id>/log`: Send active trip telemetry (GPS pings).
- `GET /api/v1/reports/export/pdf`: Download executive summary.
