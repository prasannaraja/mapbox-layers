# Mapbox Layers Demo

A small React + TypeScript + Vite demo showing a Mapbox GL map with:

- A single-select base map type state for switching the base feature source
- Multi-select overlay layer toggles composited on top of the base map
- Source-level clustering for store points with `clusterMaxZoom`
- Interactive popups, legends, and a floating `LayerSwitcher`

## What this app shows

The demo is implemented in `layers-demo/` and uses a Redux state slice to manage map layer visibility and the active base map.

### Base map type (single-select state)

The map supports two base data sources:

- `OA` — Output Area geometry from `public/data/oa-boundaries.geojson`
- `H3` — H3 resolution 10 hexagon geometry from `public/data/h3-hexagons.geojson`

Switching the base map type is handled by the `baseMap` Redux state in `layers-demo/src/store/mapSlice.ts`.

The base layers are rendered as Mapbox layers:

- `base-oa-fill` / `base-oa-line`
- `base-h3-fill` / `base-h3-line`

`layers-demo/src/components/MapView/MapView.tsx` uses `applyBaseMap()` to toggle visibility between the OA and H3 base layers when the selected base map changes.

### Overlay layers (multi-select toggles)

Overlay visibility is managed by the `overlayLayers` array in the Redux store. Each overlay entry includes:

- `id`
- `label`
- `visible`
- `color`

The available overlays include:

- `store-labels` — text labels for individual stores
- `existing-stores` — clustered store points with count labels
- `retailzone-boundaries` — boundary lines rendered atop the base
- `competitor-stores` — a competitor heatmap overlay
- `catchment-areas` — store catchment circle visuals

The `LayerSwitcher` component in `layers-demo/src/components/LayerSwitcher/LayerSwitcher.tsx` renders the UI for both the base map select cards and the overlay toggles, dispatching `setBaseMap` and `toggleOverlayLayer` actions.

## Key implementation details

### Redux store

The map state is defined in `layers-demo/src/store/mapSlice.ts`:

- `baseMap: 'OA' | 'H3'`
- `overlayLayers: OverlayLayer[]`
- `layerPanelOpen: boolean`

This store feeds `MapView` and `LayerSwitcher` using typed hooks in `layers-demo/src/store/hooks.ts`.

### Map initialization

`MapView` creates a `mapboxgl.Map` instance and loads:

- `oa` source from `oa-boundaries.geojson`
- `h3` source from `h3-hexagons.geojson`
- `stores` source from `stores.geojson` with clustering enabled
- `stores-raw` source from `stores.geojson` for unclustered symbol/heatmap layers

The stores source uses:

- `cluster: true`
- `clusterMaxZoom: 13`
- `clusterRadius: 40`

This is the source-level clustering implementation used for existing store points.

### Base map switching

`applyBaseMap(m, baseMap)` updates the visibility of the base layers:

- shows OA layers when `baseMap === 'OA'`
- shows H3 layers when `baseMap === 'H3'`

The currently active base map also drives the legend rendered by the `Legend` component.

### Overlay layer toggling

`applyOverlays(m, overlayLayers)` iterates the Redux overlay array and sets each Mapbox layer visibility to either `visible` or `none`.

This means overlays are composited on top of the active base map rather than replacing it.

### Overlay source data and rendering

The overlay layers are driven by two data sources:

- `stores` — clustered GeoJSON store point source from `public/data/stores.geojson`
- `stores-raw` — unclustered copy of the same store source used for labels, heatmap, and circles

