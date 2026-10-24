import React from 'react';

export default function DriverNotifications() {
  const alerts = [
    {
      id: 1,
      tag: 'Eco-Reroute',
      title: 'Automatic Corridor Optimization Active',
      desc: 'Off-route deviation engine is enabled. Real-time GPS will automatically recalculate if off-track exceeds 150m.',
      time: 'Just now',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 2,
      tag: 'Traffic Notice',
      title: 'Heavy Congestion on NH48 Corridor',
      desc: 'High aerodynamic drag and idling detected. GoGreen Eco-Corridor bypass is recommended.',
      time: '25m ago',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      id: 3,
      tag: 'Trip Completed',
      title: 'Trip #1789138117099 Logged',
      desc: 'Emissions report saved to local database. Net CO₂ savings recorded.',
      time: '2h ago',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-4 font-sans">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-xl font-black text-slate-900">Driver Notifications & Dispatch Alerts</h1>
        <span className="text-xs text-slate-400 font-bold">3 Unread</span>
      </div>

      <div className="space-y-3">
        {alerts.map((item) => (
          <div
            key={item.id}
            className={`p-5 rounded-2xl border shadow-sm flex items-start gap-4 transition hover:shadow-md ${item.color}`}
          >
            <span className="text-xl">🔔</span>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-white/70">
                  {item.tag}
                </span>
                <span className="text-[11px] opacity-75 font-semibold">{item.time}</span>
              </div>
              <h3 className="text-sm font-extrabold mt-1 text-slate-900">{item.title}</h3>
              <p className="text-xs mt-0.5 text-slate-600">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}