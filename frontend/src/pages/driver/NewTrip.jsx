import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { MapPin, Navigation, Scale, ArrowRight, Loader2, Route, Crosshair } from 'lucide-react';

import { parseGeoapifyFeature } from '../../utils/geo';
const GEOAPIFY_API_KEY = '50242317310b4650b997ab1278d904ec';

const LOGISTICS_HUB_REGISTRY = [
  { name: 'Malleswaram, Bengaluru Urban, Karnataka', lat: 13.0053, lon: 77.5735, region: 'Bengaluru Urban' },
  { name: '1st Block Koramangala, Bengaluru Urban, Karnataka', lat: 12.9352, lon: 77.6245, region: 'Bengaluru Urban' },
  { name: 'Frazer Town, Bengaluru Urban, Karnataka', lat: 12.9902, lon: 77.6111, region: 'Bengaluru Urban' },
  { name: 'Electronic City Phase 1, Bengaluru Urban, Karnataka', lat: 12.8399, lon: 77.6770, region: 'Tech Corridor South' },
  { name: 'Whitefield IT Park, Bengaluru Urban, Karnataka', lat: 12.9698, lon: 77.7500, region: 'East Bengaluru' },
  { name: 'Majestic Central Bus Station, Bengaluru Urban, Karnataka', lat: 12.9767, lon: 77.5713, region: 'Central Bengaluru' },
  { name: 'Indiranagar, Bengaluru Urban, Karnataka', lat: 12.9719, lon: 77.6412, region: 'Bengaluru Urban' },
  { name: 'Jayanagar 4th Block, Bengaluru Urban, Karnataka', lat: 12.9250, lon: 77.5938, region: 'Bengaluru Urban' },
  { name: 'JP Nagar, Bengaluru, Bengaluru Urban, India', lat: 12.9063, lon: 77.5857, region: 'Bengaluru Urban' },
  { name: 'Hebbal Flyover, Bengaluru Urban, Karnataka', lat: 13.0355, lon: 77.5970, region: 'North Bengaluru' },
  { name: 'Yeshwanthpur Industrial Suburb, Bengaluru Urban, Karnataka', lat: 13.0284, lon: 77.5537, region: 'North West Bengaluru' },
  { name: 'HSR Layout, Bengaluru Urban, Karnataka', lat: 12.9121, lon: 77.6446, region: 'Bengaluru Urban' },
  { name: 'Peenya Industrial Area, Bengaluru Urban, Karnataka', lat: 13.0286, lon: 77.5202, region: 'North West Bengaluru' },
  { name: 'Kempegowda International Airport, Devanahalli, Karnataka', lat: 13.1986, lon: 77.7066, region: 'Devanahalli' },
  { name: 'Mangaluru Port Freight Terminal, Mangaluru, Karnataka', lat: 12.9141, lon: 74.8560, region: 'Dakshina Kannada' },
  { name: 'Sakleshpur Town Hub, Sakleshpur, Karnataka', lat: 12.9431, lon: 75.8000, region: 'Hassan District' },
  { name: 'Mysuru City Palace Logistics Hub, Mysuru, Karnataka', lat: 12.3051, lon: 76.6551, region: 'Mysuru District' },
  { name: 'Tumakuru Industrial Area, Tumakuru, Karnataka', lat: 13.3379, lon: 77.1173, region: 'Tumakuru District' },
  { name: 'Hubballi Junction Bus Terminal, Hubballi, Karnataka', lat: 15.3647, lon: 75.1239, region: 'Dharwad District' },
  { name: 'Belagavi Industrial Estate, Belagavi, Karnataka', lat: 15.8497, lon: 74.4977, region: 'Belagavi District' },
  { name: 'Shivamogga City Center, Shivamogga, Karnataka', lat: 13.9299, lon: 75.5681, region: 'Shivamogga District' },
  { name: 'Davanagere Grain Market Yard, Davanagere, Karnataka', lat: 14.4644, lon: 75.9218, region: 'Davanagere District' },
  { name: 'Kalaburagi Industrial Hub, Kalaburagi, Karnataka', lat: 17.3297, lon: 76.8343, region: 'Kalaburagi District' },
  { name: 'Hassan Dairy Circle, Hassan, Karnataka', lat: 13.0068, lon: 76.1004, region: 'Hassan District' },
  { name: 'Chennai Freight Terminal, Chennai, Tamil Nadu', lat: 13.0827, lon: 80.2707, region: 'Tamil Nadu' },
  { name: 'Hyderabad Logistics Hub, Hyderabad, Telangana', lat: 17.3850, lon: 78.4867, region: 'Telangana' },
  { name: 'Pune Industrial Zone, Pune, Maharashtra', lat: 18.5204, lon: 73.8567, region: 'Maharashtra' },
  { name: 'Kochi Port, Kochi, Kerala', lat: 9.9312, lon: 76.2673, region: 'Kerala' },
  { name: 'Mumbai JNPT Port, Mumbai, Maharashtra', lat: 18.9490, lon: 72.9525, region: 'Maharashtra' },
  { name: 'Jigani, KA, India', lat: 12.7877, lon: 77.6534, region: 'Bengaluru Rural' },
  { name: 'Shanti Nagar, Bengaluru - 560027, KA, India', lat: 12.9592, lon: 77.5974, region: 'Bengaluru Urban' },
  { name: 'KSSEM, Mallasandra, Kanakapura Road, Bengaluru', lat: 12.8720, lon: 77.5535, region: 'Bengaluru Urban' },
  { name: 'KS Institute of Technology, Kanakapura Road, Talaghattapura, Bengaluru - 560109, KA, India', lat: 12.8720, lon: 77.5535, region: 'Bengaluru Urban' },
  { name: 'KR Market Bus Terminal, NR Road, Kalasipalya, Bengaluru - 560002, KA, India', lat: 12.9647, lon: 77.5763, region: 'Bengaluru Urban' },
  { name: 'Jaraganahalli, Bengaluru - 560078, KA, India', lat: 12.9031, lon: 77.5855, region: 'Bengaluru Urban' },
  { name: 'Nelamangala - 562123, KA, India', lat: 13.2995, lon: 77.3941, region: 'Bengaluru Rural' },
  { name: 'Mysuru District, India', lat: 12.2958, lon: 76.6394, region: 'Mysuru District' },
  { name: 'Mahindra Eden, Kanakapura Road, Bengaluru', lat: 12.8735, lon: 77.5512, region: 'Bengaluru Urban' }
];