The stores dataset is a GeoJSON `FeatureCollection` of point features with this shape:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": "store-1",
        "name": "Spar",
        "shop": "convenience",
        "neighbourhood": "City Centre",
        "opening_hours": "Mo-Su 07:00-22:00"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-1.889307, 52.4842]
      }
    }
  ]
}
```

Overlay rendering details:

- `store-labels`
  - `source: stores-raw`
  - type: `symbol`
  - visible from zoom 14
  - label text is taken from `properties.name`

- `existing-stores`
  - `source: stores`
  - cluster-enabled source with `clusterMaxZoom: 13`, `clusterRadius: 40`
  - rendered as three Mapbox layers:
    - `existing-stores-clusters` — circle layer for clusters (colored and sized by cluster count)
    - `existing-stores-count` — symbol layer for cluster count labels
    - `existing-stores-points` — circle layer for unclustered store points (color by shop type, radius by zoom)

- `retailzone-boundaries`
  - `source: oa`
  - type: `line`
  - uses the same OA polygon source as the OA base map
  - rendered as a dashed boundary overlay on top of the base layer

- `competitor-stores`
  - `source: stores-raw`
  - type: `heatmap`
  - filters features where `shop` is one of `supermarket`, `convenience`, or `general`

- `catchment-areas`
  - `source: stores-raw`
  - type: `circle`
  - filters to `shop` = `supermarket`
  - circle radius scales with zoom to represent a catchment area

The `LayerSwitcher` toggles visibility for each overlay by dispatching `toggleOverlayLayer(layer.id)`, and `MapView` applies the resulting state to the matching layer IDs.

### Cluster interactions and popups

`setupPopups()` in `MapView.tsx` adds map event handlers for:

- clicking OA or H3 polygons to show feature popups
- clicking individual store points to show store details
- clicking clusters to zoom into the cluster using `getClusterExpansionZoom`
- pointer cursor changes over interactive layers

## Run locally

From the workspace root:

```bash
cd layers-demo
npm install
npm run dev
```

Set `VITE_MAPBOX_TOKEN` in your environment before running if you want Mapbox tiles to load.

## Map state example

The app keeps map UI state in Redux under the `map` slice. Example state:

```json
{
  "map": {
    "baseMap": "H3",
    "layerPanelOpen": false,
    "overlayLayers": [
      {
        "id": "store-labels",
        "label": "Store Labels",
        "visible": false,
        "color": "#f59e0b"
      },
      {
        "id": "existing-stores",
        "label": "Existing Stores",
        "visible": false,
        "color": "#10b981"
      },
      {
        "id": "retailzone-boundaries",
        "label": "RetailZone Boundaries",
        "visible": false,
        "color": "#3b82f6"
      },
      {
        "id": "competitor-stores",
        "label": "Competitor Stores",
        "visible": true,
        "color": "#ef4444"
      },
      {
        "id": "catchment-areas",
        "label": "Catchment Areas",
        "visible": false,
        "color": "#8b5cf6"
      }
    ]
  }
}
```

### What each field means

- `baseMap` selects the active base feature layer set (`OA` or `H3`).
- `layerPanelOpen` tracks whether the floating layer panel is open, though the current UI toggles panel visibility locally inside `LayerSwitcher`.
- `overlayLayers` is the array of composited overlays. Each overlay layer is rendered on top of the base map and the app toggles its Mapbox layer visibility based on `visible`.

### Actions

The map slice exposes three actions in `layers-demo/src/store/mapSlice.ts`:

- `map/setBaseMap`
- `map/toggleOverlayLayer`
- `map/toggleLayerPanel`

Example actions:

```json
{
  "type": "map/setBaseMap",
  "payload": "H3"
}
```

```json
{
  "type": "map/toggleOverlayLayer",
  "payload": "competitor-stores"
}
```

```json
{
  "type": "map/toggleLayerPanel"
}
```

### Redux store details

The Redux store is configured in `layers-demo/src/store/index.ts` and includes a single reducer:

- `map: mapReducer`

The `map` slice model defines:

- `baseMap` — current base source selection, either `OA` or `H3`
- `overlayLayers` — an array of overlay states, each with an `id`, `label`, `visible`, and `color`
- `layerPanelOpen` — boolean state for panel visibility (defined in the slice, but the UI currently uses local state for the panel open/close behavior)

Component wiring:

- `LayerSwitcher` reads `baseMap` and `overlayLayers` using `useAppSelector`
- `LayerSwitcher` dispatches `setBaseMap` and `toggleOverlayLayer`
- `MapView` reads the same store values and reacts to them with `applyBaseMap()` and `applyOverlays()`
- `useAppDispatch` and `useAppSelector` are typed hooks from `layers-demo/src/store/hooks.ts`

This means the app separates UI intent from map rendering: the UI updates Redux state, and `MapView` listens to state changes and updates Mapbox layer visibility accordingly.

What each action does:

- `map/setBaseMap` updates the active base map type to either `OA` or `H3`. This drives which base layers are visible.
- `map/toggleOverlayLayer` flips the `visible` flag for the overlay entry with the matching `id`, which in turn shows or hides the corresponding Mapbox overlay layer.
- `map/toggleLayerPanel` toggles the internal `layerPanelOpen` state value.

> Note: The current UI uses local component state inside `LayerSwitcher` for panel open/close, but the slice still defines `layerPanelOpen` as part of the map state.

## Future persistence considerations

For future development, consider persisting and restoring the `map` slice during user login:

- persist `baseMap`, `overlayLayers`, and optionally `layerPanelOpen`
- store only UI state, not static GeoJSON/tile data
- restore the saved state on login and rehydrate the Redux `map` slice
- keep the persistence layer separate from Mapbox rendering logic

This note is intentionally placed near the Redux store section so an AI-assisted IDE can use it as guidance when porting or extending the app into another codebase.

## Map-related components

These are the components and files directly involved in the map experience (excluding the sidebar):

- `layers-demo/src/App.tsx` — application shell that provides the Redux `Provider` and renders `MapView`.
- `layers-demo/src/components/MapView/MapView.tsx` — main Mapbox map component: initializes the map, registers sources and layers, handles clustering, popups, legends, and applies state-driven visibility changes.
- `layers-demo/src/components/LayerSwitcher/LayerSwitcher.tsx` — floating UI panel for selecting the base map (`OA` or `H3`) and toggling overlay layers.
- `layers-demo/src/store/mapSlice.ts` — Redux slice defining `baseMap`, `overlayLayers`, and `layerPanelOpen`, plus actions for updating the map state.
- `layers-demo/src/store/index.ts` — Redux store setup, exposing the `map` reducer.
- `layers-demo/src/store/hooks.ts` — typed `useAppDispatch` and `useAppSelector` hooks used by `MapView` and `LayerSwitcher`.
- `layers-demo/public/data/` — static GeoJSON sources for OA boundaries, H3 hexagons, and stores.

## Project structure

- `layers-demo/src/components/MapView/MapView.tsx` — map creation, sources, layers, clustering, popups, base/overlay sync
- `layers-demo/src/components/LayerSwitcher/LayerSwitcher.tsx` — base selection and overlay toggle UI
- `layers-demo/src/store/mapSlice.ts` — single-select base map state and multi-select overlay state
- `layers-demo/public/data/` — GeoJSON payloads used for OA, H3, and stores

## Notes

Although the project includes `react-map-gl` as a dependency, the demo uses raw `mapbox-gl` directly in `MapView`.

The demo is built around a single source-of-truth Redux state for the active base map and overlay visibility, enabling a clean separation between UI controls and Mapbox layer rendering.

> Note: `custom-icon-shape` is intentionally omitted from this doc because it was not mandatory for this implementation.

### GeoJSON schema summary

The app uses two primary base geometry sources for the `OA` and `H3` base map types.

- `public/data/oa-boundaries.geojson`
  - `FeatureCollection`
  - `geometry`: `Polygon`
  - `properties`: `oa_code`, `population`, `households`, `area_sqkm`, `neighbourhood`, `pop_density`, `retail_score`
  - Rendered by `base-oa-fill` / `base-oa-line`
  - Popup data is derived from these properties in `MapView.tsx`

- `public/data/h3-hexagons.geojson`
  - `FeatureCollection`
  - `geometry`: `Polygon`
  - `properties`: `h3_index`, `resolution`, `footfall_idx`, `avg_spend`, `weekly_revenue`, `store_count`, `opportunity_score`
  - Rendered by `base-h3-fill` / `base-h3-line`
  - Popup data is derived from these properties in `MapView.tsx`

### Extra implementation details

- The README does not deeply document the exact GeoJSON schema fields present in `public/data/oa-boundaries.geojson`, `public/data/h3-hexagons.geojson`, and `public/data/stores.geojson`.
  - This means an AI-assisted IDE should infer field names from the source code (`MapView.tsx` popups, layer paint/filter expressions) or inspect the GeoJSON files directly.
- It does not cover CSS/layout details such as the sidebar, map container, or `LayerSwitcher` panel styling.
  - The visual structure is implemented in `layers-demo/src/components/Sidebar/Sidebar.tsx`, `layers-demo/src/components/LayerSwitcher/LayerSwitcher.tsx`, and the component CSS files, but styling details are not enumerated here.
- It notes that `react-map-gl` is installed but not actually used in the current implementation.
  - The demo renders Mapbox GL directly with `mapbox-gl`, so `react-map-gl` is not part of the active rendering path.

These points are included as extra context for an AI-assisted IDE or future implementation in another codebase.

### Sample source snippet

From `layers-demo/src/store/mapSlice.ts`:

```ts
export interface OverlayLayer {
  id: string;
  label: string;
  visible: boolean;
  color: string;
}

const initialState: MapState = {
  baseMap: 'OA',
  layerPanelOpen: false,
  overlayLayers: [
    { id: 'store-labels', label: 'Store Labels', visible: false, color: '#f59e0b' },
    { id: 'existing-stores', label: 'Existing Stores', visible: true, color: '#10b981' },
    { id: 'retailzone-boundaries', label: 'RetailZone Boundaries', visible: true, color: '#3b82f6' },
    { id: 'competitor-stores', label: 'Competitor Stores', visible: false, color: '#ef4444' },
    { id: 'catchment-areas', label: 'Catchment Areas', visible: false, color: '#8b5cf6' },
  ],
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setBaseMap(state, action: PayloadAction<BaseMapType>) {
      state.baseMap = action.payload;
    },
    toggleOverlayLayer(state, action: PayloadAction<string>) {
      const layer = state.overlayLayers.find(l => l.id === action.payload);
      if (layer) layer.visible = !layer.visible;
    },
    toggleLayerPanel(state) {
      state.layerPanelOpen = !state.layerPanelOpen;
    },
  },
});
```

This sample is taken directly from the source and shows the core Redux map state, actions, and overlay configuration used by the app.