from flask import Blueprint, make_response
from app.utils.rbac import role_required
import io
import pandas as pd
from reportlab.pdfgen import canvas
from app import db
from app.models import Trip, TripStatus

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/export/excel', methods=['GET'])
@role_required('admin')
def export_excel():
    trips = Trip.query.filter(Trip.status == TripStatus.completed).all()
    data = []
    for t in trips:
        data.append({
            "Trip ID": t.id,
            "Source": t.source,
            "Destination": t.destination,
            "CO2 Saved (kg)": getattr(t, 'actual_co2_kg', 0) * 0.2 if getattr(t, 'actual_co2_kg', 0) else 0,
            "Completed At": t.end_time.isoformat() if t.end_time else "N/A"
        })
    df = pd.DataFrame(data)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Completed Trips')
    output.seek(0)
    
    response = make_response(output.read())
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    response.headers['Content-Disposition'] = 'attachment; filename=gogreen_fleet_report.xlsx'
    return response

@reports_bp.route('/export/pdf', methods=['GET'])
@role_required('admin')
def export_pdf():
    trips = Trip.query.filter(Trip.status == TripStatus.completed).count()
    
    output = io.BytesIO()
    p = canvas.Canvas(output)
    p.drawString(100, 800, "GoGreen Fleet AI - Sustainability Report")
    p.drawString(100, 780, f"Total Completed Trips: {trips}")
    p.drawString(100, 760, "Thank you for using GoGreen Fleet AI.")
    p.showPage()
    p.save()
    output.seek(0)
    
    response = make_response(output.read())
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = 'attachment; filename=gogreen_sustainability.pdf'
    return response
