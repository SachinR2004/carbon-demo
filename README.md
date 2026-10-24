🌱 GoGreen — AI-Driven Eco-Friendly Fleet Routing Platform

An intelligent logistics and fleet routing platform that calculates optimal driving paths, predicts fuel consumption and $CO_2$ emissions using Machine Learning, tracks live GPS positions, and provides smart route suggestions.


📁 Project Architecture Overview

GoGreen/
├── backend/            # Flask REST API + Python ML Models + SQLite Database
│   ├── app/
│   ├── instance/
│   ├── run.py
│   └── requirements.txt
└── frontend/           # React + Vite + Leaflet Maps + Tailwind CSS
    ├── src/
    ├── package.json
    └── vite.config.js


    Quick Start Setup Guide (Windows)
1️⃣ Setting Up the Backend (Python & Flask)

# Navigate to backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment on Windows
venv\Scripts\activate

# Upgrade pip (Recommended)
python -m pip install --upgrade pip

# Install required Python dependencies
pip install -r requirements.txt

# Run the Flask backend server
python run.py
.
.
.
.
Setting Up the Frontend (React & Vite)

# Navigate into the frontend folder
cd frontend

# Install Node.js dependencies
npm install

# Start the Vite development server
npm run dev



⚙️ Environment Variables Setup (.env)
If the frontend fails to connect to the backend, make sure a .env file exists inside the frontend/ folder with the following line:

VITE_API_BASE_URL=http://localhost:5000/api/v1