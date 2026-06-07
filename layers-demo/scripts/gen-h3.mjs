import { latLngToCell, cellToBoundary, gridDisk } from 'h3-js';
import { writeFileSync } from 'fs';

const CENTER_LAT = 52.4862;
const CENTER_LNG = -1.8904;
const RESOLUTION = 8;
const DISK_RADIUS = 18;

const NEIGHBOURHOODS = [
  { lat: 52.4800, lng: -1.8904, footfall: 95, avgSpend: 42 },
  { lat: 52.5050, lng: -1.9250, footfall: 72, avgSpend: 28 },
  { lat: 52.4700, lng: -1.9200, footfall: 55, avgSpend: 38 },
  { lat: 52.5350, lng: -1.8450, footfall: 60, avgSpend: 32 },
  { lat: 52.4620, lng: -1.8700, footfall: 78, avgSpend: 25 },
  { lat: 52.4380, lng: -1.9270, footfall: 65, avgSpend: 30 },
  { lat: 52.5000, lng: -1.8750, footfall: 70, avgSpend: 26 },
  { lat: 52.4500, lng: -1.8900, footfall: 62, avgSpend: 34 },
];

function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function nearest(lat, lng) {
  return NEIGHBOURHOODS.reduce((best, n) => {
    const d = Math.hypot(lat - n.lat, lng - n.lng);
    return d < best.d ? { ...n, d } : best;
  }, { ...NEIGHBOURHOODS[0], d: Infinity });
}

const centerHex = latLngToCell(CENTER_LAT, CENTER_LNG, RESOLUTION);
const hexSet    = new Set(gridDisk(centerHex, DISK_RADIUS));
const hexes     = [...hexSet];

const features = hexes.map((h3Index, i) => {
  const boundary = cellToBoundary(h3Index);
  const coords   = [...boundary, boundary[0]].map(([lat, lng]) => [lng, lat]);
  const cLat     = boundary.reduce((s, [la]) => s + la, 0) / boundary.length;
  const cLng     = boundary.reduce((s, [, lo]) => s + lo, 0) / boundary.length;
  const nb       = nearest(cLat, cLng);
  const rnd      = seededRand(i * 1234 + 5678);
  const distFac  = Math.max(0, 1 - nb.d / 0.12);
  const footfall = Math.min(100, Math.round((nb.footfall * distFac + 15) * (0.7 + rnd() * 0.6)));
  const avgSpend = Math.round(nb.avgSpend * (0.8 + rnd() * 0.4));
  const revenue  = Math.round(footfall * avgSpend * (800 + rnd() * 400));
  return {
    type: 'Feature',
    properties: {
      h3_index:          h3Index,
      resolution:        RESOLUTION,
      footfall_idx:      footfall,
      avg_spend:         avgSpend,
      weekly_revenue:    revenue,
      store_count:       Math.max(1, Math.round(footfall / 15 + rnd() * 5)),
      opportunity_score: Math.round((100 - footfall * 0.6) * (0.5 + rnd() * 0.5)),
    },
    geometry: { type: 'Polygon', coordinates: [coords] },
  };
});

const geojson = { type: 'FeatureCollection', features };
writeFileSync(
  '/sessions/epic-practical-newton/mnt/layers-demo/public/data/h3-hexagons.geojson',
  JSON.stringify(geojson)
);
console.log(`H3 hexagons: ${features.length} (resolution ${RESOLUTION})`);
