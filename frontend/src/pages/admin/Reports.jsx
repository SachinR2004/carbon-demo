import React, { useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { FileSpreadsheet, FileText, Download, CheckCircle2 } from 'lucide-react';

export default function Reports() {
  const [downloading, setDownloading] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const handleDownload = (type) => {
    setDownloading(type);
    setSuccessMessage('');

    setTimeout(() => {
      setDownloading(null);
      setSuccessMessage(
        type === 'excel'
          ? 'Successfully downloaded GoGreen_Fleet_Raw_Data.csv'
          : 'Successfully downloaded GoGreen_Executive_Summary_Report.txt'
      );

      const vehicles = JSON.parse(localStorage.getItem('fleetVehicles') || '[]');
      const drivers = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');

      const csvContent = type === 'excel'
        ? "data:text/csv;charset=utf-8," 
          + "--- ACTIVE FLEET ASSETS ---\n"
          + "Registration No,Type,Fuel,Capacity,Assigned Driver\n"
          + vehicles.map(v => `${v.regNo},${v.type},${v.fuel},${v.capacity},${v.driver}`).join("\n")
          + "\n\n--- APPROVED DRIVERS POOL ---\n"
          + "Name,Email,License,Status\n"
          + drivers.map(d => `${d.name},${d.email},${d.license || d.licenseNumber},${d.status}`).join("\n")
        : "GoGreen Logistics Phase-II Executive Summary\nTotal Fleet Sustainability Audit\nNet CO2 Reduction: -24.5%\nStatus: Fully Compliant with H1 2026 Regulations";

      const element = document.createElement('a');
      const file = new Blob([csvContent], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = type === 'excel' ? 'GoGreen_Fleet_Raw_Data.csv' : 'GoGreen_Executive_Summary_Report.txt';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }, 1000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans p-6 text-slate-800">
      
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reports & Exports</h1>
        <p className="text-xs text-slate-500 mt-1">Download system data, audit logs, and sustainability metrics reports.</p>
      </div>

      {successMessage && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 size={16} className="text-blue-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Raw Data Export Card */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-blue-600" />

          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileSpreadsheet size={26} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Raw Data Export</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Export complete CSV spreadsheet containing active fleet assets, telemetry profiles, and driver compliance records.
              </p>
            </div>
          </div>

          <Button
            onClick={() => handleDownload('excel')}
            disabled={downloading === 'excel'}
            variant="primary"
            className="w-full py-4 text-xs font-extrabold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 rounded-2xl cursor-pointer flex items-center justify-center gap-2 text-white"
          >
            <Download size={15} />
            {downloading === 'excel' ? 'Generating Spreadsheet...' : 'Download Raw Data (.csv)'}
          </Button>
        </div>

        {/* Executive Summary Card */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-slate-700" />

          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <FileText size={26} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Executive Summary</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Download structured summary reporting total carbon footprint reductions, fleet health scores, and AI routing efficiency trends.
              </p>
            </div>
          </div>

          <Button
            onClick={() => handleDownload('pdf')}
            disabled={downloading === 'pdf'}
            variant="outline"
            className="w-full py-4 text-xs font-extrabold border-slate-200 hover:bg-slate-50 rounded-2xl cursor-pointer flex items-center justify-center gap-2 text-slate-800"
          >
            <Download size={15} />
            {downloading === 'pdf' ? 'Compiling Report...' : 'Download Executive Summary (.pdf)'}
          </Button>
        </div>

      </div>
    </div>
  );
}