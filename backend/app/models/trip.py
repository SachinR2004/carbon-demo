from app import db
import enum
from datetime import datetime, timezone

class TripStatus(enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"

class Trip(db.Model):
    __tablename__ = 'trips'
    id = db.Column(db.Integer, primary_key=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    source = db.Column(db.String(255), nullable=False)
    destination = db.Column(db.String(255), nullable=False)
    load_weight_kg = db.Column(db.Float)
    purpose = db.Column(db.String(255))
    preferred_time = db.Column(db.DateTime)
    status = db.Column(db.Enum(TripStatus))
    start_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime)
    actual_fuel_l = db.Column(db.Float)
    actual_co2_kg = db.Column(db.Float)

    driver = db.relationship('Driver', backref='trips')
    vehicle = db.relationship('Vehicle', backref='trips')

    __table_args__ = (
        db.Index('idx_driver_status', 'driver_id', 'status'),
    )
