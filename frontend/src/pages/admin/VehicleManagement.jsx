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
  
  // Form states
  const [formData, setFormData] = useState({
    regNo: '',
    type: 'Electric Van',
    fuel: 'Electric',
    capacity: '',
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
      // Load fleet vehicles from localStorage (or backend if applicable)
      const storedVehicles = JSON.parse(localStorage.getItem('fleetVehicles') || '[]');
      if (storedVehicles.length === 0) {
        const defaultVehicles = [
          { regNo: 'EV-2024-X', type: 'Electric Van', fuel: 'Electric', capacity: '2,000', emission: '0 g/km', driver: 'Demo Driver', status: 'Active' },
          { regNo: 'KA-34-7879', type: 'Van', fuel: 'Petrol', capacity: '500', emission: '120 g/km', driver: 'Veerendra R', status: 'Active' }
        ];
        setVehicles(defaultVehicles);
        localStorage.setItem('fleetVehicles', JSON.stringify(defaultVehicles));
      } else {
        setVehicles(storedVehicles);
      }

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

  const handleAddVehicle = (e) => {
    e.preventDefault();
    setError('');

    const formattedRegNo = formData.regNo.trim();
    const exists = vehicles.some(v => v.regNo === formattedRegNo);
    if (exists) {
      setError(`Vehicle with registration number "${formattedRegNo}" already exists in the fleet!`);
      return;
    }

    let calculatedEmission = '0 g/km';
    if (formData.type === 'Van') calculatedEmission = '120 g/km';
    if (formData.type === 'Heavy Truck') calculatedEmission = '350 g/km';

    const newVehicle = {
      regNo: formattedRegNo,
      type: formData.type,
      fuel: formData.fuel,
      capacity: Number(formData.capacity).toLocaleString(),
      emission: calculatedEmission,
      driver: formData.driver,
      driverLicense: formData.driverLicense || 'Verified Permit',
      status: 'Active'
    };

    const updated = [newVehicle, ...vehicles];
    setVehicles(updated);
    localStorage.setItem('fleetVehicles', JSON.stringify(updated));

    setIsModalOpen(false);
    setFormData({ regNo: '', type: 'Electric Van', fuel: 'Electric', capacity: '', driver: 'Unassigned', driverLicense: '' });
    setDriverSearchQuery('');
  };

  const handleDeleteVehicle = (regNo) => {
    const updated = vehicles.filter(v => v.regNo !== regNo);
    setVehicles(updated);
    localStorage.setItem('fleetVehicles', JSON.stringify(updated));
  };

  const assignedDriverNames = vehicles.map(v => v.driver);

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
                  {vehicles.map((v, index) => (
                    <tr key={index} className="hover:bg-slate-50/60 transition">
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
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold block w-max ${v.driver === 'Unassigned' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                          {v.driver}
                        </span>
                        {v.driver !== 'Unassigned' && (
                          <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">Lic: {v.driverLicense || 'Verified'}</span>
                        )}
                      </td>
                      <td className="p-3.5 pr-4 text-right">
                        <button
                          onClick={() => handleDeleteVehicle(v.regNo)}
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
              approvedDrivers.map((driver, index) => {
                const isAssigned = assignedDriverNames.includes(driver.name);
                return (
                  <Card key={index} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center justify-between gap-3">
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
                  <div 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold bg-slate-50 cursor-pointer flex items-center justify-between text-xs"
                  >
                    <span className="truncate">{formData.driver}</span>
                    <span className="text-[10px] text-slate-400">▼</span>
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-2">
                      <div className="relative">
                        <Search size={12} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search driver name, license..."
                          value={driverSearchQuery}
                          onChange={(e) => setDriverSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 outline-none font-mono"
                          autoFocus
                        />
                      </div>

                      <div className="max-h-40 overflow-y-auto space-y-1">
                        <div
                          onClick={() => {
                            setFormData({ ...formData, driver: 'Unassigned', driverLicense: '' });
                            setIsDropdownOpen(false);
                          }}
                          className="p-2 hover:bg-slate-50 rounded-xl cursor-pointer text-slate-600 font-bold"
                        >
                          Unassigned
                        </div>
                        {filteredSearchDrivers.length === 0 ? (
                          <div className="p-2 text-slate-400 text-center">No approved drivers found</div>
                        ) : (
                          filteredSearchDrivers.map((d, idx) => {
                            const lic = d.license_no || 'N/A';
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  setFormData({ ...formData, driver: d.name, driverLicense: lic });
                                  setIsDropdownOpen(false);
                                }}
                                className="p-2 hover:bg-blue-50 rounded-xl cursor-pointer transition space-y-0.5 border-b border-slate-50 last:border-0"
                              >
                                <div className="flex justify-between font-bold text-slate-900">
                                  <span>{d.name}</span>
                                  <span className="font-mono text-[10px] text-emerald-600">{lic}</span>
                                </div>
                                <div className="text-[10px] text-slate-400">{d.email}</div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {formData.driver !== 'Unassigned' && (
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