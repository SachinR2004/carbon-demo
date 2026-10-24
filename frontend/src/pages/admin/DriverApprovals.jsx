import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import api from '../../api/api';
import { CheckCircle2, XCircle, FileText, Clock, User, X, AlertCircle } from 'lucide-react';

export default function DriverApprovals() {
  const [drivers, setDrivers] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      setError('');
      // Calls routes1_2.py list_drivers with status query parameter
      const res = await api.get(`/driver?status=${activeTab}`);
      setDrivers(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load driver approval queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, [activeTab]);

  const handleApprovalAction = async (driverId, action) => {
    try {
      setError('');
      const payload = { action };
      if (action === 'reject') {
        if (!rejectionReason.trim()) {
          setError('Please provide a reason for rejection.');
          return;
        }
        payload.reason = rejectionReason.trim();
      }

      // Calls routes1_2.py update_approval endpoint
      await api.patch(`/driver/${driverId}/approval`, payload);
      
      setSelectedDriver(null);
      setShowRejectInput(false);
      setRejectionReason('');
      loadDrivers(); // Refresh list from backend
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} driver application.`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans p-6 text-slate-800">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Driver Approvals</h1>
        <p className="text-xs text-slate-500 mt-0.5">Review onboarding compliance and permit documentation for new drivers.</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={15} /> <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {['pending', 'approved', 'rejected'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSelectedDriver(null); }}
            className={`px-5 py-2 text-xs font-bold rounded-full transition cursor-pointer capitalize border ${
              activeTab === tab
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <Card className="p-8 rounded-lg border border-slate-200 bg-white text-center text-slate-400 text-xs">
            Loading driver applications from backend database...
          </Card>
        ) : drivers.length === 0 ? (
          <Card className="p-8 rounded-lg border border-slate-200 bg-white text-center text-slate-400 text-xs">
            No driver applications found in the {activeTab} queue.
          </Card>
        ) : (
          drivers.map((driver) => (
            <Card key={driver.id} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm border border-blue-100 flex-shrink-0">
                  <User size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{driver.name || 'Unnamed Driver'}</h3>
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border font-mono ${
                      driver.approval_status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      driver.approval_status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {driver.approval_status || 'pending'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{driver.email || 'No email provided'}</p>
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-mono">
                      <FileText size={13} className="text-slate-400" /> License: {driver.license_no || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock size={13} className="text-slate-400" /> {driver.experience_years} yrs experience
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 sm:pt-0">
                <button
                  onClick={() => { setSelectedDriver(driver); setShowRejectInput(false); setRejectionReason(''); }}
                  className="px-5 py-2.5 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 text-xs font-bold transition cursor-pointer"
                >
                  Review Application
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {selectedDriver && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Driver Onboarding Review</h3>
                <p className="text-xs text-slate-500">Verify submitted registration credentials.</p>
              </div>
              <button 
                onClick={() => setSelectedDriver(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5 uppercase text-[10px]">Full Name</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedDriver.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5 uppercase text-[10px]">Email Address</span>
                  <span className="font-semibold text-slate-700">{selectedDriver.email}</span>
                </div>
              </div>

              <div className="space-y-2.5 px-1 font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Phone Number:</span>
                  <span className="font-bold text-slate-900">{selectedDriver.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">License Number:</span>
                  <span className="font-bold text-slate-900">{selectedDriver.license_no}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Experience:</span>
                  <span className="font-semibold text-slate-900">{selectedDriver.experience_years} Years</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Current Status:</span>
                  <span className="font-bold uppercase text-amber-600">{selectedDriver.approval_status}</span>
                </div>
              </div>

              {selectedDriver.license_doc_url && (
                <div className="pt-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Compliance Document</span>
                  <a
                    href={`http://127.0.0.1:5000/api/v1/auth/license-doc/${selectedDriver.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl font-bold flex items-center justify-between hover:bg-blue-100 transition"
                  >
                    <span>View Uploaded License Document (PDF/Image)</span>
                    <FileText size={16} />
                  </a>
                </div>
              )}

              {showRejectInput && (
                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-rose-600 block">Rejection Reason *</label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejecting application..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 bg-rose-50/50 text-slate-800"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              {!showRejectInput ? (
                <>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    className="flex-1 py-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <XCircle size={15} /> Reject
                  </button>
                  <button
                    onClick={() => handleApprovalAction(selectedDriver.id, 'approve')}
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  >
                    <CheckCircle2 size={15} /> Approve Driver
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleApprovalAction(selectedDriver.id, 'reject')}
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-md"
                >
                  <XCircle size={15} /> Confirm & Submit Rejection
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}