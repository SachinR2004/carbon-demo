import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MapView from '../../components/MapView';
import api from '../../api/api';
import {
  haversineM, bearingDeg, buildRoute, projectOnRoute, pointAtDistance, offsetPoint,
  fmtDist, parseQty, fetchGeoapifyRoute, stepsWithPosition, getGuidance, maneuverKind,
} from '../../utils/geo';
import {
  AlertTriangle, CheckCircle2, Crosshair, ArrowUp, ArrowUpLeft, ArrowUpRight, CornerUpLeft,
  CornerUpRight, RotateCcw, Flag, Layers, X, Compass, Navigation,
} from 'lucide-react';

// Keep this key restricted to your deployed domain in the Geoapify dashboard.
const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || '50242317310b4650b997ab1278d904ec';

const ARRIVE_RADIUS_M = 100;      // Complete Trip unlocks within this distance of the destination
const MAX_USABLE_ACCURACY_M = 150; // ignore fixes worse than this
const REROUTE_COOLDOWN_MS = 20000;
const SIM_ENABLED = true;

const MANEUVER_ICON = {
  straight: ArrowUp, left: CornerUpLeft, right: CornerUpRight, 'slight-left': ArrowUpLeft,
  'slight-right': ArrowUpRight, uturn: RotateCcw, roundabout: RotateCcw, arrive: Flag,
};

function loadProgress(tripId) {
  try {
    const p = JSON.parse(localStorage.getItem('activeTripProgress') || 'null');
    return p && p.tripId === tripId ? p : null;
  } catch {
    return null;
  }
}

