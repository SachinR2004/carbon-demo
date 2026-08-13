import React from 'react';

export default function KPITile({ title, value, unit, trend, icon: Icon, colorClass = "text-primary" }) {
  return (
    <div className="bg-neutral-card rounded-2xl shadow-sm border border-neutral-border p-4 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium text-neutral-textMuted">{title}</span>
        {Icon && <Icon className={`w-5 h-5 ${colorClass}`} />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums text-neutral-textMain">{value}</span>
        {unit && <span className="text-sm font-medium text-neutral-textMuted">{unit}</span>}
      </div>
      {trend && (
        <div className={`text-xs font-medium ${trend.isPositive ? 'text-eco' : 'text-danger'}`}>
          {trend.isPositive ? '+' : ''}{trend.value}% vs last month
        </div>
      )}
    </div>
  );
}
