import os
from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()
limiter = Limiter(key_func=get_remote_address, default_limits=["2000 per day", "500 per hour"])

def create_app(test_config=None):
    # Point Flask to the frontend build folder (frontend/dist) relative to backend/app
    static_folder_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../frontend/dist'))
    
    app = Flask(__name__, static_folder=static_folder_path, static_url_path='')

    # Default config
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'change-me-to-a-random-string')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'change-me-to-a-different-random-string')
    db_url = os.environ.get('DATABASE_URL', 'sqlite:///gogreen.db')
    if db_url.startswith('postgres://'):  # some hosts still hand out the old scheme
        db_url = db_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    if test_config:
        app.config.update(test_config)
    elif os.environ.get('APP_ENV') == 'production':
        for key in ('SECRET_KEY', 'JWT_SECRET_KEY'):
            if app.config[key].startswith('change-me'):
                raise RuntimeError(f'{key} must be set to a real random value in production')

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:5173')
    if cors_origins == '*':
        cors.init_app(app)
    else:
        cors.init_app(app, resources={r"/api/*": {"origins": cors_origins.split(',')}})

    limiter.init_app(app)

    # Import models so Flask-Migrate can detect them
    from app.models import (User, Driver, Vehicle, Trip, Route, TripLog,
                             FuelLog, WeatherLog, Emission, MaintenanceLog,
                             Notification, Setting, MLModel, AuditLog)

    # Register blueprints (using singular /api/v1/driver prefix to match frontend)
    from app.blueprints.auth.routes import auth_bp
    from app.blueprints.drivers.routes import drivers_bp
    from app.blueprints.vehicles.routes import vehicles_bp
    from app.blueprints.trips.routes import trips_bp
    from app.blueprints.ai.routes import ai_bp
    from app.blueprints.notifications.routes import notifications_bp
    from app.blueprints.admin.routes import admin_bp
    from app.blueprints.reports.routes import reports_bp

    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
    app.register_blueprint(drivers_bp, url_prefix='/api/v1/driver')
    app.register_blueprint(vehicles_bp, url_prefix='/api/v1/vehicles')
    app.register_blueprint(trips_bp, url_prefix='/api/v1/trips')
    app.register_blueprint(ai_bp, url_prefix='/api/v1/ai')
    app.register_blueprint(notifications_bp, url_prefix='/api/v1/notifications')
    app.register_blueprint(admin_bp, url_prefix='/api/v1/admin')
    app.register_blueprint(reports_bp, url_prefix='/api/v1/reports')

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        # Let API requests pass through normally
        if path.startswith('api/'):
            return {"error": "Not found"}, 404
            
        # Serve actual static assets (JS, CSS, images) if they exist
        file_path = os.path.join(app.static_folder, path)
        if path != "" and os.path.exists(file_path):
            return send_from_directory(app.static_folder, path)
            
        # Otherwise, always fallback to index.html for React Router
        return send_from_directory(app.static_folder, 'index.html')

    # Force-seed default demo accounts on application startup
    with app.app_context():
        db.create_all()
        # Demo logins (admin@/driver@gogreen.com, password demopass123) are re-created on every start.
        # Set SEED_DEMO_USERS=0 to turn that off once you have real accounts.
        if os.environ.get('SEED_DEMO_USERS', '1') != '1':
            return app
        from app.models import User, Driver, UserRole, ApprovalStatus
        import bcrypt

        # Force seed Admin
        admin_user = User.query.filter_by(email="admin@gogreen.com").first()
        admin_pw = bcrypt.hashpw("demopass123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        if not admin_user:
            admin_user = User(
                name="System Admin",
                email="admin@gogreen.com",
                phone="9999999999",
                password_hash=admin_pw,
                role=UserRole.admin
            )
            db.session.add(admin_user)
        else:
            admin_user.password_hash = admin_pw
            admin_user.role = UserRole.admin

        # Force seed Driver
        driver_user = User.query.filter_by(email="driver@gogreen.com").first()
        driver_pw = bcrypt.hashpw("demopass123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        if not driver_user:
            driver_user = User(
                name="Demo Driver",
                email="driver@gogreen.com",
                phone="8888888888",
                password_hash=driver_pw,
                role=UserRole.driver
            )
            db.session.add(driver_user)
            db.session.flush()
        else:
            driver_user.password_hash = driver_pw
            driver_user.role = UserRole.driver
            db.session.flush()

        # Ensure approved driver profile exists
        driver_profile = Driver.query.filter_by(user_id=driver_user.id).first()
        if not driver_profile:
            driver_profile = Driver(
                user_id=driver_user.id,
                license_no="DL-DEMO-2026-99",
                experience_years=5,
                address="Bengaluru Logistics Hub",
                approval_status=ApprovalStatus.approved
            )
            db.session.add(driver_profile)
        else:
            driver_profile.approval_status = ApprovalStatus.approved

        db.session.commit()

    return app
