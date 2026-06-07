import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setBaseMap, toggleOverlayLayer } from '../../store/mapSlice';
import type { BaseMapType } from '../../store/mapSlice';
import './LayerSwitcher.css';
import { Layers } from 'lucide-react';

const BASE_OPTIONS: { value: BaseMapType; label: string; desc: string }[] = [
  { value: 'OA', label: 'OA', desc: 'Output Area geometry' },
  { value: 'H3', label: 'H3', desc: 'H3 L10 hexagon grid'  },
];

// Shape + colour for each shop category — mirrors mapIcons.ts ICON_SPECS
const SHOP_LEGEND: { label: string; shape: string; color: string }[] = [
  { label: 'Supermarket',  shape: 'circle',   color: '#10b981' },
  { label: 'Convenience',  shape: 'square',   color: '#34d399' },
  { label: 'Clothes',      shape: 'diamond',  color: '#8b5cf6' },
  { label: 'Electronics',  shape: 'square',   color: '#3b82f6' },
  { label: 'Pharmacy',     shape: 'cross',    color: '#f43f5e' },
  { label: 'Beauty',       shape: 'star6',    color: '#ec4899' },
  { label: 'Bakery',       shape: 'triangle', color: '#f59e0b' },
  { label: 'Butcher',      shape: 'pentagon', color: '#dc2626' },
  { label: 'Hardware',     shape: 'hexagon',  color: '#92400e' },
  { label: 'Charity',      shape: 'heart',    color: '#7c3aed' },
  { label: 'General',      shape: 'star4',    color: '#d97706' },
  { label: 'Other',        shape: 'circle',   color: '#94a3b8' },
];

