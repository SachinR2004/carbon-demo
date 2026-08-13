import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Flag, AlertTriangle, CheckCircle, Loader, ExternalLink } from 'lucide-react';
import Button from '../../components/Button';
import Card from '../../components/Card';
import MapView from '../../components/MapView';
import api from '../../api/api';

// Straight-line distance between two lat/lng points, in meters.
// Good enough for a live "how close am I" estimate without re-hitting the
// Directions API on every GPS tick.
function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const ARRIVAL_RADIUS_M = 100; // count as "arrived" once within 100m of destination
const LOG_INTERVAL_MS = 5000; // throttle GPS pings sent to the backend

export default function ActiveTrip() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [routeInfo, setRouteInfo] = useState(null); // { distanceMeters, endLocation, ... } from MapView
  const [currentPosition, setCurrentPosition] = useState(null);
  const [geoError, setGeoError] = useState('');
  const [progress, setProgress] = useState(0); // 0 to 100, driven by real position now
  const [arrived, setArrived] = useState(false);
  const [deviated, setDeviated] = useState(false);
  const [ending, setEnding] = useState(false);

  const lastLogAtRef = useRef(0);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const res = await api.get(`/trips/${id}`);
        setTrip(res.data);
      } catch (err) {
        setError('Failed to load trip');
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [id]);

  const handleRouteInfo = useCallback((info) => {
    setRouteInfo(info);
  }, []);

  // Real GPS tracking: watch the device's actual position, compute progress
  // against the route's real distance, and throttle pings up to the backend.
  useEffect(() => {
    if (!trip || trip.status !== 'in_progress' || arrived) return;

    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation is not supported on this device/browser.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentPosition(here);
        setGeoError('');

        if (routeInfo?.endLocation && routeInfo?.distanceMeters) {
          const remaining = distanceMeters(here, routeInfo.endLocation);
          const pct = Math.min(
            100,
            Math.max(0, Math.round(100 - (remaining / routeInfo.distanceMeters) * 100))
          );
          setProgress(pct);

          if (remaining <= ARRIVAL_RADIUS_M) {
            setProgress(100);
            setArrived(true);
          }
        }

        const now = Date.now();
        if (now - lastLogAtRef.current > LOG_INTERVAL_MS) {
          lastLogAtRef.current = now;
          api.post(`/trips/${id}/log`, { lat: here.lat, lng: here.lng, is_deviated: deviated }).catch(() => {});
        }
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied — allow location access in your browser to track this trip live.'
            : 'Could not get your current location.'
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [trip, arrived, routeInfo, deviated, id]);

  const handleSimulateDeviation = async () => {
    setDeviated(true);
    // The next GPS ping will send is_deviated=true, triggering notifications
    alert('Simulating route deviation! Admin will be notified.');
  };

  const handleEndTrip = async () => {
    setEnding(true);
    try {
      // Send mock actuals
      const actualFuel = trip.routes[0]?.predicted_fuel_l * (deviated ? 1.3 : 0.95) || 0;
      const actualCo2 = trip.routes[0]?.predicted_co2_kg * (deviated ? 1.3 : 0.95) || 0;

      await api.post(`/trips/${id}/end`, {
        actual_fuel_l: actualFuel,
        actual_co2_kg: actualCo2
      });
      navigate('/driver/history');
    } catch (err) {
      alert('Failed to end trip');
      setEnding(false);
    }
  };

  const openInGoogleMaps = () => {
    if (!trip) return;
    const base = 'https://www.google.com/maps/dir/?api=1';
    const originParam = currentPosition
      ? `${currentPosition.lat},${currentPosition.lng}`
      : trip.source;
    const url = `${base}&origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(trip.destination)}&travelmode=driving`;
    window.open(url, '_blank', 'noopener');
  };

  if (loading) return <div className="flex justify-center py-20"><Loader className="animate-spin text-primary" size={32} /></div>;
  if (error || !trip) return <div className="text-center text-danger py-20">{error}</div>;

  const selectedRoute = trip.routes?.find(r => r.is_recommended) || trip.routes[0];

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-textMain">Active Trip #{trip.id}</h1>
          <p className="text-neutral-textMuted flex items-center gap-2 mt-1">
            <MapPin size={14} /> {trip.source} <span className="mx-1">→</span> <Flag size={14} /> {trip.destination}
          </p>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${progress === 100 ? 'bg-eco/10 text-eco' : 'bg-primary/10 text-primary'}`}>
          {progress === 100 ? 'Arrived' : 'In Transit'}
        </div>
      </div>

      {deviated && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Route Deviation Detected</p>
            <p className="text-sm opacity-90">You have strayed from the AI-optimized path. This will lower your eco-score for this trip. An alert has been sent to dispatch.</p>
          </div>
        </div>
      )}

      {geoError && (
        <div className="bg-warning/10 border border-warning/20 text-warning p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Live tracking paused</p>
            <p className="text-sm opacity-90">{geoError} You can still open the route in Google Maps or end the trip manually below.</p>
          </div>
        </div>
      )}

      {/* Real Map + Progress Overlay */}
      <Card className="flex flex-col gap-6 p-6">
        <div className="relative h-64 rounded-xl overflow-hidden">
          <MapView
            origin={trip.source}
            destination={trip.destination}
            currentPosition={currentPosition}
            onRouteInfo={handleRouteInfo}
          />

          <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-white via-white/90 to-transparent">
            <div className="flex justify-between text-xs font-bold text-neutral-textMuted mb-2">
              <span>Origin</span>
              <span>Destination</span>
            </div>

            <div className="h-4 bg-white border border-neutral-border rounded-full overflow-hidden relative">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${deviated ? 'bg-danger' : 'bg-primary'}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-center mt-3">
              <div className="bg-white px-4 py-2 rounded-xl shadow-md border border-neutral-border flex items-center gap-2">
                <Navigation size={18} className={`animate-pulse ${deviated ? 'text-danger' : 'text-primary'}`} />
                <span className="font-bold text-sm text-neutral-textMain">
                  {routeInfo ? `${progress}% Complete` : 'Waiting for route...'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-between items-center bg-neutral-bg rounded-xl p-4">
          <div>
            <p className="text-xs text-neutral-textMuted uppercase font-bold tracking-wide">Target Route</p>
            <p className="font-medium text-neutral-textMain">{selectedRoute?.route_label || 'Default'}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-textMuted uppercase font-bold tracking-wide">Predicted Fuel</p>
            <p className="font-medium text-primary">{selectedRoute?.predicted_fuel_l || 0} L</p>
          </div>
          <div>
            <p className="text-xs text-neutral-textMuted uppercase font-bold tracking-wide">Predicted CO₂</p>
            <p className="font-medium text-eco">{selectedRoute?.predicted_co2_kg || 0} kg</p>
          </div>
        </div>

        <div className="flex gap-4 pt-2">
          <Button variant="outline" className="flex-1" onClick={openInGoogleMaps}>
            <ExternalLink size={18} className="mr-2" /> Open Live Directions in Google Maps
          </Button>
        </div>

        <div className="flex gap-4 pt-4 border-t border-neutral-border">
          <Button
            variant="outline"
            className="flex-1 border-warning text-warning hover:bg-warning hover:text-white"
            onClick={handleSimulateDeviation}
            disabled={deviated || progress === 100}
          >
            <AlertTriangle size={18} className="mr-2" /> Simulate Deviation
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleEndTrip}
            disabled={progress < 100 || ending}
          >
            {ending ? <Loader className="animate-spin" size={18} /> : <><CheckCircle size={18} className="mr-2" /> Complete Trip</>}
          </Button>
        </div>
      </Card>

    </div>
  );
}
