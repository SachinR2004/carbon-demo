import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader, AlertCircle, Car, CheckCircle } from 'lucide-react';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import api from '../../api/api';

const EMPTY_FORM = { vehicle_no: '', type: '', fuel_type: 'Diesel', load_capacity_kg: 1000, emission_factor_g_per_km: 120, assigned_driver_id: '', status: 'active' };
const FUEL_TYPES = ['Diesel', 'Petrol', 'Electric', 'Hybrid', 'CNG'];
const STATUSES = ['active', 'maintenance', 'retired'];

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const set = (f) => (e) => setForm(v => ({ ...v, [f]: e.target.value }));

  const fetchVehicles = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/vehicles');
      setVehicles(res.data);
    } catch { setError('Failed to load vehicles'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVehicles(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setEditVehicle(null); setShowModal(true); setMsg(''); };
  const openEdit = (v) => {
    setForm({ vehicle_no: v.vehicle_no, type: v.type, fuel_type: v.fuel_type, load_capacity_kg: v.load_capacity_kg, emission_factor_g_per_km: v.emission_factor_g_per_km, assigned_driver_id: v.assigned_driver_id || '', status: v.status });
    setEditVehicle(v); setShowModal(true); setMsg('');
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('');
    try {
      if (editVehicle) {
        await api.patch(`/vehicles/${editVehicle.id}`, { ...form, assigned_driver_id: form.assigned_driver_id || null });
      } else {
        await api.post('/vehicles', { ...form, assigned_driver_id: form.assigned_driver_id || null });
      }
      setShowModal(false); fetchVehicles(); setMsg(editVehicle ? 'Vehicle updated' : 'Vehicle created');
    } catch (err) { setMsg(err.response?.data?.message || 'Operation failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      await api.delete(`/vehicles/${id}`);
      fetchVehicles(); setMsg('Vehicle deleted');
    } catch { setMsg('Failed to delete vehicle'); }
  };

  const inputClass = "w-full px-3 py-2 rounded-xl border border-neutral-border focus:ring-2 focus:ring-primary outline-none text-sm transition-all";
  const labelClass = "block text-xs font-semibold text-neutral-textMuted mb-1 uppercase tracking-wide";

  const STATUS_COLOR = { active: 'text-eco', maintenance: 'text-warning', retired: 'text-neutral-textMuted' };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-textMain">Vehicle Management</h1>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm font-medium text-eco">{msg}</span>}
          <Button variant="primary" onClick={openCreate}><Plus size={16} className="mr-1" />Add Vehicle</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader className="animate-spin text-primary w-8 h-8" /></div>
      ) : error ? (
        <Card className="flex items-center gap-3 text-danger"><AlertCircle size={20} />{error}</Card>
      ) : vehicles.length === 0 ? (
        <Card className="text-center py-12">
          <Car className="mx-auto text-neutral-textMuted w-10 h-10 mb-3" />
          <p className="text-neutral-textMuted mb-4">No vehicles in the fleet yet</p>
          <Button variant="primary" onClick={openCreate}><Plus size={16} className="mr-1" />Add First Vehicle</Button>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-bg border-b border-neutral-border">
                {['Vehicle No', 'Type', 'Fuel', 'Capacity (kg)', 'Emission (g/km)', 'Driver', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral-textMuted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} className="border-b border-neutral-border hover:bg-neutral-bg/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-primary">{v.vehicle_no}</td>
                  <td className="px-4 py-3">{v.type}</td>
                  <td className="px-4 py-3">{v.fuel_type}</td>
                  <td className="px-4 py-3 tabular-nums">{v.load_capacity_kg?.toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums">{v.emission_factor_g_per_km}</td>
                  <td className="px-4 py-3 text-neutral-textMuted">{v.assigned_driver_name || '—'}</td>
                  <td className="px-4 py-3 capitalize font-medium">
                    <span className={STATUS_COLOR[v.status] || ''}>{v.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(v)} className="text-primary hover:text-primary-dark"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(v.id)} className="text-danger hover:opacity-80"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editVehicle ? 'Edit Vehicle' : 'Add Vehicle'}>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {msg && <div className="text-sm text-danger">{msg}</div>}
          <div>
            <label className={labelClass}>Vehicle Number *</label>
            <input className={inputClass} value={form.vehicle_no} onChange={set('vehicle_no')} required disabled={!!editVehicle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Type *</label>
              <input className={inputClass} placeholder="e.g. Van, Truck" value={form.type} onChange={set('type')} required />
            </div>
            <div>
              <label className={labelClass}>Fuel Type *</label>
              <select className={inputClass} value={form.fuel_type} onChange={set('fuel_type')}>
                {FUEL_TYPES.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Load Capacity (kg)</label>
              <input type="number" className={inputClass} value={form.load_capacity_kg} onChange={set('load_capacity_kg')} />
            </div>
            <div>
              <label className={labelClass}>Emission Factor (g/km)</label>
              <input type="number" className={inputClass} value={form.emission_factor_g_per_km} onChange={set('emission_factor_g_per_km')} />
            </div>
            <div>
              <label className={labelClass}>Driver ID (optional)</label>
              <input type="number" className={inputClass} placeholder="Driver ID" value={form.assigned_driver_id} onChange={set('assigned_driver_id')} />
            </div>
            {editVehicle && (
              <div>
                <label className={labelClass}>Status</label>
                <select className={inputClass} value={form.status} onChange={set('status')}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
              {saving ? <Loader className="animate-spin" size={16} /> : editVehicle ? 'Save Changes' : 'Create Vehicle'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