const LayerSwitcher: React.FC = () => {
  const dispatch = useAppDispatch();
  const { baseMap, overlayLayers } = useAppSelector(s => s.map);
  const [open, setOpen] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const storesVisible = overlayLayers.find(l => l.id === 'existing-stores')?.visible;

  return (
    <div className="ls-root">
      <button
        className={`ls-fab ${open ? 'ls-fab--on' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Map layers"
      >
        <Layers size={20} />
      </button>

      {open && (
        <div className="ls-panel">
          {/* Base map */}
          <p className="ls-heading">Map Type</p>
          <div className="ls-base-row">
            {BASE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`ls-base-card ${baseMap === opt.value ? 'ls-base-card--active' : ''}`}
                onClick={() => dispatch(setBaseMap(opt.value))}
                title={opt.desc}
              >
                <div className="ls-thumb">
                  {opt.value === 'OA' ? <OAThumb /> : <H3Thumb />}
                </div>
                <span className="ls-base-label">{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="ls-sep" />

          {/* Overlays */}
          <p className="ls-heading">Layers</p>
          <ul className="ls-list">
            {overlayLayers.map(layer => (
              <li key={layer.id} className="ls-row">
                <label className="ls-toggle">
                  <input
                    type="checkbox"
                    checked={layer.visible}
                    onChange={() => dispatch(toggleOverlayLayer(layer.id))}
                  />
                  <span className="ls-track" />
                  <ShapeIcon
                    shape={layer.id === 'existing-stores' ? 'circle' :
                           layer.id === 'retailzone-boundaries' ? 'line' :
                           layer.id === 'competitor-stores' ? 'heat' :
                           layer.id === 'catchment-areas' ? 'ring' :
                           layer.id === 'store-labels' ? 'text' : 'circle'}
                    color={layer.color}
                  />
                  <span className="ls-layer-label">{layer.label}</span>
                </label>
              </li>
            ))}
          </ul>

          {/* Store legend toggle — only when stores visible */}
          {storesVisible && (
            <>
              <div className="ls-sep" />
              <button
                className="ls-legend-toggle"
                onClick={() => setShowLegend(v => !v)}
              >
                Store symbols {showLegend ? '▲' : '▼'}
              </button>
              {showLegend && (
                <ul className="ls-symbol-legend">
                  {SHOP_LEGEND.map(s => (
                    <li key={s.label} className="ls-symbol-row">
                      <ShapeIcon shape={s.shape} color={s.color} size={14} />
                      <span className="ls-symbol-label">{s.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Inline SVG shape icons for the panel ─────────────────── */
const ShapeIcon: React.FC<{ shape: string; color: string; size?: number }> = ({ shape, color, size = 12 }) => {
  const s = size;
  const c = s / 2;
  const r = s * 0.42;

  const hexPts = (cx: number, cy: number, radius: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + radius * Math.cos(a)},${cy + radius * Math.sin(a)}`;
    }).join(' ');

  const penPts = (cx: number, cy: number, radius: number) =>
    Array.from({ length: 5 }, (_, i) => {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      return `${cx + radius * Math.cos(a)},${cy + radius * Math.sin(a)}`;
    }).join(' ');

  const starPts = (cx: number, cy: number, outerR: number, innerR: number, pts: number) =>
    Array.from({ length: pts * 2 }, (_, i) => {
      const rad = i % 2 === 0 ? outerR : innerR;
      const a   = (Math.PI * i) / pts - Math.PI / 2;
      return `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
    }).join(' ');

  const common = { fill: color, stroke: '#fff', strokeWidth: 1.2 };

  const renderShape = () => {
    switch (shape) {
      case 'circle':   return <circle cx={c} cy={c} r={r} {...common} />;
      case 'square':   return <rect x={c-r} y={c-r} width={r*2} height={r*2} rx={2} {...common} />;
      case 'diamond':  return <polygon points={`${c},${c-r*1.2} ${c+r},${c} ${c},${c+r*1.2} ${c-r},${c}`} {...common} />;
      case 'triangle': return <polygon points={`${c},${c-r} ${c+r*1.1},${c+r*0.8} ${c-r*1.1},${c+r*0.8}`} {...common} />;
      case 'hexagon':  return <polygon points={hexPts(c, c, r)} {...common} />;
      case 'pentagon': return <polygon points={penPts(c, c, r)} {...common} />;
      case 'star4':    return <polygon points={starPts(c, c, r, r*0.45, 4)} {...common} />;
      case 'star6':    return <polygon points={starPts(c, c, r, r*0.5, 6)} {...common} />;
      case 'heart':    return (
        <path
          d={`M${c},${c+r*0.7} C${c-r*1.3},${c-r*0.2} ${c-r*1.3},${c-r*1.1} ${c},${c-r*0.35}
              C${c+r*1.3},${c-r*1.1} ${c+r*1.3},${c-r*0.2} ${c},${c+r*0.7}Z`}
          {...common}
        />
      );
      case 'cross':    return (
        <g fill={color} stroke="#fff" strokeWidth={0.8}>
          <rect x={c-r*0.35} y={c-r} width={r*0.7} height={r*2} />
          <rect x={c-r} y={c-r*0.35} width={r*2} height={r*0.7} />
        </g>
      );
      case 'line':     return <line x1={s*0.1} y1={c} x2={s*0.9} y2={c} stroke={color} strokeWidth={2} strokeDasharray="3,2" />;
      case 'heat':     return (
        <radialGradient id={`hg-${color.replace('#','')}`}>
          <stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      ) && <circle cx={c} cy={c} r={r*1.1} fill={`url(#hg-${color.replace('#','')})`} />;
      case 'ring':     return <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.7} />;
      case 'text':     return <text x={c} y={c+r*0.4} textAnchor="middle" fontSize={r*1.2} fill={color} fontWeight="bold">A</text>;
      default:         return <circle cx={c} cy={c} r={r} {...common} />;
    }
  };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ flexShrink: 0 }}>
      {renderShape()}
    </svg>
  );
};

/* ── Map thumbnails ─────────────────────────────────────────── */
const OAThumb = () => (
  <svg viewBox="0 0 48 36" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect width="48" height="36" fill="#0f172a" rx="3" />
    <polygon points="3,3 20,3 23,17 7,19"   fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="1" />
    <polygon points="20,3 44,5 40,21 23,17"  fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="1" />
    <polygon points="7,19 23,17 19,33 3,31"  fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="1" />
    <polygon points="23,17 40,21 38,33 19,33" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="1" />
  </svg>
);

const H3Thumb = () => {
  const pts = (cx: number, cy: number, r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(' ');
  const hexes = [[12,10],[24,10],[36,10],[6,20],[18,20],[30,20],[42,20],[12,30],[24,30],[36,30]];
  return (
    <svg viewBox="0 0 48 36" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <rect width="48" height="36" fill="#0f172a" rx="3" />
      {hexes.map(([cx, cy], i) => (
        <polygon key={i} points={pts(cx, cy, 7)} fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth="0.8" />
      ))}
    </svg>
  );
};

export default LayerSwitcher;
