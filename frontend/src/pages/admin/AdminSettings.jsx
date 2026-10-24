import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { Sliders, Database, Download, Upload, CheckCircle2, Save } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    autoApprove: false,
    strictRouting: true,
    mlInterval: '7'
  });
  const [successMessage, setSuccessMessage] = useState('');

  // Load saved settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (err) {
        console.warn('Failed to parse system settings:', err);
      }
    }
  }, []);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('systemSettings', JSON.stringify(settings));
    setSuccessMessage('System business rules and configuration parameters successfully updated.');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleTriggerBackup = () => {
    const backupPayload = {
      timestamp: new Date().toISOString(),
      fleetVehicles: JSON.parse(localStorage.getItem('fleetVehicles') || '[]'),
      pendingApprovals: JSON.parse(localStorage.getItem('pendingApprovals') || '[]'),
      systemSettings: JSON.parse(localStorage.getItem('systemSettings') || '{}')
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `GoGreen_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setSuccessMessage('Database backup snapshot successfully created and downloaded.');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleRestoreBackup = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsedData = JSON.parse(event.target.result);
          if (parsedData.fleetVehicles) localStorage.setItem('fleetVehicles', JSON.stringify(parsedData.fleetVehicles));
          if (parsedData.pendingApprovals) localStorage.setItem('pendingApprovals', JSON.stringify(parsedData.pendingApprovals));
          if (parsedData.systemSettings) localStorage.setItem('systemSettings', JSON.stringify(parsedData.systemSettings));
          
          setSuccessMessage('Database state successfully restored from snapshot. Refreshing view...');
          setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
          alert('Invalid backup file format. Please upload a valid GoGreen JSON snapshot.');
        }
      };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans p-6 text-slate-800">
      
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Configure application parameters, enterprise business rules, and local database management.</p>
      </div>

      {successMessage && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 size={16} className="text-blue-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Business Rules Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-8 relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-2 h-full bg-blue-600" />
        
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Sliders size={18} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">Business Rules & AI Parameters</h3>
            <p className="text-[11px] text-slate-500">Configure automated compliance checks and telemetry intervals.</p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="space-y-4">
            
            {/* Auto-Approve Checkbox */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <label className="text-xs font-black text-slate-900 block">Auto-Approve Drivers</label>
                <span className="text-[11px] text-slate-500"> Automatically approve new driver registrations upon submission.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoApprove}
                onChange={(e) => setSettings({ ...settings, autoApprove: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
              />
            </div>

            {/* Strict Routing Checkbox */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <label className="text-xs font-black text-slate-900 block">Strict Corridor Routing</label>
                <span className="text-[11px] text-slate-500">Flag all active telemetry route deviations as severe security incidents.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.strictRouting}
                onChange={(e) => setSettings({ ...settings, strictRouting: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
              />
            </div>

            {/* ML Interval Input */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-900 block">AI Model Retrain Interval (Days)</label>
              <input
                type="number"
                value={settings.mlInterval}
                onChange={(e) => setSettings({ ...settings, mlInterval: e.target.value })}
                className="w-full max-w-xs px-4 py-3 rounded-xl border border-slate-200 text-xs font-mono font-semibold bg-slate-50 focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>

          </div>

          <Button
            type="submit"
            variant="primary"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2"
          >
            <Save size={15} /> Save Settings
          </Button>
        </form>
      </div>

      {/* Data Management Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-8 relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-2 h-full bg-slate-800" />

        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
            <Database size={18} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">Local Database Management</h3>
            <p className="text-[11px] text-slate-500">Backup and restore local storage JSON snapshots across sessions.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Backup Box */}
          <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4">
            <div>
              <h4 className="text-xs font-black text-slate-900">Backup Database</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Create a manual JSON snapshot of all current fleet assets, driver approvals, and configuration parameters.
              </p>
            </div>
            <Button
              onClick={handleTriggerBackup}
              variant="outline"
              className="w-full py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <Download size={15} /> Trigger Backup (.json)
            </Button>
          </div>

          {/* Restore Box */}
          <div className="p-6 rounded-2xl border border-amber-200 bg-amber-50/30 flex flex-col justify-between space-y-4">
            <div>
              <h4 className="text-xs font-black text-slate-900">Restore Database</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Restore application state from a previously saved JSON backup file. This will overwrite current session data.
              </p>
            </div>
            
            <label className="w-full py-3 bg-white hover:bg-amber-50 text-slate-900 border border-amber-300 text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2 transition">
              <Upload size={15} className="text-amber-600" />
              <span>Initiate Restore</span>
              <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
            </label>
          </div>

        </div>
      </div>

    </div>
  );
}