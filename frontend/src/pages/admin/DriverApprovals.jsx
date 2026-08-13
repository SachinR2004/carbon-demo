import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, User, Loader, AlertCircle, FileText, Clock } from 'lucide-react';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import api from '../../api/api';

const STATUS_BADGE = {
  pending:  'bg-warning/15 text-warning border-warning/30',
  approved: 'bg-eco/15 text-eco border-eco/30',
  rejected: 'bg-danger/15 text-danger border-danger/30',
  blocked:  'bg-neutral-border text-neutral-textMuted border-neutral-border',
};

export default function DriverApprovals() {
  const [drivers, setDrivers] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const fetchDrivers = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get(`/drivers?status=${filter}`);
      setDrivers(res.data);
    } catch {
      setError('Failed to load drivers');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchDrivers(); }, [filter]);

  const handleAction = async (action) => {
    setActionLoading(true); setActionMsg('');
    try {
      await api.patch(`/drivers/${selected.id}/approval`, {
        action,
        reason: action === 'reject' ? rejectReason : undefined
      });
      setActionMsg(`Driver ${action}d successfully`);
      setSelected(null); setRejectReason('');
      fetchDrivers();
    } catch (err) {
      setActionMsg(err.response?.data?.message || `Failed to ${action}`);
    } finally { setActionLoading(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-textMain">Driver Approvals</h1>
        {actionMsg && (
          <span className="text-sm text-eco font-medium">{actionMsg}</span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === s ? 'bg-primary text-white' : 'bg-neutral-border text-neutral-textMuted hover:bg-primary/10'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader className="animate-spin text-primary w-8 h-8" /></div>
      ) : error ? (
        <Card className="flex items-center gap-3 text-danger"><AlertCircle size={20} />{error}</Card>
      ) : drivers.length === 0 ? (
        <Card className="text-center py-12">
          <User className="mx-auto text-neutral-textMuted w-10 h-10 mb-3" />
          <p className="text-neutral-textMuted">No {filter} applications</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {drivers.map(driver => (
            <Card key={driver.id} className="flex flex-col gap-3 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="text-primary w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-textMain">{driver.name}</p>
                    <p className="text-xs text-neutral-textMuted">{driver.email}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_BADGE[driver.approval_status]}`}>
                  {driver.approval_status}
                </span>
              </div>

              <div className="text-sm text-neutral-textMuted space-y-1">
                <div className="flex gap-2"><FileText size={14} className="mt-0.5 flex-shrink-0" /><span>License: {driver.license_no || 'N/A'}</span></div>
                <div className="flex gap-2"><Clock size={14} className="mt-0.5 flex-shrink-0" /><span>{driver.experience_years || 0} yrs experience</span></div>
              </div>

              {driver.rejection_reason && (
                <div className="text-xs bg-danger/5 border border-danger/20 text-danger rounded-lg p-2">
                  Rejection reason: {driver.rejection_reason}
                </div>
              )}

              {driver.approval_status === 'pending' && (
                <Button variant="outline" className="w-full text-sm mt-1" onClick={() => setSelected(driver)}>
                  Review Application
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <Modal isOpen={!!selected} onClose={() => { setSelected(null); setRejectReason(''); }} title="Review Driver Application">
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-neutral-textMuted">Name:</span><p className="font-medium">{selected.name}</p></div>
              <div><span className="text-neutral-textMuted">Email:</span><p className="font-medium">{selected.email}</p></div>
              <div><span className="text-neutral-textMuted">Phone:</span><p className="font-medium">{selected.phone || 'N/A'}</p></div>
              <div><span className="text-neutral-textMuted">License:</span><p className="font-medium">{selected.license_no || 'N/A'}</p></div>
              <div><span className="text-neutral-textMuted">Experience:</span><p className="font-medium">{selected.experience_years || 0} yrs</p></div>
            </div>

            <hr className="border-neutral-border" />

            <div>
              <label className="block text-sm font-semibold text-neutral-textMuted mb-2 uppercase tracking-wide">
                Rejection Reason <span className="text-danger">*</span> <span className="text-xs normal-case">(required to reject)</span>
              </label>
              <textarea rows={3} className="w-full px-3 py-2 rounded-xl border border-neutral-border focus:ring-2 focus:ring-danger focus:border-danger outline-none text-sm resize-none"
                placeholder="Explain why this application is being rejected..."
                value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            </div>

            <div className="flex gap-3">
              <Button variant="danger" className="flex-1" disabled={actionLoading || !rejectReason.trim()}
                onClick={() => handleAction('reject')}>
                {actionLoading ? <Loader className="animate-spin" size={16} /> : <><XCircle size={16} /> Reject</>}
              </Button>
              <Button variant="primary" className="flex-1" disabled={actionLoading}
                onClick={() => handleAction('approve')}>
                {actionLoading ? <Loader className="animate-spin" size={16} /> : <><CheckCircle size={16} /> Approve</>}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
