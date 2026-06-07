import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAppSelector } from '../../store/hooks';
import LayerSwitcher from '../LayerSwitcher/LayerSwitcher';
import { loadMapIcons, ICON_IMAGE_EXPR } from '../../utils/mapIcons';
import './MapView.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

const BIRMINGHAM: [number, number] = [-1.8904, 52.4862];

// ── Colour ramps ────────────────────────────────────────────
const POP_RAMP: mapboxgl.ExpressionSpecification = [
  'interpolate', ['linear'], ['get', 'population'],
  60,  '#0d1b2a',
  200, '#1a3a5c',
  350, '#1d6fa4',
  500, '#2196f3',
  700, '#64b5f6',
  850, '#bbdefb',
];

const FOOTFALL_RAMP: mapboxgl.ExpressionSpecification = [
  'interpolate', ['linear'], ['get', 'footfall_idx'],
  0,   '#1a0a00',
  20,  '#7c2d12',
  40,  '#c2410c',
  60,  '#ea580c',
  80,  '#f97316',
  100, '#fed7aa',
];


// ── Cluster colours ──────────────────────────────────────────
export type MapPopup = { lng: number; lat: number; html: string } | null;

const MapView: React.FC = () => {
  const mapContainer   = useRef<HTMLDivElement>(null);
  const map            = useRef<mapboxgl.Map | null>(null);
  const popup          = useRef<mapboxgl.Popup | null>(null);
  const initialized    = useRef(false);
  const [loading, setLoading] = useState(true);
  const [dataStatus, setDataStatus] = useState('Loading data…');

  const { baseMap, overlayLayers } = useAppSelector(s => s.map);
  const baseMapRef  = useRef(baseMap);
  const overlaysRef = useRef(overlayLayers);

  // ── Init ──────────────────────────────────────────────────
  useEffect(() => {
    if (initialized.current || !mapContainer.current) return;
    initialized.current = true;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: BIRMINGHAM,
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    map.current.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    popup.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '280px',
      className: 'map-popup',
    });

    map.current.on('load', async () => {
      const m = map.current!;
      setDataStatus('Loading OA boundaries…');

      try {
        const [oaRes, h3Res, storesRes] = await Promise.all([
          fetch('/data/oa-boundaries.geojson').then(r => r.json()),
          fetch('/data/h3-hexagons.geojson').then(r => r.json()),
          fetch('/data/stores.geojson').then(r => r.json()),
        ]);
        setDataStatus('Building layers…');

        // ── Load custom icons into sprite ─────────────────────
        loadMapIcons(m);

        // ── Sources ───────────────────────────────────────────
        m.addSource('oa', { type: 'geojson', data: oaRes });
        m.addSource('h3', { type: 'geojson', data: h3Res });
        m.addSource('stores', {
          type: 'geojson',
          data: storesRes,
          cluster: true,
          clusterMaxZoom: 13,
          clusterRadius: 40,
        });
        m.addSource('stores-raw', { type: 'geojson', data: storesRes });

        // ── Base: OA fill (choropleth by population) ──────────
        m.addLayer({
          id: 'base-oa-fill',
          type: 'fill',
          source: 'oa',
          paint: { 'fill-color': POP_RAMP, 'fill-opacity': 0.65 },
        });
        m.addLayer({
          id: 'base-oa-line',
          type: 'line',
          source: 'oa',
          paint: { 'line-color': '#60a5fa', 'line-width': 0.5, 'line-opacity': 0.6 },
        });

        // ── Base: H3 fill (choropleth by footfall index) ──────
        m.addLayer({
          id: 'base-h3-fill',
          type: 'fill',
          source: 'h3',
          paint: { 'fill-color': FOOTFALL_RAMP, 'fill-opacity': 0.65 },
          layout: { visibility: 'none' },
        });
        m.addLayer({
          id: 'base-h3-line',
          type: 'line',
          source: 'h3',
          paint: { 'line-color': '#f97316', 'line-width': 0.4, 'line-opacity': 0.5 },
          layout: { visibility: 'none' },
        });

        // ── Overlay: RetailZone boundaries ────────────────────
        m.addLayer({
          id: 'retailzone-boundaries',
          type: 'line',
          source: 'oa',
          paint: { 'line-color': '#3b82f6', 'line-width': 1.5, 'line-dasharray': [3, 2] },
          layout: { visibility: 'visible' },
        });

        // ── Overlay: Clustered stores ─────────────────────────
        // Cluster circles
        m.addLayer({
          id: 'existing-stores-clusters',
          type: 'circle',
          source: 'stores',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step', ['get', 'point_count'],
              '#10b981', 20, '#f59e0b', 60, '#ef4444',
            ],
            'circle-radius': ['step', ['get', 'point_count'], 16, 20, 22, 60, 30],
            'circle-stroke-color': '#fff',
            'circle-stroke-width': 1.5,
            'circle-opacity': 0.85,
          },
          layout: { visibility: 'visible' },
        });
        // Cluster count labels
        m.addLayer({
          id: 'existing-stores-count',
          type: 'symbol',
          source: 'stores',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-size': 12,
            'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
            visibility: 'visible',
          },
          paint: { 'text-color': '#fff' },
        });
        // Unclustered individual stores — custom icon per shop type
        m.addLayer({
          id: 'existing-stores-points',
          type: 'symbol',
          source: 'stores',
          filter: ['!', ['has', 'point_count']],
          layout: {
            'icon-image': ICON_IMAGE_EXPR,
            'icon-size': [
              'interpolate', ['linear'], ['zoom'],
              10, 0.45,
              13, 0.65,
              16, 0.85,
            ],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            visibility: 'visible',
          },
        });

        // ── Overlay: Store labels ─────────────────────────────
        m.addLayer({
          id: 'store-labels',
          type: 'symbol',
          source: 'stores-raw',
          minzoom: 14,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-offset': [0, 1.4],
            'text-anchor': 'top',
            visibility: 'none',
          },
          paint: {
            'text-color': '#fff',
            'text-halo-color': '#000',
            'text-halo-width': 1,
          },
        });

        // ── Overlay: Competitor heatmap ───────────────────────
        m.addLayer({
          id: 'competitor-stores',
          type: 'heatmap',
          source: 'stores-raw',
          filter: ['in', ['get', 'shop'], ['literal', ['supermarket','convenience','general']]],
          paint: {
            'heatmap-weight': 1,
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 14, 2],
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(239,68,68,0)',
              0.3, 'rgba(239,68,68,0.4)',
              0.7, 'rgba(239,68,68,0.7)',
              1, 'rgba(239,68,68,1)',
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 15, 14, 25],
            'heatmap-opacity': 0.7,
          },
          layout: { visibility: 'none' },
        });

        // ── Overlay: Catchment areas ──────────────────────────
        m.addLayer({
          id: 'catchment-areas',
          type: 'circle',
          source: 'stores-raw',
          filter: ['==', ['get', 'shop'], 'supermarket'],
          paint: {
            'circle-radius': [
              'interpolate', ['exponential', 2], ['zoom'],
              10, 30, 14, 200,
            ],
            'circle-color': '#8b5cf6',
            'circle-opacity': 0.06,
            'circle-stroke-color': '#8b5cf6',
            'circle-stroke-width': 1,
            'circle-stroke-opacity': 0.4,
          },
          layout: { visibility: 'none' },
        });

        // ── Popups ────────────────────────────────────────────
        setupPopups(m, popup.current!);

        // Apply initial Redux state
        applyBaseMap(m, baseMapRef.current);
        applyOverlays(m, overlaysRef.current);

        setLoading(false);
      } catch (err) {
        console.error('Data load error', err);
        setDataStatus('Error loading data');
        setLoading(false);
      }
    });

    return () => { map.current?.remove(); initialized.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync base map ─────────────────────────────────────────
  useEffect(() => {
    baseMapRef.current = baseMap;
    if (!map.current?.isStyleLoaded()) return;
    applyBaseMap(map.current, baseMap);
  }, [baseMap]);

  // ── Sync overlays ─────────────────────────────────────────
  useEffect(() => {
    overlaysRef.current = overlayLayers;
    if (!map.current?.isStyleLoaded()) return;
    applyOverlays(map.current, overlayLayers);
  }, [overlayLayers]);

  return (
    <div className="map-root">
      <div ref={mapContainer} className="map-container" />

      {loading && (
        <div className="map-loading">
          <div className="map-loading__spinner" />
          <span>{dataStatus}</span>
        </div>
      )}

      {!loading && <Legend baseMap={baseMap} />}
      <LayerSwitcher />
    </div>
  );
};