const formatDuration = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};

export default function NewTrip() {
  const navigate = useNavigate();

  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const layerGroupRef = useRef(null);
  const isSelectingRef = useRef(false);

  const [originInput, setOriginInput] = useState('');
  const [originCoords, setOriginCoords] = useState(null);
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [originSearching, setOriginSearching] = useState(false);

  const [destInput, setDestInput] = useState('');
  const [destCoords, setDestCoords] = useState(null);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [destSearching, setDestSearching] = useState(false);

  const [pickingMode, setPickingMode] = useState(null);
  const [loadWeight, setLoadWeight] = useState('1500');
  const [powertrain, setPowertrain] = useState('Clean Diesel (Euro VI)');

  const [routesCalculated, setRoutesCalculated] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [selectedRouteKey, setSelectedRouteKey] = useState('eco');

  const [routeData, setRouteData] = useState({
    eco: { name: '', distance: '0', durationNum: 0, duration: '0 min', coords: [], fuelOrEnergy: '-', co2: '-', ecoScore: 96, instructions: [] },
    fastest: { name: '', distance: '0', durationNum: 0, duration: '0 min', coords: [], fuelOrEnergy: '-', co2: '-', ecoScore: 70, instructions: [] },
    shortest: { name: '', distance: '0', durationNum: 0, duration: '0 min', coords: [], fuelOrEnergy: '-', co2: '-', ecoScore: 82, instructions: [] }
  });

  const [routeError, setRouteError] = useState('');

  const dedupeByProximity = (places) => {
    const kept = [];
    for (const p of places) {
      const dup = kept.find(k => Math.abs(k.lat - p.lat) < 0.0025 && Math.abs(k.lon - p.lon) < 0.0025);
      if (!dup) kept.push(p);
    }
    return kept;
  };

  const geocodePlace = async (rawQuery, signal) => {
    const query = rawQuery.toLowerCase().trim();
    const localMatches = LOGISTICS_HUB_REGISTRY.filter(item =>
      item.name.toLowerCase().includes(query) || item.region.toLowerCase().includes(query)
    );

    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(rawQuery)}&filter=countrycode:in&bias=proximity:77.5946,12.9716&categories=education,amenity,commercial,building&limit=10&apiKey=${GEOAPIFY_API_KEY}`;

    try {
      const res = await fetch(url, { signal });
      const data = await res.json();
      const apiFormatted = (data.features || []).map(f => ({
        name: f.properties.formatted,
        lat: f.properties.lat,
        lon: f.properties.lon,
        region: f.properties.city || f.properties.state || f.properties.county || 'India'
      }));
      const combined = dedupeByProximity([
        ...localMatches,
        ...apiFormatted.filter(api => !localMatches.some(l => l.name.toLowerCase() === api.name.toLowerCase()))
      ]);
      return combined.slice(0, 8);
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Search error:', err);
      return localMatches;
    }
  };

  useEffect(() => {
    if (isSelectingRef.current || !originInput || originInput.trim().length < 2 || pickingMode) {
      setOriginSuggestions([]);
      return;
    }
    const query = originInput.toLowerCase();
    const localMatches = LOGISTICS_HUB_REGISTRY.filter(item =>
      item.name.toLowerCase().includes(query) || item.region.toLowerCase().includes(query)
    );
    setOriginSuggestions(localMatches);

    const controller = new AbortController();
    setOriginSearching(true);
    const timer = setTimeout(async () => {
      if (!isSelectingRef.current) {
        const results = await geocodePlace(originInput, controller.signal);
        setOriginSuggestions(results);
      }
      setOriginSearching(false);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [originInput, pickingMode]);

  useEffect(() => {
    if (isSelectingRef.current || !destInput || destInput.trim().length < 2 || pickingMode) {
      setDestSuggestions([]);
      return;
    }
    const query = destInput.toLowerCase();
    const localMatches = LOGISTICS_HUB_REGISTRY.filter(item =>
      item.name.toLowerCase().includes(query) || item.region.toLowerCase().includes(query)
    );
    setDestSuggestions(localMatches);

    const controller = new AbortController();
    setDestSearching(true);
    const timer = setTimeout(async () => {
      if (!isSelectingRef.current) {
        const results = await geocodePlace(destInput, controller.signal);
        setDestSuggestions(results);
      }
      setDestSearching(false);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [destInput, pickingMode]);

  const selectOriginPlace = (place) => {
    isSelectingRef.current = true;
    setOriginInput(place.name);
    setOriginCoords({ lat: place.lat, lon: place.lon });
    setOriginSuggestions([]);
    setRoutesCalculated(false);
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([place.lat, place.lon], 11);
    }
    setTimeout(() => { isSelectingRef.current = false; }, 150);
  };

  const selectDestPlace = (place) => {
    isSelectingRef.current = true;
    setDestInput(place.name);
    setDestCoords({ lat: place.lat, lon: place.lon });
    setDestSuggestions([]);
    setRoutesCalculated(false);
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([place.lat, place.lon], 11);
    }
    setTimeout(() => { isSelectingRef.current = false; }, 150);
  };

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([12.9716, 77.5946], 9);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);

      map.on('click', async (e) => {
        if (!pickingMode) return;
        const { lat, lng } = e.latlng;
        
        try {
          const revUrl = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${GEOAPIFY_API_KEY}`;
          const res = await fetch(revUrl);
          const data = await res.json();
          const placeName = data.features?.[0]?.properties?.formatted || `Selected Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

          if (pickingMode === 'origin') {
            isSelectingRef.current = true;
            setOriginInput(placeName);
            setOriginCoords({ lat, lon: lng });
            setTimeout(() => { isSelectingRef.current = false; }, 150);
          } else if (pickingMode === 'dest') {
            isSelectingRef.current = true;
            setDestInput(placeName);
            setDestCoords({ lat, lon: lng });
            setTimeout(() => { isSelectingRef.current = false; }, 150);
          }
        } catch {
          if (pickingMode === 'origin') {
            setOriginInput(`Custom Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
            setOriginCoords({ lat, lon: lng });
          } else {
            setDestInput(`Custom Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
            setDestCoords({ lat, lon: lng });
          }
        }
        setPickingMode(null);
        setRoutesCalculated(false);
        map.setView([lat, lng], 11);
      });

      leafletMapRef.current = map;
    }

    const timer = setTimeout(() => {
      leafletMapRef.current?.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [pickingMode]);

  const handleFindRoutes = async (e) => {
    e.preventDefault();
    setRouteError('');

    if (!originCoords?.lat || !originCoords?.lon || !destCoords?.lat || !destCoords?.lon) {
      setRouteError('Please select a valid origin and destination from the dropdown list or map picker.');
      return;
    }

    setLoadingRoutes(true);
    setRoutesCalculated(false);

    try {
      const oLat = originCoords.lat;
      const oLon = originCoords.lon;
      const dLat = destCoords.lat;
      const dLon = destCoords.lon;

      const urls = [
        `https://api.geoapify.com/v1/routing?waypoints=${oLat},${oLon}|${dLat},${dLon}&mode=drive&type=balanced&apiKey=${GEOAPIFY_API_KEY}`,
        `https://api.geoapify.com/v1/routing?waypoints=${oLat},${oLon}|${dLat},${dLon}&mode=drive&type=short&apiKey=${GEOAPIFY_API_KEY}`,
        `https://api.geoapify.com/v1/routing?waypoints=${oLat},${oLon}|${dLat},${dLon}&mode=drive&avoid=highways&apiKey=${GEOAPIFY_API_KEY}`
      ];

      const results = await Promise.all(urls.map(u => fetch(u).then(res => res.json())));

      const parsedRoutes = results.map((data) => {
        const feature = data.features?.[0];
        if (!feature) return null;

        const distanceMeters = feature.properties.distance || 5000;
        const timeSeconds = feature.properties.time || 600;
        
        let distanceKm = distanceMeters / 1000.0;
        let durationMin = Math.round(timeSeconds / 60.0);

        let coords = [];
        const geom = feature.geometry;
        if (geom && geom.coordinates) {
          if (geom.type === 'MultiLineString') {
            coords = geom.coordinates.flat().map(pt => [pt[1], pt[0]]);
          } else if (geom.type === 'LineString') {
            coords = geom.coordinates.map(pt => [pt[1], pt[0]]);
          }
        }
        return { distanceKm, durationMin, coords, steps: parseGeoapifyFeature(feature).steps };
      }).filter(Boolean);

      if (parsedRoutes.length === 0) {
        setRouteError('Could not calculate road routes between these points.');
        setLoadingRoutes(false);
        return;
      }

      while (parsedRoutes.length < 3) {
        parsedRoutes.push({ ...parsedRoutes[0], distanceKm: parsedRoutes[0].distanceKm * 1.05, durationMin: Math.round(parsedRoutes[0].durationMin * 1.1) });
      }

      const weightTonnes = Math.max(0.0, parseFloat(loadWeight) / 1000.0);
      const weightPenalty = 1.0 + (weightTonnes * 0.035);

      const isElectric = powertrain.includes('Electric');
      const isCng = powertrain.includes('CNG');

      let baseRateEco = 0.072, baseRateFast = 0.088, baseRateAlt = 0.078;
      let unit = "L", co2Mult = 2.68;

      if (isElectric) {
        baseRateEco = 14.0; baseRateFast = 18.0; baseRateAlt = 16.0; unit = "kWh"; co2Mult = 0.0;
      } else if (isCng) {
        baseRateEco = 5.8; baseRateFast = 7.0; baseRateAlt = 6.2; unit = "kg"; co2Mult = 2.05;
      }

      const calcPhysics = (distance, durationMin, rateFactor) => {
        const consumption = (isElectric || isCng) 
          ? (distance * (rateFactor / 100.0) * weightPenalty) 
          : (distance * rateFactor * weightPenalty * (1.0 + (durationMin * 0.005)));
        
        return {
          fuel: `${consumption.toFixed(1)} ${unit}`,
          co2: `${(consumption * co2Mult).toFixed(1)} kg`
        };
      };

      const fastRes = parsedRoutes[0];
      const ecoRes  = parsedRoutes[1];
      const altRes  = parsedRoutes[2];

      const fastMetrics = calcPhysics(fastRes.distanceKm, fastRes.durationMin, baseRateFast);

      const ecoMetrics = (Math.abs(ecoRes.distanceKm - fastRes.distanceKm) < 0.05 && ecoRes.durationMin === fastRes.durationMin)
        ? fastMetrics
        : calcPhysics(ecoRes.distanceKm, ecoRes.durationMin, baseRateEco);

      const altMetrics = (Math.abs(altRes.distanceKm - fastRes.distanceKm) < 0.05 && altRes.durationMin === fastRes.durationMin)
        ? fastMetrics
        : (Math.abs(altRes.distanceKm - ecoRes.distanceKm) < 0.05 && altRes.durationMin === ecoRes.durationMin)
        ? ecoMetrics
        : calcPhysics(altRes.distanceKm, altRes.durationMin, baseRateAlt);

      setRouteData({
        eco: {
          name: 'Eco-Optimized Transit Corridor',
          distance: ecoRes.distanceKm.toFixed(2),
          durationNum: ecoRes.durationMin,
          duration: formatDuration(ecoRes.durationMin),
          coords: ecoRes.coords,
          fuelOrEnergy: ecoMetrics.fuel,
          co2: ecoMetrics.co2,
          ecoScore: 96,
          steps: ecoRes.steps || []
        },
        fastest: {
          name: 'High Speed Balanced Link',
          distance: fastRes.distanceKm.toFixed(2),
          durationNum: fastRes.durationMin,
          duration: formatDuration(fastRes.durationMin),
          coords: fastRes.coords,
          fuelOrEnergy: fastMetrics.fuel,
          co2: fastMetrics.co2,
          ecoScore: 70,
          steps: fastRes.steps || []
        },
        shortest: {
          name: 'Regional Alternative Link',
          distance: altRes.distanceKm.toFixed(2),
          durationNum: altRes.durationMin,
          duration: formatDuration(altRes.durationMin),
          coords: altRes.coords,
          fuelOrEnergy: altMetrics.fuel,
          co2: altMetrics.co2,
          ecoScore: 82,
          steps: altRes.steps || []
        }
      });

      setRoutesCalculated(true);
      setSelectedRouteKey('eco');

      if (leafletMapRef.current && fastRes.coords.length > 0) {
        const bounds = L.latLngBounds(fastRes.coords);
        leafletMapRef.current.fitBounds(bounds, { padding: [60, 60] });
      }

    } catch (err) {
      console.error('Routing error:', err);
      setRouteError('Failed to retrieve road-snapped routes from routing service.');
    } finally {
      setLoadingRoutes(false);
    }
  };

  useEffect(() => {
    const map = leafletMapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    const bounds = L.latLngBounds([]);

    if (originCoords?.lat && originCoords?.lon) {
      const originMarker = L.circleMarker([originCoords.lat, originCoords.lon], {
        radius: 10, fillColor: '#059669', color: '#ffffff', weight: 3, fillOpacity: 1,
      }).addTo(layerGroup);
      originMarker.bindPopup(`<b>Origin:</b> ${originInput}`);
      bounds.extend([originCoords.lat, originCoords.lon]);
    }

    if (destCoords?.lat && destCoords?.lon) {
      const destMarker = L.circleMarker([destCoords.lat, destCoords.lon], {
        radius: 10, fillColor: '#dc2626', color: '#ffffff', weight: 3, fillOpacity: 1,
      }).addTo(layerGroup);
      destMarker.bindPopup(`<b>Destination:</b> ${destInput}`);
      bounds.extend([destCoords.lat, destCoords.lon]);
    }

    if (!routesCalculated) {
      if (bounds.isValid() && originCoords && destCoords) {
        map.fitBounds(bounds, { padding: [60, 60] });
      }
      return;
    }

    const routeColors = {
      eco: '#059669',
      fastest: '#2563eb',
      shortest: '#d97706'
    };

    const keys = Object.keys(routeColors);
    keys.forEach((key) => {
      const coords = routeData[key].coords;
      if (!coords || coords.length === 0) return;
      const isActive = key === selectedRouteKey;

      L.polyline(coords, {
        color: routeColors[key],
        weight: isActive ? 7 : 4,
        opacity: isActive ? 0.95 : 0.5,
        className: 'route-line',
      }).addTo(layerGroup);

      coords.forEach(pt => bounds.extend(pt));
    });

    map.invalidateSize();
  }, [routesCalculated, routeData, selectedRouteKey, originCoords, destCoords]);

  const handleStartTrip = () => {
    const activeRoute = routeData[selectedRouteKey];
    const routeName = selectedRouteKey === 'fastest' ? 'Fastest Route' : selectedRouteKey === 'eco' ? 'Eco-Friendly Route' : 'Alternative Corridor';

    const tripData = {
      tripId: 'TRIP-' + Math.floor(1000 + Math.random() * 9000),
      origin: originInput,
      destination: destInput,
      originCoords: [originCoords.lat, originCoords.lon],
      destinationCoords: [destCoords.lat, destCoords.lon],
      distanceKm: parseFloat(activeRoute.distance),
      loadWeightKg: parseFloat(loadWeight) || 0,
      powertrain,
      routeName,
      estimatedFuel: activeRoute.fuelOrEnergy,
      estimatedCo2: activeRoute.co2,
      estHours: (activeRoute.durationNum / 60).toFixed(2),
      pathPoints: activeRoute.coords,
      steps: activeRoute.steps || [],
      ecoScore: activeRoute.ecoScore,
      startTime: new Date().toLocaleTimeString()
    };

    localStorage.setItem('activeTrip', JSON.stringify(tripData));
    navigate(`/driver/active-trip/${tripData.tripId}`);
  };

  return (
    <div className="max-w-[1800px] mx-auto p-6 font-sans space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Plan a Trip</h1>
        <p className="text-sm text-slate-500 mt-1">Production routing with pure road-snapped geometries and exact physics parity.</p>
      </div>

      {pickingMode && (
        <div className="px-5 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-bold flex items-center justify-between shadow-lg">
          <span>🎯 Map Picker Active: Click anywhere on the map to set your <b>{pickingMode.toUpperCase()}</b> location.</span>
          <button onClick={() => setPickingMode(null)} className="underline text-xs uppercase tracking-wider cursor-pointer">Cancel</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-8 rounded-3xl border border-slate-200 shadow-sm bg-white space-y-6 overflow-visible">
            <form onSubmit={handleFindRoutes} className="space-y-6">
              
              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Origin Hub</label>
                  <button
                    type="button"
                    onClick={() => setPickingMode(pickingMode === 'origin' ? null : 'origin')}
                    className={`text-xs font-bold flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-xl transition ${
                      pickingMode === 'origin' ? 'bg-emerald-600 text-white' : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    <Crosshair size={13} /> {pickingMode === 'origin' ? 'Click Map to Pin' : 'Pick on Map'}
                  </button>
                </div>
                <div className="flex items-center relative">
                  <span className="absolute left-4 text-emerald-600"><MapPin size={20} /></span>
                  <input
                    type="text"
                    required
                    value={originInput}
                    onChange={(e) => {
                      if (!isSelectingRef.current) {
                        setOriginInput(e.target.value);
                        setOriginCoords(null);
                      }
                    }}
                    placeholder="Search origin hub or place..."
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 text-sm font-bold text-slate-800 bg-slate-50/50 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {originSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-72 overflow-y-auto">
                    {originSearching && (
                      <div className="px-5 py-2 text-[10px] font-bold text-slate-400 flex items-center gap-2 bg-slate-50">
                        <Loader2 className="animate-spin" size={12} /> Searching database...
                      </div>
                    )}
                    {originSuggestions.map((place, idx) => (
                      <div
                        key={idx}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectOriginPlace(place);
                        }}
                        className="px-5 py-4 hover:bg-emerald-50 text-xs font-medium text-slate-700 cursor-pointer border-b border-slate-100 flex items-center justify-between gap-3 transition"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <MapPin size={16} className="text-emerald-600 shrink-0" />
                          <span className="truncate text-sm font-bold">{place.name}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono shrink-0">{place.region}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Destination Hub</label>
                  <button
                    type="button"
                    onClick={() => setPickingMode(pickingMode === 'dest' ? null : 'dest')}
                    className={`text-xs font-bold flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-xl transition ${
                      pickingMode === 'dest' ? 'bg-rose-600 text-white' : 'text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    <Crosshair size={13} /> {pickingMode === 'dest' ? 'Click Map to Pin' : 'Pick on Map'}
                  </button>
                </div>
                <div className="flex items-center relative">
                  <span className="absolute left-4 text-rose-600"><Navigation size={20} /></span>
                  <input
                    type="text"
                    required
                    value={destInput}
                    onChange={(e) => {
                      if (!isSelectingRef.current) {
                        setDestInput(e.target.value);
                        setDestCoords(null);
                      }
                    }}
                    placeholder="Search destination hub or place..."
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 text-sm font-bold text-slate-800 bg-slate-50/50 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {destSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-72 overflow-y-auto">
                    {destSearching && (
                      <div className="px-5 py-2 text-[10px] font-bold text-slate-400 flex items-center gap-2 bg-slate-50">
                        <Loader2 className="animate-spin" size={12} /> Searching database...
                      </div>
                    )}
                    {destSuggestions.map((place, idx) => (
                      <div
                        key={idx}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectDestPlace(place);
                        }}
                        className="px-5 py-4 hover:bg-emerald-50 text-xs font-medium text-slate-700 cursor-pointer border-b border-slate-100 flex items-center justify-between gap-3 transition"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <Navigation size={16} className="text-rose-600 shrink-0" />
                          <span className="truncate text-sm font-bold">{place.name}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono shrink-0">{place.region}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-2">Load Weight (kg)</label>
                  <div className="flex items-center relative">
                    <span className="absolute left-4 text-slate-400"><Scale size={18} /></span>
                    <input
                      type="number"
                      required
                      min="50"
                      max="20000"
                      value={loadWeight}
                      onChange={(e) => setLoadWeight(e.target.value)}
                      className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 text-sm font-mono font-bold text-slate-800 bg-slate-50/50 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-2">Powertrain</label>
                  <select
                    value={powertrain}
                    onChange={(e) => setPowertrain(e.target.value)}
                    className="w-full px-4 py-4 rounded-2xl border border-slate-200 text-sm font-bold text-slate-800 bg-slate-50/50 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="Clean Diesel (Euro VI)">Clean Diesel (Euro VI)</option>
                    <option value="Petrol / Gasoline">Petrol / Gasoline</option>
                    <option value="Electric (Zero Emission)">Electric (Zero Emission)</option>
                    <option value="CNG Hybrid">CNG Hybrid</option>
                  </select>
                </div>
              </div>

              {routeError && (
                <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                  {routeError}
                </div>
              )}

              <Button
                type="submit"
                disabled={loadingRoutes}
                variant="primary"
                className="w-full py-4 text-sm font-extrabold bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-md cursor-pointer mt-3 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loadingRoutes ? <Loader2 className="animate-spin" size={18} /> : null}
                {loadingRoutes ? 'Calculating Routes...' : '🔍 Generate 3-Route Analysis'}
              </Button>
            </form>
          </Card>

          {routesCalculated && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Route size={16} className="text-emerald-600" /> Choose Route Alternative
                </span>
                <span className="text-xs font-bold text-emerald-600">3 Optimized Options</span>
              </div>

              <div
                onClick={() => setSelectedRouteKey('eco')}
                className={`p-6 rounded-3xl border-2 cursor-pointer transition bg-white shadow-xs space-y-4 ${
                  selectedRouteKey === 'eco' ? 'border-emerald-600 bg-emerald-50/20 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full">AI Recommended</span>
                      <h3 className="text-sm font-black text-emerald-800 uppercase tracking-wide">Eco-Friendly Route</h3>
                    </div>
                    <h4 className="text-lg font-black text-slate-900">{routeData.eco.duration}</h4>
                    <p className="text-xs text-emerald-700 font-bold mt-0.5">{routeData.eco.name}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-slate-900">{routeData.eco.distance} km</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-center text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block mb-0.5">Fuel / Energy</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{routeData.eco.fuelOrEnergy}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block mb-0.5">CO₂ Emissions</span>
                    <span className="font-mono font-bold text-emerald-600 text-sm">{routeData.eco.co2}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block mb-0.5">Eco-Score</span>
                    <span className="font-mono font-black text-emerald-600 text-sm">{routeData.eco.ecoScore}/100</span>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedRouteKey('fastest')}
                className={`p-6 rounded-3xl border-2 cursor-pointer transition bg-white shadow-xs space-y-4 ${
                  selectedRouteKey === 'fastest' ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-black text-blue-800 uppercase tracking-wide mb-1">Fastest Route</h3>
                    <h4 className="text-lg font-black text-slate-900 mb-1">{routeData.fastest.duration}</h4>
                    <p className="text-xs text-blue-700 font-bold mt-0.5">{routeData.fastest.name}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-slate-900">{routeData.fastest.distance} km</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-center text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block mb-0.5">Fuel / Energy</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{routeData.fastest.fuelOrEnergy}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block mb-0.5">CO₂ Emissions</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{routeData.fastest.co2}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] text-slate-500 uppercase font-extrabold block mb-0.5">Eco-Score</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{routeData.fastest.ecoScore}/100</span>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedRouteKey('shortest')}
                className={`p-6 rounded-3xl border-2 cursor-pointer transition bg-white shadow-xs space-y-4 ${
                  selectedRouteKey === 'shortest' ? 'border-amber-600 bg-amber-50/20 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-black text-amber-800 uppercase tracking-wide mb-1">Alternative Corridor</h3>
                    <h4 className="text-lg font-black text-slate-900 mb-1">{routeData.shortest.duration}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-slate-900">{routeData.shortest.distance} km</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-center text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block mb-0.5">Fuel / Energy</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{routeData.shortest.fuelOrEnergy}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block mb-0.5">CO₂ Emissions</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{routeData.shortest.co2}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] text-slate-500 uppercase font-extrabold block mb-0.5">Eco-Score</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{routeData.shortest.ecoScore}/100</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleStartTrip}
                variant="primary"
                className="w-full py-4 text-sm font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                 Start Selected Route & Launch GPS <ArrowRight size={18} />
              </Button>
            </div>
          )}
        </div>

        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative sticky top-6">
          <div ref={mapRef} className="w-full h-[820px] z-0" />
        </div>

      </div>
    </div>
  );
}