import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Loader, AlertCircle, CloudRain, Sun, CloudSnow, Search } from 'lucide-react';
import Button from '../../components/Button';
import Card from '../../components/Card';
import MapView from '../../components/MapView';
import RouteCard from '../../components/RouteCard';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';

export default function NewTrip() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [loadWeight, setLoadWeight] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [tripData, setTripData] = useState(null); // { trip_id, weather, routes }
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [selecting, setSelecting] = useState(false);

  // Check if driver has a vehicle
  if (user?.role === 'driver' && !user?.driver?.vehicle) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="text-center">
          <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Vehicle Assigned</h2>
          <p className="text-neutral-textMuted mb-6">You cannot create a trip without an assigned vehicle. Please contact your fleet administrator.</p>
          <Button variant="outline" onClick={() => navigate('/driver')}>Return to Dashboard</Button>
        </Card>
      </div>
    );
  }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!source || !destination) return;
    
    setLoading(true); setError(''); setTripData(null); setSelectedRouteId(null);
    try {
      const res = await api.post('/trips', {
        source,
        destination,
        load_weight_kg: loadWeight ? parseFloat(loadWeight) : 0,
        purpose: 'Delivery'
      });
      setTripData(res.data);
      // Auto-select the AI recommended route
      const recommended = res.data.routes.find(r => r.is_recommended);
      if (recommended) setSelectedRouteId(recommended.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate routes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrip = async () => {
    if (!selectedRouteId || !tripData) return;
    setSelecting(true);
    try {
      await api.patch(`/trips/${tripData.trip_id}/select-route`, { route_id: selectedRouteId });
      await api.post(`/trips/${tripData.trip_id}/start`);
      navigate(`/driver/active-trip/${tripData.trip_id}`);
    } catch (err) {
      setError('Failed to start trip.');
    } finally {
      setSelecting(false);
    }
  };

  const getWeatherIcon = (cond) => {
    if (cond === 'Rain') return <CloudRain size={20} className="text-sky" />;
    if (cond === 'Snow') return <CloudSnow size={20} className="text-sky" />;
    return <Sun size={20} className="text-warning" />;
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 max-w-7xl mx-auto h-[calc(100vh-6rem)]">
      
      {/* Left panel: Form & Routes */}
      <div className="w-full xl:w-[450px] flex flex-col gap-4 overflow-y-auto pr-2 pb-20 md:pb-0">
        <h1 className="text-2xl font-bold text-neutral-textMain">Plan New Trip</h1>
        
        {/* Search Form */}
        <Card className="flex-shrink-0 z-10 relative">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div className="relative">
              <MapPin size={18} className="absolute left-3 top-3 text-neutral-textMuted" />
              <input type="text" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-border focus:ring-2 focus:ring-primary outline-none text-sm transition-all bg-neutral-bg/50" 
                placeholder="Origin" value={source} onChange={e => setSource(e.target.value)} required />
            </div>
            
            <div className="flex justify-center -my-2 relative z-10">
              <div className="w-8 h-8 rounded-full bg-white border border-neutral-border flex items-center justify-center text-neutral-textMuted shadow-sm">
                <Navigation size={14} className="rotate-180" />
              </div>
            </div>

            <div className="relative">
              <MapPin size={18} className="absolute left-3 top-3 text-primary" />
              <input type="text" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-border focus:ring-2 focus:ring-primary outline-none text-sm transition-all bg-neutral-bg/50" 
                placeholder="Destination" value={destination} onChange={e => setDestination(e.target.value)} required />
            </div>
            
            <div>
              <input type="number" className="w-full px-4 py-2.5 rounded-xl border border-neutral-border focus:ring-2 focus:ring-primary outline-none text-sm transition-all bg-neutral-bg/50" 
                placeholder="Load Weight (kg, optional)" value={loadWeight} onChange={e => setLoadWeight(e.target.value)} />
            </div>

            <Button type="submit" variant="primary" disabled={loading} className="w-full py-3">
              {loading ? <Loader className="animate-spin" size={18} /> : <><Search size={18} className="mr-2" /> Find Routes</>}
            </Button>
            
            {error && <div className="text-sm text-danger mt-2">{error}</div>}
          </form>
        </Card>

        {/* Results */}
        {tripData && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Weather */}
            <div className="flex items-center gap-3 bg-sky/10 border border-sky/20 rounded-xl p-3">
              {getWeatherIcon(tripData.weather.condition)}
              <div className="flex-1 text-sm">
                <p className="font-semibold text-neutral-textMain">Weather at Origin</p>
                <p className="text-neutral-textMuted">{tripData.weather.condition}, {tripData.weather.temperature.toFixed(1)}°C</p>
              </div>
              {tripData.weather.alert_flag && (
                <span className="text-xs font-bold text-danger bg-danger/10 px-2 py-1 rounded-md uppercase tracking-wider">Alert</span>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <h3 className="font-bold text-neutral-textMain">Candidate Routes</h3>
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                {tripData.routes.length} options
              </span>
            </div>

            {/* Route List */}
            <div className="flex flex-col gap-3">
              {tripData.routes.sort((a,b) => b.eco_score - a.eco_score).map(route => (
                <RouteCard 
                  key={route.id} 
                  route={route} 
                  isSelected={selectedRouteId === route.id}
                  onSelect={() => setSelectedRouteId(route.id)}
                />
              ))}
            </div>

            {/* Sticky bottom CTA */}
            <div className="sticky bottom-0 bg-gradient-to-t from-neutral-bg via-neutral-bg pt-4 pb-2 mt-2">
              <Button 
                variant="primary" 
                className="w-full shadow-lg text-lg py-3"
                disabled={!selectedRouteId || selecting}
                onClick={handleStartTrip}
              >
                {selecting ? <Loader className="animate-spin" size={18} /> : 'Start Trip'}
              </Button>
            </div>
            
          </div>
        )}
      </div>

      {/* Right panel: Map */}
      <div className="flex-1 hidden md:block relative bg-neutral-card rounded-2xl border border-neutral-border shadow-sm overflow-hidden min-h-[400px]">
        {tripData ? (
          <MapView routes={tripData.routes} center={{lat: 40.7128, lng: -74.0060}} origin={source} destination={destination} />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-textMuted bg-neutral-bg/50">
            <MapPin size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">Enter destination to view map</p>
          </div>
        )}
      </div>
      
    </div>
  );
}
