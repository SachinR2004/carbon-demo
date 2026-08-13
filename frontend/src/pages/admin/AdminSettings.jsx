import React, { useState, useEffect } from 'react';
import { Settings, Save, Database, HardDrive, Loader } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import api from '../../api/api';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    auto_approve_drivers: false,
    strict_routing: true,
    ml_retrain_interval_days: 7
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/settings').then(res => {
      setSettings(res.data);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/admin/settings', settings);
      alert('Settings saved successfully');
    } catch {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action) => {
    try {
      const res = await api.post(`/admin/${action}`);
      alert(res.data.message);
    } catch {
      alert(`Failed to ${action} database`);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-neutral-textMain/10 rounded-xl flex items-center justify-center text-neutral-textMain">
          <Settings size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-textMain">System Settings</h1>
          <p className="text-sm text-neutral-textMuted">Configure application parameters and data management</p>
        </div>
      </div>

      <Card className="flex flex-col gap-6">
        <h2 className="font-bold text-neutral-textMain border-b border-neutral-border pb-2">Business Rules</h2>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm text-neutral-textMain">Auto-Approve Drivers</p>
            <p className="text-xs text-neutral-textMuted">Automatically approve new driver registrations</p>
          </div>
          <input type="checkbox" className="w-5 h-5 rounded border-neutral-border text-primary focus:ring-primary" 
            checked={settings.auto_approve_drivers} 
            onChange={e => setSettings({...settings, auto_approve_drivers: e.target.checked})} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm text-neutral-textMain">Strict Routing</p>
            <p className="text-xs text-neutral-textMuted">Flag all route deviations as severe</p>
          </div>
          <input type="checkbox" className="w-5 h-5 rounded border-neutral-border text-primary focus:ring-primary" 
            checked={settings.strict_routing} 
            onChange={e => setSettings({...settings, strict_routing: e.target.checked})} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm text-neutral-textMain">ML Retrain Interval (Days)</p>
            <p className="text-xs text-neutral-textMuted">How often the AI models should retrain</p>
          </div>
          <input type="number" className="w-20 px-3 py-1.5 rounded-lg border border-neutral-border text-sm" 
            value={settings.ml_retrain_interval_days} 
            onChange={e => setSettings({...settings, ml_retrain_interval_days: parseInt(e.target.value)})} />
        </div>

        <div className="pt-4 flex justify-end">
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader size={16} className="animate-spin" /> : <><Save size={16} className="mr-2"/> Save Settings</>}
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-6">
        <h2 className="font-bold text-neutral-textMain border-b border-neutral-border pb-2 flex items-center gap-2">
          <Database size={18}/> Data Management
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 border border-neutral-border rounded-xl">
            <h3 className="font-bold text-sm text-neutral-textMain mb-1">Backup Database</h3>
            <p className="text-xs text-neutral-textMuted mb-4">Create a manual snapshot of the current database state.</p>
            <Button variant="outline" className="w-full text-sm" onClick={() => handleAction('backup')}>
              <HardDrive size={14} className="mr-2"/> Trigger Backup
            </Button>
          </div>
          <div className="p-4 border border-danger/20 bg-danger/5 rounded-xl">
            <h3 className="font-bold text-sm text-danger mb-1">Restore Database</h3>
            <p className="text-xs text-danger/80 mb-4">Restore from the latest available snapshot. This will overwrite current data.</p>
            <Button variant="outline" className="w-full text-sm border-danger text-danger hover:bg-danger hover:text-white" onClick={() => handleAction('restore')}>
              <Database size={14} className="mr-2"/> Initiate Restore
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
