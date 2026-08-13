import React from 'react';

export default function RouteCard({ route, isSelected, onSelect }) {
  return (
    <div 
      className={`relative rounded-2xl shadow-sm border p-4 cursor-pointer transition-all ${
        isSelected 
          ? 'border-primary bg-primary/5 ring-2 ring-primary ring-opacity-50' 
          : 'border-neutral-border bg-neutral-card hover:border-primary-light'
      }`}
      onClick={() => onSelect(route)}
    >
      {route.is_recommended && (
        <div className="absolute -top-3 -right-2 bg-eco text-white text-[10px] font-bold px-2 py-1 rounded-full shadow">
          AI Recommended
        </div>
      )}
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-neutral-textMain text-lg">{route.route_label}</span>
        <span className="font-medium text-primary tabular-nums">{route.distance_km} km</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-neutral-textMuted mt-2">
        <div>Fuel: <span className="font-medium text-neutral-textMain">{route.predicted_fuel_l} L</span></div>
        <div>CO2: <span className="font-medium text-neutral-textMain">{route.predicted_co2_kg} kg</span></div>
        <div>Time: <span className="font-medium text-neutral-textMain">{Math.round(route.distance_km / route.avg_speed * 60)} min</span></div>
        <div>Eco Score: <span className="font-medium text-eco">{route.eco_score}/100</span></div>
      </div>
    </div>
  );
}
