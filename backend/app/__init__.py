import os
from flask import Flask
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
    app = Flask(__name__)

    # Default config
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'change-me-to-a-random-string')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'change-me-to-a-different-random-string')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///gogreen.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    if test_config:
        app.config.update(test_config)

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

    # Register blueprints
    from app.blueprints.auth.routes import auth_bp
    from app.blueprints.drivers.routes import drivers_bp
    from app.blueprints.vehicles.routes import vehicles_bp
    from app.blueprints.trips.routes import trips_bp
    from app.blueprints.ai.routes import ai_bp
    from app.blueprints.notifications.routes import notifications_bp

    from app.blueprints.admin.routes import admin_bp
    from app.blueprints.reports.routes import reports_bp

    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
    app.register_blueprint(drivers_bp, url_prefix='/api/v1/drivers')
    app.register_blueprint(vehicles_bp, url_prefix='/api/v1/vehicles')
    app.register_blueprint(trips_bp, url_prefix='/api/v1/trips')
    app.register_blueprint(ai_bp, url_prefix='/api/v1/ai')
    app.register_blueprint(notifications_bp, url_prefix='/api/v1/notifications')
    app.register_blueprint(admin_bp, url_prefix='/api/v1/admin')
    app.register_blueprint(reports_bp, url_prefix='/api/v1/reports')
    # from app.blueprints.trips.routes import trips_bp
    # from app.blueprints.admin.routes import admin_bp
    # from app.blueprints.notifications.routes import notifications_bp
    # from app.blueprints.reports.routes import reports_bp
    # from app.blueprints.ai.routes import ai_bp

    return app