// ── Legend ───────────────────────────────────────────────────
const Legend: React.FC<{ baseMap: string }> = ({ baseMap }) => (
  <div className="map-legend">
    {baseMap === 'OA' ? (
      <>
        <p className="map-legend__title">Population / OA</p>
        {[['#bbdefb','850+'],['#2196f3','500'],['#1d6fa4','350'],['#1a3a5c','200'],['#0d1b2a','<60']]
          .map(([c, l]) => (
            <div key={l} className="map-legend__row">
              <span className="map-legend__swatch" style={{ background: c }} />
              <span>{l}</span>
            </div>
          ))}
      </>
    ) : (
      <>
        <p className="map-legend__title">Footfall Index / H3</p>
        {[['#fed7aa','High'],['#f97316','Medium'],['#c2410c','Low'],['#7c2d12','Very low']]
          .map(([c, l]) => (
            <div key={l} className="map-legend__row">
              <span className="map-legend__swatch" style={{ background: c }} />
              <span>{l}</span>
            </div>
          ))}
      </>
    )}
  </div>
);

// ── Helpers ───────────────────────────────────────────────────
function setupPopups(m: mapboxgl.Map, pop: mapboxgl.Popup) {
  // OA popup
  m.on('click', 'base-oa-fill', e => {
    const p = e.features?.[0]?.properties;
    if (!p) return;
    pop.setLngLat(e.lngLat)
      .setHTML(`
        <div class="popup-title">${p.neighbourhood}</div>
        <div class="popup-row"><span>OA Code</span><strong>${p.oa_code}</strong></div>
        <div class="popup-row"><span>Population</span><strong>${p.population?.toLocaleString()}</strong></div>
        <div class="popup-row"><span>Households</span><strong>${p.households?.toLocaleString()}</strong></div>
        <div class="popup-row"><span>Pop Density</span><strong>${p.pop_density} /km²</strong></div>
        <div class="popup-row"><span>Retail Score</span><strong>${p.retail_score}/100</strong></div>
      `)
      .addTo(m);
  });

  // H3 popup
  m.on('click', 'base-h3-fill', e => {
    const p = e.features?.[0]?.properties;
    if (!p) return;
    pop.setLngLat(e.lngLat)
      .setHTML(`
        <div class="popup-title">H3 Hex · Res ${p.resolution}</div>
        <div class="popup-row"><span>Footfall Index</span><strong>${p.footfall_idx}/100</strong></div>
        <div class="popup-row"><span>Avg Spend</span><strong>£${p.avg_spend}</strong></div>
        <div class="popup-row"><span>Weekly Revenue</span><strong>£${Number(p.weekly_revenue).toLocaleString()}</strong></div>
        <div class="popup-row"><span>Store Count</span><strong>${p.store_count}</strong></div>
        <div class="popup-row"><span>Opportunity</span><strong>${p.opportunity_score}/100</strong></div>
      `)
      .addTo(m);
  });

  // Individual store popup
  m.on('click', 'existing-stores-points', e => {
    const p = e.features?.[0]?.properties;
    if (!p) return;
    const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    pop.setLngLat(coords)
      .setHTML(`
        <div class="popup-title">${p.name}</div>
        <div class="popup-row"><span>Type</span><strong>${p.shop}</strong></div>
        <div class="popup-row"><span>Area</span><strong>${p.neighbourhood}</strong></div>
        <div class="popup-row"><span>Hours</span><strong>${p.opening_hours ?? '—'}</strong></div>
      `)
      .addTo(m);
  });

  // Cluster click → zoom in
  m.on('click', 'existing-stores-clusters', e => {
    const features = m.queryRenderedFeatures(e.point, { layers: ['existing-stores-clusters'] });
    const clusterId = features[0]?.properties?.cluster_id;
    if (clusterId == null) return;
    (m.getSource('stores') as mapboxgl.GeoJSONSource)
      .getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        m.easeTo({ center: e.lngLat, zoom: zoom! + 1 });
      });
  });

  // Cursor changes
  ['existing-stores-points','existing-stores-clusters','base-oa-fill','base-h3-fill'].forEach(id => {
    m.on('mouseenter', id, () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', id, () => { m.getCanvas().style.cursor = ''; });
  });
}

function applyBaseMap(m: mapboxgl.Map, base: string) {
  const isOA = base === 'OA';
  const vis = (v: boolean): 'visible' | 'none' => v ? 'visible' : 'none';
  ['base-oa-fill','base-oa-line'].forEach(id => {
    if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', vis(isOA));
  });
  ['base-h3-fill','base-h3-line'].forEach(id => {
    if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', vis(!isOA));
  });
}

function applyOverlays(m: mapboxgl.Map, layers: { id: string; visible: boolean }[]) {
  const layerMap: Record<string, string[]> = {
    'existing-stores':       ['existing-stores-clusters','existing-stores-count','existing-stores-points'],
    'store-labels':          ['store-labels'],
    'retailzone-boundaries': ['retailzone-boundaries'],
    'competitor-stores':     ['competitor-stores'],
    'catchment-areas':       ['catchment-areas'],
  };
  layers.forEach(layer => {
    const ids = layerMap[layer.id] ?? [layer.id];
    ids.forEach(id => {
      if (m.getLayer(id)) {
        m.setLayoutProperty(id, 'visibility', layer.visible ? 'visible' : 'none');
      }
    });
  });
}

export default MapView;
