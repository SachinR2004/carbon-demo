import sys
import os

# Add the backend directory to python path so we can import app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import User, UserRole, Driver, ApprovalStatus, Vehicle, VehicleStatus
import bcrypt

app = create_app()

def seed_data():
    with app.app_context():
        db.create_all()

        if User.query.filter_by(email='admin@gogreen.com').first():
            print("Database already seeded.")
            return

        print("Seeding demo data...")

        # Create Admin
        admin_pass = bcrypt.hashpw('AdminPass123!'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        admin = User(
            name='System Admin',
            email='admin@gogreen.com',
            phone='+10000000001',
            password_hash=admin_pass,
            role=UserRole.admin
        )
        db.session.add(admin)
        db.session.commit() # Commit to get admin.id for approval

        # Create Driver
        driver_pass = bcrypt.hashpw('DriverPass123!'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        driver_user = User(
            name='Demo Driver',
            email='driver@gogreen.com',
            phone='+10000000002',
            password_hash=driver_pass,
            role=UserRole.driver
        )
        db.session.add(driver_user)
        db.session.commit()

        # Create Driver Profile
        driver_profile = Driver(
            user_id=driver_user.id,
            license_no='DL-DEMO-1234',
            experience_years=5,
            approval_status=ApprovalStatus.approved,
            approved_by=admin.id
        )
        db.session.add(driver_profile)
        db.session.commit()

        # Create Vehicle
        vehicle = Vehicle(
            vehicle_no='EV-2024-X',
            type='Electric Van',
            fuel_type='Electric',
            load_capacity_kg=2000,
            emission_factor_g_per_km=0,
            assigned_driver_id=driver_profile.id,
            status=VehicleStatus.active
        )
        db.session.add(vehicle)
        db.session.commit()

        print("Demo data seeded successfully.")
        print("Admin: admin@gogreen.com / AdminPass123!")
        print("Driver: driver@gogreen.com / DriverPass123!")

if __name__ == '__main__':
    seed_data()