export default function ActiveTrip() {
  const { tripId: routeTripId } = useParams();
  const navigate = useNavigate();

  const [tripData, setTripData] = useState(null);
  const [navigating, setNavigating] = useState(false);
  const [autoCenter, setAutoCenter] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [completing, setCompleting] = useState(false);

  const [gps, setGps] = useState(null);          // { pos, accuracy, speed, ts }
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | waiting | live | weak | denied
  const [heading, setHeading] = useState(0);
  const [alongM, setAlongM] = useState(0);        // metres driven along the CURRENT route
  const [coveredBeforeM, setCoveredBeforeM] = useState(0); // metres driven on earlier (replaced) routes
  const [offRouteM, setOffRouteM] = useState(0);
  const [displayPos, setDisplayPos] = useState(null);
  const [banner, setBanner] = useState(null);
  const [simActive, setSimActive] = useState(false);

  // ---- derived geometry ----
  const route = useMemo(() => buildRoute(tripData?.pathPoints), [tripData?.pathPoints]);
  const steps = useMemo(() => stepsWithPosition(route, tripData?.steps), [route, tripData?.steps]);

  // refs so the GPS callback (created once) always sees fresh values
  const routeRef = useRef(route);
  const tripRef = useRef(null);
  const segHintRef = useRef(0);
  const maxAlongRef = useRef(0);
  const coveredRef = useRef(0);
  const offCountRef = useRef(0);
  const prevRawRef = useRef(null);
  const reroutingRef = useRef(false);
  const lastRerouteRef = useRef(0);
  const rerouteRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const wakeLockRef = useRef(null);
  const simRef = useRef({ timer: null, dist: 0, driftTicks: 0 });
  routeRef.current = route;
  tripRef.current = tripData;

  // ---- load trip + resume progress after refresh ----
  useEffect(() => {
    const stored = localStorage.getItem('activeTrip');
    if (!stored) {
      navigate('/driver/new-trip');
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      const fuel = parseQty(parsed.estimatedFuel);
      const co2 = parseQty(parsed.estimatedCo2);
      const planDistKm = parseFloat(parsed.distanceKm) || buildRoute(parsed.pathPoints).total / 1000 || 1;
      const trip = {
        ...parsed,
        plan: parsed.plan || { distanceKm: planDistKm, fuel: fuel.value, fuelUnit: fuel.unit || 'L', co2: co2.value },
        routeDurationMin: parsed.routeDurationMin ?? (parseFloat(parsed.estHours) || 0) * 60,
      };
      const saved = loadProgress(parsed.tripId);
      if (saved) {
        maxAlongRef.current = saved.maxAlongM || 0;
        coveredRef.current = saved.coveredBeforeM || 0;
        setAlongM(maxAlongRef.current);
        setCoveredBeforeM(coveredRef.current);
        if (saved.navigating) {
          setNavigating(true);
          setAutoCenter(true);
        }
      }
      setTripData(trip);
    } catch (err) {
      console.error('Failed to parse active trip', err);
      localStorage.removeItem('activeTrip');
      navigate('/driver/new-trip');
    }
  }, [routeTripId, navigate]);

  const persist = useCallback((navigatingNow) => {
    const t = tripRef.current;
    if (!t) return;
    localStorage.setItem(
      'activeTripProgress',
      JSON.stringify({
        tripId: t.tripId,
        maxAlongM: maxAlongRef.current,
        coveredBeforeM: coveredRef.current,
        navigating: navigatingNow,
        ts: Date.now(),
      })
    );
  }, []);

  const flash = useCallback((text, kind = 'info', ms = 5000) => {
    setBanner({ text, kind });
    clearTimeout(bannerTimerRef.current);
    if (ms) bannerTimerRef.current = setTimeout(() => setBanner(null), ms);
  }, []);

  // ---- rerouting (called only after sustained, confirmed deviation) ----
  const reroute = useCallback(async (pos, offM) => {
    const t = tripRef.current;
    if (!t || reroutingRef.current || Date.now() - lastRerouteRef.current < REROUTE_COOLDOWN_MS) return;
    reroutingRef.current = true;
    lastRerouteRef.current = Date.now();
    flash(`Off route by ${Math.round(offM)} m. Finding a new route…`, 'warn', 0);
    try {
      const old = routeRef.current;
      const dest = t.destinationCoords || old.points[old.points.length - 1];
      const r = await fetchGeoapifyRoute(pos, dest, GEOAPIFY_API_KEY, 'balanced');
      coveredRef.current += maxAlongRef.current;
      maxAlongRef.current = 0;
      segHintRef.current = 0;
      offCountRef.current = 0;
      setCoveredBeforeM(coveredRef.current);
      setAlongM(0);
      setOffRouteM(0);
      const updated = {
        ...t,
        pathPoints: r.points,
        steps: r.steps,
        distanceKm: +(r.distanceM / 1000).toFixed(2),
        routeDurationMin: Math.round(r.durationS / 60),
        rerouteCount: (t.rerouteCount || 0) + 1,
      };
      setTripData(updated);
      localStorage.setItem('activeTrip', JSON.stringify(updated));
      persist(true);
      flash('New route found. Follow the highlighted line.', 'ok');
    } catch (err) {
      console.warn('Reroute failed', err);
      flash("Couldn't get a new route (check your connection). Head back to the blue line.", 'error', 8000);
    } finally {
      reroutingRef.current = false;
    }
  }, [flash, persist]);
  rerouteRef.current = reroute;

  // ---- one entry point for every position fix (real GPS or simulator) ----
  const handleFix = useCallback((fix) => {
    const r = routeRef.current;
    if (!r || r.points.length < 2) return;
    const pos = [fix.lat, fix.lng];
    const acc = Number.isFinite(fix.accuracy) ? fix.accuracy : 20;
    setGps({ pos, accuracy: acc, speed: Number.isFinite(fix.speed) ? fix.speed : null, ts: Date.now() });

    if (acc > MAX_USABLE_ACCURACY_M) {
      setGpsStatus('weak');
      return; // too imprecise to move progress or declare a deviation
    }
    setGpsStatus(acc > 50 ? 'weak' : 'live');

    // heading: device compass/course when moving, otherwise direction of travel between fixes
    const prev = prevRawRef.current;
    if (Number.isFinite(fix.heading) && (fix.speed ?? 2) > 1) setHeading(fix.heading);
    else if (prev && haversineM(prev, pos) > 8) setHeading(bearingDeg(prev, pos));
    if (!prev || haversineM(prev, pos) > 8) prevRawRef.current = pos;

    const proj = projectOnRoute(r, pos, segHintRef.current);
    if (!proj) return;
    segHintRef.current = proj.seg;

    const threshold = Math.max(50, acc * 2);
    const onRoute = proj.offM <= threshold;
    setOffRouteM(proj.offM);

    if (onRoute) {
      offCountRef.current = 0;
      // progress only moves forward; small backward jitter is ignored
      const along = Math.max(proj.alongM, maxAlongRef.current);
      maxAlongRef.current = along;
      setAlongM(along);
      setDisplayPos(proj.snapped); // snap marker to the road only when really on it
    } else {
      offCountRef.current += 1;
      setDisplayPos(pos);         // off route: show the true position
      if (offCountRef.current >= 3 && proj.offM > Math.max(80, acc * 2)) {
        rerouteRef.current?.(pos, proj.offM);
      }
    }
    persist(true);
  }, [persist]);

  // ---- real GPS ----
  useEffect(() => {
    if (!navigating || simActive) return undefined;
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      flash('This browser has no GPS support.', 'error', 0);
      return undefined;
    }
    setGpsStatus('waiting');
    const id = navigator.geolocation.watchPosition(
      (p) =>
        handleFix({
          lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy,
          heading: p.coords.heading, speed: p.coords.speed,
        }),
      (err) => {
        if (err.code === 1) {
          setGpsStatus('denied');
          flash('Location permission denied. Allow location for this site and tap Start again.', 'error', 0);
        } else {
          setGpsStatus('weak');
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [navigating, simActive, handleFix, flash]);

  // ---- keep the screen awake while navigating ----
  useEffect(() => {
    if (!navigating || !('wakeLock' in navigator)) return undefined;
    let cancelled = false;
    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) lock.release();
        else wakeLockRef.current = lock;
      } catch { /* not allowed or unsupported: ignore */ }
    };
    const onVisible = () => document.visibilityState === 'visible' && acquire();
    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      wakeLockRef.current?.release?.();
      wakeLockRef.current = null;
    };
  }, [navigating]);

  // ---- dev-only drive simulator (npm run dev) ----
  const stopSim = useCallback(() => {
    clearInterval(simRef.current.timer);
    simRef.current.timer = null;
    setSimActive(false);
  }, []);
  const startSim = useCallback(() => {
    const r = routeRef.current;
    if (r.points.length < 2) return;
    setNavigating(true);
    setAutoCenter(true);
    setSimActive(true);
    simRef.current.dist = maxAlongRef.current;
    clearInterval(simRef.current.timer);
    simRef.current.timer = setInterval(() => {
      const rt = routeRef.current;
      const s = simRef.current;
      s.dist = Math.min(rt.total, s.dist + 40); // ~40 m per tick
      let p = pointAtDistance(rt, s.dist);
      p = offsetPoint(p, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8); // GPS noise
      if (s.driftTicks > 0) {
        p = offsetPoint(p, 300, 0);
        s.driftTicks -= 1;
      }
      handleFix({ lat: p[0], lng: p[1], accuracy: 8, heading: NaN, speed: 11 });
      if (s.dist >= rt.total) stopSim();
    }, 1000);
  }, [handleFix, stopSim]);
  useEffect(() => () => clearInterval(simRef.current.timer), []);

  // ---- controls ----
  const startNavigation = () => {
    setNavigating(true);
    setAutoCenter(true);
    setShowSidebar(true);
    persist(true);
  };
  const stopNavigation = () => {
    stopSim();
    setNavigating(false);
    setAutoCenter(false);
    setGpsStatus('idle');
    persist(false);
  };
  const recenter = () => {
    setAutoCenter(true);
    if (!gps && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const pos = [p.coords.latitude, p.coords.longitude];
          setGps({ pos, accuracy: p.coords.accuracy, speed: null, ts: Date.now() });
          setDisplayPos(pos);
        },
        () => flash('Location unavailable. Check browser permission.', 'error'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  // ---- numbers shown on screen ----
  const destPoint = route.points.length ? route.points[route.points.length - 1] : null;
  const distToDestM = gps && destPoint ? haversineM(gps.pos, destPoint) : null;
  const offRoute = navigating && offRouteM > Math.max(50, (gps?.accuracy || 0) * 2);
  const remainingM = Math.max(0, route.total - alongM) + (offRoute ? offRouteM : 0);
  const drivenM = coveredBeforeM + alongM;
  const totalM = coveredBeforeM + route.total;
  const progressPercent = totalM > 0 ? Math.min(100, Math.floor((drivenM / totalM) * 100)) : 0;

  const plan = tripData?.plan;
  const share = plan ? drivenM / (plan.distanceKm * 1000) : 0; // fraction of the planned distance driven
  const fuelUsed = plan ? plan.fuel * share : 0;
  const co2Used = plan ? plan.co2 * share : 0;
  const etaMin =
    tripData?.routeDurationMin && route.total > 0
      ? Math.max(0, Math.round(tripData.routeDurationMin * (remainingM / route.total)))
      : null;

  const isAtDestination = distToDestM !== null && distToDestM <= ARRIVE_RADIUS_M;
  const guidance = useMemo(() => getGuidance(steps, alongM, route.total), [steps, alongM, route.total]);

  const handleCompleteTrip = async () => {
    if (!tripData) return;
    setCompleting(true);
    stopSim();
    const record = {
      tripId: tripData.tripId,
      origin: tripData.origin,
      destination: tripData.destination,
      title: tripData.routeName,
      distanceKm: +(drivenM / 1000).toFixed(2),
      fuelLiters: +fuelUsed.toFixed(2),
      fuelUnit: plan?.fuelUnit || 'L',
      co2Kg: +co2Used.toFixed(2),
      ecoScore: tripData.ecoScore ?? null,
      reroutes: tripData.rerouteCount || 0,
      loadWeightKg: tripData.loadWeightKg || 0,
      status: 'COMPLETED',
      completedAt: new Date().toLocaleString(),
      completedAtIso: new Date().toISOString(),
      synced: false,
    };
    try {
      await api.post('/trips/complete', record);
      record.synced = true;
    } catch (err) {
      console.warn('Saved locally; will sync from Trip History.', err);
    } finally {
      const history = JSON.parse(localStorage.getItem('tripHistory') || '[]');
      history.unshift(record);
      localStorage.setItem('tripHistory', JSON.stringify(history));
      localStorage.removeItem('activeTrip');
      localStorage.removeItem('activeTripProgress');
      setCompleting(false);
      navigate('/driver/history');
    }
  };

  if (!tripData) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading active dispatch…</div>;
  }

  // ---- status badge (honest about the real GPS state) ----
  const badge = !navigating
    ? { text: 'NAVIGATION OFF', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' }
    : gpsStatus === 'live'
    ? { text: simActive ? 'SIMULATED GPS' : 'LIVE GPS', cls: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-600 animate-pulse' }
    : gpsStatus === 'weak'
    ? { text: 'GPS WEAK', cls: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' }
    : gpsStatus === 'denied'
    ? { text: 'GPS BLOCKED', cls: 'bg-rose-100 text-rose-800', dot: 'bg-rose-500' }
    : { text: 'WAITING FOR GPS…', cls: 'bg-sky-100 text-sky-800', dot: 'bg-sky-500 animate-pulse' };

  const nextStep = guidance?.next;
  const kind = nextStep ? maneuverKind(nextStep.type, nextStep.text) : 'straight';
  const ManeuverIcon = MANEUVER_ICON[kind] || ArrowUp;
  const bannerColors = {
    info: 'bg-sky-600', warn: 'bg-amber-500', ok: 'bg-emerald-600', error: 'bg-rose-600',
  };

  return (
    <div className="p-3 lg:p-4 max-w-[1850px] w-full mx-auto space-y-3 font-sans">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Active Trip #{tripData.tripId}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
              {tripData.routeName || 'Selected Route'}
            </span>
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
             {tripData.origin} <span className="text-slate-400">➔</span> 🏁 {tripData.destination}
          </p>
        </div>
        <span className={`px-3.5 py-1.5 text-xs font-bold rounded-full flex items-center gap-2 ${badge.cls}`}>
          <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
          {badge.text}
        </span>
      </div>

      <div className="relative w-full h-[calc(100vh-130px)] min-h-[620px] bg-slate-900 rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex">
        {/* Next-manoeuvre banner */}
        {navigating && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4 pointer-events-none">
            <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl p-4 flex items-center gap-4 border-2 border-blue-500/50 pointer-events-auto">
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <ManeuverIcon size={36} />
              </div>
              <div className="flex-1 min-w-0">
                {nextStep ? (
                  <>
                    <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">
                      In {fmtDist(guidance.distToNextM)}
                    </span>
                    <p className="text-sm sm:text-base font-extrabold text-white leading-snug mt-0.5 line-clamp-2">
                      {nextStep.text}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">
                      {guidance ? 'Final stretch' : 'Follow the route'}
                    </span>
                    <p className="text-sm sm:text-base font-extrabold text-white leading-snug mt-0.5">
                      {fmtDist(remainingM)} to destination
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status / notices */}
        {banner && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 max-w-md w-[90%]">
            <div className={`${bannerColors[banner.kind]} text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2`}>
              <AlertTriangle size={14} className="shrink-0" />
              <span>{banner.text}</span>
            </div>
          </div>
        )}

        {/* Live readout (real values only) */}
        {navigating && (
          <div className="absolute top-4 right-4 z-30 hidden sm:block bg-slate-900/90 backdrop-blur-md text-white rounded-2xl shadow-xl border border-slate-700 px-4 py-3 text-xs font-mono space-y-1 pointer-events-none">
            <div className="flex items-center gap-1.5 text-blue-300 font-black uppercase tracking-widest text-[10px]">
              <Compass size={12} /> Live
            </div>
            <div>Speed: {gps?.speed != null ? `${Math.round(gps.speed * 3.6)} km/h` : '—'}</div>
            <div>Accuracy: {gps ? `±${Math.round(gps.accuracy)} m` : '—'}</div>
            <div>Heading: {Math.round(heading)}°</div>
            <div className={offRoute ? 'text-amber-300' : 'text-slate-300'}>
              Off route: {gps ? `${Math.round(offRouteM)} m` : '—'}
            </div>
          </div>
        )}

        {navigating && showSidebar && steps.length > 0 && (
          <div className="absolute top-32 left-4 z-20 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100%-300px)]">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-extrabold">Route directions ({steps.length} steps)</span>
              <button onClick={() => setShowSidebar(false)} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto text-xs text-slate-700">
              {steps.map((s, idx) => {
                const done = guidance && idx <= guidance.index;
                const upcoming = guidance && idx === guidance.index + 1;
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 pb-2 border-b border-slate-100 ${upcoming ? 'bg-blue-50/80 p-2 rounded-xl' : ''} ${done ? 'opacity-50' : ''}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] ${upcoming ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {idx + 1}
                    </div>
                    <p className="font-semibold">{s.text}</p>
                  </div>
                );
              })}
            </div>
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={stopNavigation} className="px-2.5 py-1 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 text-[11px] cursor-pointer">
                Exit Navigation
              </button>
            </div>
          </div>
        )}
        {navigating && (!showSidebar || steps.length === 0) && (
          <div className="absolute top-32 left-4 z-20 flex gap-2">
            {steps.length > 0 && (
              <button onClick={() => setShowSidebar(true)} className="px-3.5 py-2 bg-white/95 text-slate-800 rounded-xl shadow-lg border border-slate-200 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer">
                <Layers size={14} className="text-blue-600" /> Directions
              </button>
            )}
            <button onClick={stopNavigation} className="px-3.5 py-2 bg-rose-600 text-white rounded-xl shadow-lg font-extrabold text-xs cursor-pointer">
              Exit Navigation
            </button>
          </div>
        )}

        <div className="absolute inset-0 w-full h-full z-0">
          <MapView
            routes={[{ id: 'active', pathPoints: tripData.pathPoints }]}
            selectedRouteId="active"
            originCoords={tripData.originCoords}
            destinationCoords={tripData.destinationCoords || destPoint}
            currentLocation={navigating ? displayPos : null}
            accuracyM={navigating ? gps?.accuracy : null}
            heading={heading}
            autoCenterOnGps={autoCenter && navigating}
            onUserInteract={() => setAutoCenter(false)}
          />
        </div>

        {!navigating && (
          <div className="absolute top-4 left-4 z-20 max-w-sm w-full bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Trip Overview</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {progressPercent > 0 ? `Resume: ${progressPercent}% done` : 'Allow location access when asked.'}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <button onClick={startNavigation} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer">
                <Navigation size={14} /> {progressPercent > 0 ? 'Resume' : 'Start Navigation'}
              </button>
              {SIM_ENABLED && (
                <button onClick={startSim} className="px-3 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-lg cursor-pointer">
                  DEV: simulate drive
                </button>
              )}
            </div>
          </div>
        )}

        {SIM_ENABLED && navigating && simActive && (
          <div className="absolute bottom-60 left-4 z-30 flex gap-2">
            <button onClick={() => { simRef.current.driftTicks = 12; }} className="px-3 py-1.5 bg-amber-500 text-white text-[11px] font-bold rounded-lg cursor-pointer">
              DEV: drift 300 m off route
            </button>
            <button onClick={stopSim} className="px-3 py-1.5 bg-slate-800 text-white text-[11px] font-bold rounded-lg cursor-pointer">
              DEV: stop sim
            </button>
          </div>
        )}

        <div className="absolute bottom-60 right-6 z-20">
          <button
            onClick={recenter}
            title="Centre on my location"
            className={`w-12 h-12 rounded-2xl shadow-xl border flex items-center justify-center cursor-pointer ${autoCenter ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-blue-600 border-slate-200'}`}
          >
            <Crosshair size={22} />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-20 bg-white/95 backdrop-blur-md p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-2xl space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-700 px-1">
              <span className="truncate max-w-[150px] sm:max-w-xs">{tripData.origin}</span>
              <span className="text-blue-600 font-extrabold">{progressPercent}% completed</span>
              <span className="truncate max-w-[150px] sm:max-w-xs">{tripData.destination}</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
              <div className="bg-blue-600 h-full transition-all duration-500 rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-center border-t border-slate-100">
            {[
              ['Distance remaining', fmtDist(remainingM), 'text-slate-900'],
              ['Time remaining', etaMin != null ? `${etaMin} min` : '—', 'text-slate-900'],
              [plan?.fuelUnit === 'kWh' ? 'Energy used (est.)' : 'Fuel used (est.)', `${fuelUsed.toFixed(2)} ${plan?.fuelUnit || 'L'}`, 'text-blue-600'],
              ['CO₂ emitted (est.)', `${co2Used.toFixed(2)} kg`, 'text-emerald-600'],
            ].map(([label, value, cls]) => (
              <div key={label} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-extrabold uppercase text-[10px] block">{label}</span>
                <span className={`font-black text-sm mt-0.5 block font-mono ${cls}`}>{value}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleCompleteTrip}
            disabled={!isAtDestination || completing}
            className={`w-full py-3.5 font-extrabold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm ${
              isAtDestination ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            {completing ? (
              'Finalizing trip…'
            ) : isAtDestination ? (
              <><CheckCircle2 size={18} /> Complete Trip & Save to History</>
            ) : (
              ` Reach the destination to finish (${distToDestM != null ? fmtDist(distToDestM) : fmtDist(remainingM)} away)`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
