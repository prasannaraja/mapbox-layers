/**
 * Draws custom map icons onto an offscreen canvas and returns ImageData
 * suitable for mapboxgl.Map.addImage().
 *
 * Each shop type gets a distinct geometric shape + colour so they're
 * distinguishable at a glance even without a legend.
 */

export type ShopType =
  | 'supermarket' | 'convenience' | 'clothes' | 'electronics'
  | 'pharmacy'    | 'beauty'      | 'bakery'  | 'butcher'
  | 'newsagent'   | 'hardware'    | 'furniture'| 'charity' | 'general';

interface IconSpec {
  shape: 'circle' | 'square' | 'diamond' | 'triangle' | 'triangle-down'
       | 'star4'  | 'star6'  | 'hexagon' | 'pentagon'  | 'heart' | 'cross';
  fill:   string;
  stroke: string;
}

export const ICON_SPECS: Record<string, IconSpec> = {
  supermarket:  { shape: 'circle',        fill: '#10b981', stroke: '#fff' },
  convenience:  { shape: 'square',        fill: '#34d399', stroke: '#fff' },
  clothes:      { shape: 'diamond',       fill: '#8b5cf6', stroke: '#fff' },
  electronics:  { shape: 'square',        fill: '#3b82f6', stroke: '#fff' },
  pharmacy:     { shape: 'cross',         fill: '#f43f5e', stroke: '#fff' },
  beauty:       { shape: 'star6',         fill: '#ec4899', stroke: '#fff' },
  bakery:       { shape: 'triangle',      fill: '#f59e0b', stroke: '#fff' },
  butcher:      { shape: 'pentagon',      fill: '#dc2626', stroke: '#fff' },
  newsagent:    { shape: 'square',        fill: '#6b7280', stroke: '#fff' },
  hardware:     { shape: 'hexagon',       fill: '#92400e', stroke: '#fff' },
  furniture:    { shape: 'square',        fill: '#b45309', stroke: '#fff' },
  charity:      { shape: 'heart',         fill: '#7c3aed', stroke: '#fff' },
  general:      { shape: 'star4',         fill: '#d97706', stroke: '#fff' },
  default:      { shape: 'circle',        fill: '#94a3b8', stroke: '#fff' },
};

const SIZE = 28;   // canvas pixels (drawn @2× for retina)
const SCALE = 2;
const CANVAS_SIZE = SIZE * SCALE;

function makeCanvas() {
  const c = document.createElement('canvas');
  c.width  = CANVAS_SIZE;
  c.height = CANVAS_SIZE;
  return c;
}

function applyBase(ctx: CanvasRenderingContext2D, fill: string, stroke: string) {
  ctx.fillStyle   = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth   = 2.5 * SCALE;
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur  = 3 * SCALE;
}

function drawCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
}

function drawPolygon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, sides: number, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (Math.PI * 2 * i) / sides - Math.PI / 2 + rotation;
    i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
             : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number, points: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI * i) / points - Math.PI / 2;
    i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
             : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
}

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const s = r * 0.9;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.8);
  ctx.bezierCurveTo(cx - s * 1.4, cy - s * 0.2, cx - s * 1.4, cy - s * 1.2, cx, cy - s * 0.4);
  ctx.bezierCurveTo(cx + s * 1.4, cy - s * 1.2, cx + s * 1.4, cy - s * 0.2, cx, cy + s * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
}

function drawCross(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const arm = r * 0.9;
  const w   = r * 0.38;
  ctx.beginPath();
  ctx.rect(cx - w, cy - arm, w * 2, arm * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(cx - arm, cy - w, arm * 2, w * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // outer stroke
  ctx.beginPath();
  ctx.moveTo(cx - w, cy - arm);
  ctx.lineTo(cx + w, cy - arm);
  ctx.lineTo(cx + w, cy - w);
  ctx.lineTo(cx + arm, cy - w);
  ctx.lineTo(cx + arm, cy + w);
  ctx.lineTo(cx + w, cy + w);
  ctx.lineTo(cx + w, cy + arm);
  ctx.lineTo(cx - w, cy + arm);
  ctx.lineTo(cx - w, cy + w);
  ctx.lineTo(cx - arm, cy + w);
  ctx.lineTo(cx - arm, cy - w);
  ctx.lineTo(cx - w, cy - w);
  ctx.closePath();
  ctx.stroke();
}

function drawSquare(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rounded = 3) {
  const x = cx - r, y = cy - r, s = r * 2;
  ctx.beginPath();
  ctx.roundRect(x, y, s, s, rounded * SCALE);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
}

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx,     cy - r * 1.1);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx,     cy + r * 1.1);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
}

/** Build ImageData for one icon spec. */
function buildIcon(spec: IconSpec): ImageData {
  const canvas = makeCanvas();
  const ctx    = canvas.getContext('2d')!;
  const cx     = CANVAS_SIZE / 2;
  const cy     = CANVAS_SIZE / 2;
  const r      = (CANVAS_SIZE / 2) * 0.72;

  applyBase(ctx, spec.fill, spec.stroke);

  switch (spec.shape) {
    case 'circle':        drawCircle(ctx, cx, cy, r);                          break;
    case 'square':        drawSquare(ctx, cx, cy, r * 0.88);                   break;
    case 'diamond':       drawDiamond(ctx, cx, cy, r * 0.85);                  break;
    case 'triangle':      drawPolygon(ctx, cx, cy + r * 0.12, r, 3);           break;
    case 'triangle-down': drawPolygon(ctx, cx, cy - r * 0.12, r, 3, Math.PI); break;
    case 'pentagon':      drawPolygon(ctx, cx, cy, r, 5);                      break;
    case 'hexagon':       drawPolygon(ctx, cx, cy, r, 6, Math.PI / 6);         break;
    case 'star4':         drawStar(ctx, cx, cy, r, r * 0.45, 4);              break;
    case 'star6':         drawStar(ctx, cx, cy, r, r * 0.5,  6);              break;
    case 'heart':         drawHeart(ctx, cx, cy, r * 0.85);                    break;
    case 'cross':         drawCross(ctx, cx, cy, r * 0.85);                    break;
  }

  return ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

/**
 * Load all shop-type icons into the Mapbox map's sprite.
 * Returns the pixel ratio used (2 for retina-sharp rendering).
 */
export function loadMapIcons(map: mapboxgl.Map): void {
  for (const [shopType, spec] of Object.entries(ICON_SPECS)) {
    const imageData = buildIcon(spec);
    if (!map.hasImage(`shop-${shopType}`)) {
      map.addImage(`shop-${shopType}`, imageData, { pixelRatio: SCALE });
    }
  }
}

/**
 * Mapbox expression that picks the right icon name from the `shop` property.
 */
export const ICON_IMAGE_EXPR: mapboxgl.ExpressionSpecification = [
  'concat',
  'shop-',
  ['coalesce',
    ['match',
      ['get', 'shop'],
      Object.keys(ICON_SPECS).filter(k => k !== 'default'), ['get', 'shop'],
      'default',
    ],
    'default',
  ],
];
