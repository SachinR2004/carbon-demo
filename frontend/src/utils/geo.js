// Geometry + routing helpers for live navigation.
// All coordinates are [lat, lng]. All distances are metres unless the name says otherwise.

const R = 6371000;
const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

export function haversineM(a, b) {
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function bearingDeg(a, b) {
  const y = Math.sin(toRad(b[1] - a[1])) * Math.cos(toRad(b[0]));
  const x =
    Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) -
    Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(toRad(b[1] - a[1]));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Pre-compute cumulative distance along a polyline so progress is "distance along the road".
export function buildRoute(points) {
  const pts = (points || []).filter(
    (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])
  );
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + haversineM(pts[i - 1], pts[i]);
  return { points: pts, cum, total: cum.length ? cum[cum.length - 1] : 0 };
}

function projectOnSegment(route, i, p, cosLat) {
  const a = route.points[i];
  const b = route.points[i + 1];
  const k = (Math.PI / 180) * R;
  // local flat-earth metres, with the GPS point at the origin
  const ax = (a[1] - p[1]) * cosLat * k;
  const ay = (a[0] - p[0]) * k;
  const bx = (b[1] - p[1]) * cosLat * k;
  const by = (b[0] - p[0]) * k;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq > 0) t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
  const px = ax + t * dx;
  const py = ay + t * dy;
  const segLen = route.cum[i + 1] - route.cum[i];
  return {
    seg: i,
    t,
    offM: Math.sqrt(px * px + py * py),
    alongM: route.cum[i] + t * segLen,
    snapped: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])],
  };
}

// Snap a GPS point onto the route. offM = real distance from the road line (true deviation).
// hintSeg keeps the search near the last known position so overlapping road sections don't confuse it.
export function projectOnRoute(route, p, hintSeg = 0) {
  const n = route.points.length;
  if (n < 2) return null;
  const cosLat = Math.cos(toRad(p[0]));
  const scan = (from, to) => {
    let best = null;
    for (let i = from; i <= to; i++) {
      const c = projectOnSegment(route, i, p, cosLat);
      if (!best || c.offM < best.offM) best = c;
    }
    return best;
  };
  const lo = Math.max(0, hintSeg - 30);
  const hi = Math.min(n - 2, hintSeg + 400);
  const local = scan(lo, hi);
  if (local && local.offM <= 80) return local;
  const full = scan(0, n - 2);
  return local && local.offM <= full.offM ? local : full;
}

export function pointAtDistance(route, d) {
  const n = route.points.length;
  if (n === 0) return null;
  if (d <= 0) return route.points[0];
  if (d >= route.total) return route.points[n - 1];
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (route.cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  const seg = route.cum[hi] - route.cum[lo] || 1;
  const t = (d - route.cum[lo]) / seg;
  const a = route.points[lo];
  const b = route.points[hi];
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}

export function offsetPoint(p, eastM, northM) {
  return [p[0] + northM / 111320, p[1] + eastM / (111320 * Math.cos(toRad(p[0])))];
}

export function fmtDist(m) {
  if (!Number.isFinite(m)) return '—';
  if (m < 1000) return `${Math.max(0, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} km`;
}

// "12.3 L" -> { value: 12.3, unit: "L" }
export function parseQty(str) {
  const m = String(str ?? '').match(/(-?\d+(?:\.\d+)?)\s*([A-Za-z]+)?/);
  return m ? { value: parseFloat(m[1]), unit: m[2] || '' } : { value: 0, unit: '' };
}

// ---- Geoapify routing (same API NewTrip already uses) ----

export function parseGeoapifyFeature(feature) {
  const geom = feature?.geometry;
  let coords = [];
  if (geom?.type === 'MultiLineString') coords = geom.coordinates.flat().map((c) => [c[1], c[0]]);
  else if (geom?.type === 'LineString') coords = geom.coordinates.map((c) => [c[1], c[0]]);
  const leg = feature?.properties?.legs?.[0];
  const steps = (leg?.steps || []).map((s) => ({
    text: s.instruction?.text || 'Continue',
    type: s.instruction?.type || '',
    fromIndex: s.from_index ?? 0,
    distanceM: s.distance ?? 0,
  }));
  return {
    points: coords,
    distanceM: feature?.properties?.distance ?? 0,
    durationS: feature?.properties?.time ?? 0,
    steps,
  };
}

export async function fetchGeoapifyRoute(from, to, apiKey, type = 'balanced') {
  const url = `https://api.geoapify.com/v1/routing?waypoints=${from[0]},${from[1]}|${to[0]},${to[1]}&mode=drive&type=${type}&apiKey=${apiKey}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`routing ${res.status}`);
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) throw new Error('no route');
    const parsed = parseGeoapifyFeature(feature);
    if (parsed.points.length < 2) throw new Error('empty geometry');
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

// Attach "distance along the route where this step starts" to each step.
export function stepsWithPosition(route, steps) {
  if (!steps || !steps.length || route.points.length < 2) return [];
  return steps.map((s) => ({
    ...s,
    startM: route.cum[Math.min(Math.max(0, s.fromIndex), route.points.length - 1)],
  }));
}

// What the driver should be told right now.
export function getGuidance(steps, alongM, totalM) {
  if (!steps.length) return null;
  let idx = 0;
  for (let i = 0; i < steps.length; i++) if (steps[i].startM <= alongM + 1) idx = i;
  const next = steps[idx + 1] || null;
  return {
    index: idx,
    count: steps.length,
    next,
    distToNextM: next ? Math.max(0, next.startM - alongM) : Math.max(0, totalM - alongM),
  };
}

export function maneuverKind(type = '', text = '') {
  const t = `${type} ${text}`.toLowerCase();
  if (t.includes('uturn') || t.includes('u-turn')) return 'uturn';
  if (t.includes('roundabout')) return 'roundabout';
  if (t.includes('arriv') || t.includes('destination')) return 'arrive';
  if (t.includes('sharp') && t.includes('left')) return 'left';
  if (t.includes('sharp') && t.includes('right')) return 'right';
  if (t.includes('slight') && t.includes('left')) return 'slight-left';
  if (t.includes('slight') && t.includes('right')) return 'slight-right';
  if (t.includes('left')) return 'left';
  if (t.includes('right')) return 'right';
  return 'straight';
}
