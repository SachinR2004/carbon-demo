import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import api from '../../api/api';
import { Truck, Plus, Trash2, X, UserCheck, ShieldAlert, Search, ShieldCheck } from 'lucide-react';

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [approvedDrivers, setApprovedDrivers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  
  // Form states matching your original structure
  const [formData, setFormData] = useState({
    regNo: '',
    type: 'Electric Van',
    fuel: 'Electric',
    capacity: '',
    driverId: '',
    driver: 'Unassigned',
    driverLicense: '',
  });

  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch vehicles live from PostgreSQL backend API
      const vehicleRes = await api.get('/vehicles');
      const backendVehicles = (vehicleRes.data || []).map(v => {
        const matchedDriver = approvedDrivers.find(d => d.id === v.assigned_driver_id);
        return {
          id: v.id,
          regNo: v.vehicle_no,
          type: v.type,
          fuel: v.fuel_type,
          capacity: Number(v.load_capacity_kg || 0).toLocaleString(),
          emission: `${v.emission_factor_g_per_km} g/km`,
          driverId: v.assigned_driver_id,
          driver: v.assigned_driver_name || (matchedDriver ? matchedDriver.name : 'Unassigned'),
          driverLicense: matchedDriver ? matchedDriver.license_no : 'Verified Permit',
          status: v.status || 'Active'
        };
      });
      setVehicles(backendVehicles);

      // Fetch approved drivers live from SQL backend database
      const res = await api.get('/driver?status=approved');
      setApprovedDrivers(res.data || []);
    } catch (err) {
      console.error('Failed to load fleet data from backend:', err);
    }
  };

  const handleRegNoChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
    setFormData({ ...formData, regNo: val });
    setError('');
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setError('');

    const formattedRegNo = formData.regNo.trim();
    const exists = vehicles.some(v => v.regNo === formattedRegNo);
    if (exists) {
      setError(`Vehicle with registration number "${formattedRegNo}" already exists in the fleet!`);
      return;
    }

    let calculatedEmission = 120;
    if (formData.type.includes('Electric')) calculatedEmission = 0;
    if (formData.type === 'Heavy Truck') calculatedEmission = 350;

    try {
      // Create vehicle in PostgreSQL backend with assigned_driver_id included
      await api.post('/vehicles', {
        vehicle_no: formattedRegNo,
        type: formData.type,
        fuel_type: formData.fuel,
        load_capacity_kg: Number(formData.capacity.replace(/,/g, '')),
        emission_factor_g_per_km: calculatedEmission,
        assigned_driver_id: formData.driverId ? Number(formData.driverId) : null
      });

      setIsModalOpen(false);
      setFormData({ regNo: '', type: 'Electric Van', fuel: 'Electric', capacity: '', driverId: '', driver: 'Unassigned', driverLicense: '' });
      setDriverSearchQuery('');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to register vehicle.');
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm('Are you sure you want to retire this vehicle?')) return;
    try {
      await api.delete(`/vehicles/${vehicleId}`);
      loadData();
    } catch (err) {
      console.error('Failed to delete vehicle:', err);
    }
  };

  const handleDriverAssignmentChange = async (vehicleId, driverId) => {
    try {
      await api.post(`/vehicles/${vehicleId}/assign`, {
        driver_id: driverId === '' ? null : driverId
      });
      loadData();
    } catch (err) {
      console.error('Failed to update driver assignment:', err);
    }
  };

  const assignedDriverIds = vehicles.map(v => v.driverId);

  const filteredSearchDrivers = approvedDrivers.filter(d => {
    const query = driverSearchQuery.toLowerCase();
    const name = (d.name || '').toLowerCase();
    const email = (d.email || '').toLowerCase();
    const license = (d.license_no || '').toLowerCase();
    return name.includes(query) || email.includes(query) || license.includes(query);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans p-6 text-slate-800">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fleet & Driver Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage vehicles, automated emission profiles, and approved driver deployment pools.</p>
        </div>
        <Button
          onClick={() => {
            loadData();
            setError('');
            setDriverSearchQuery('');
            setIsModalOpen(true);
          }}
          variant="primary"
          className="text-xs px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 shadow-md font-extrabold rounded-xl flex items-center gap-2 cursor-pointer text-white"
        >
          <Plus size={16} /> Register Vehicle
        </Button>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Fleet Vehicles Table */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Truck size={16} className="text-emerald-600" /> Active Fleet Assets ({vehicles.length})
          </h2>

          <Card className="p-0 rounded-2xl border border-slate-200 overflow-hidden shadow-xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="p-3.5 pl-4">Vehicle</th>
                    <th className="p-3.5">Type & Fuel</th>
                    <th className="p-3.5">Payload</th>
                    <th className="p-3.5">Assigned Driver & License</th>
                    <th className="p-3.5 pr-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3.5 pl-4">
                        <span className="font-mono font-bold text-emerald-600 block">{v.regNo}</span>
                        <span className="text-[10px] text-slate-400">{v.emission}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 block">{v.type}</span>
                        <span className="text-[10px] text-slate-500">{v.fuel}</span>
                      </td>
                      <td className="p-3.5 font-mono">{v.capacity} kg</td>
                      <td className="p-3.5">
                        <select
                          value={v.driverId || ''}
                          onChange={(e) => handleDriverAssignmentChange(v.id, e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 outline-none cursor-pointer"
                        >
                          <option value="">Unassigned</option>
                          {approvedDrivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.license_no})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3.5 pr-4 text-right">
                        <button
                          onClick={() => handleDeleteVehicle(v.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Retire Vehicle"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Side: Approved Drivers Pool */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <UserCheck size={16} className="text-blue-600" /> Approved Drivers Pool ({approvedDrivers.length})
          </h2>

          <div className="space-y-3">
            {approvedDrivers.length === 0 ? (
              <Card className="p-6 rounded-2xl border border-slate-200 bg-white text-center text-slate-400 text-xs">
                No approved drivers in the system yet. Approve applications from the Admin Approvals tab.
              </Card>
            ) : (
              approvedDrivers.map((driver) => {
                const isAssigned = assignedDriverIds.includes(driver.id);
                return (
                  <Card key={driver.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-900">{driver.name}</h3>
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${isAssigned ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {isAssigned ? 'Assigned to Fleet' : 'Ready / Available'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{driver.email}</p>
                      <p className="text-[10px] text-slate-400 font-mono">License: {driver.license_no}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 block font-mono">Exp</span>
                      <span className="text-xs font-bold text-slate-700">{driver.experience_years} Yrs</span>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Register Vehicle Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-8 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Truck className="text-emerald-600" size={18} /> Register New Fleet Vehicle
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <ShieldAlert size={14} /> {error}
              </div>
            )}

            <form onSubmit={handleAddVehicle} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Registration Number *</label>
                <input
                  type="text"
                  name="regNo"
                  required
                  maxLength={12}
                  value={formData.regNo}
                  onChange={handleRegNoChange}
                  placeholder="KA-01-EV-9999"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Vehicle Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    <option value="Electric Van">Electric Van (0 g/km)</option>
                    <option value="Van">Van (120 g/km)</option>
                    <option value="Heavy Truck">Heavy Truck (350 g/km)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Powertrain / Fuel *</label>
                  <select
                    name="fuel"
                    value={formData.fuel}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    <option value="Electric">Electric (Zero Emission)</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="CNG">CNG Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Max Payload (kg) *</label>
                  <input
                    type="number"
                    name="capacity"
                    required
                    value={formData.capacity}
                    onChange={handleInputChange}
                    placeholder="3500"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="relative">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assign Approved Driver</label>
                  <select
                    name="driverId"
                    value={formData.driverId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const found = approvedDrivers.find(d => String(d.id) === String(selectedId));
                      setFormData({
                        ...formData,
                        driverId: selectedId,
                        driver: found ? found.name : 'Unassigned',
                        driverLicense: found ? found.license_no : ''
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer text-xs"
                  >
                    <option value="">Unassigned</option>
                    {approvedDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.license_no})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.driverId && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-mono text-emerald-800">
                  <span className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck size={15} className="text-emerald-600" /> Verified Permit Linked:
                  </span>
                  <span className="font-black bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900">
                    {formData.driverLicense}
                  </span>
                </div>
              )}

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md transition cursor-pointer"
                >
                  Save & Register Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
