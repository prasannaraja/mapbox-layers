import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type BaseMapType = 'OA' | 'H3';

export interface OverlayLayer {
  id: string;
  label: string;
  visible: boolean;
  color: string;
}

export interface MapState {
  baseMap: BaseMapType;
  overlayLayers: OverlayLayer[];
  layerPanelOpen: boolean;
}

const initialState: MapState = {
  baseMap: 'OA',
  layerPanelOpen: false,
  overlayLayers: [
    { id: 'store-labels',          label: 'Store Labels',          visible: false, color: '#f59e0b' },
    { id: 'existing-stores',       label: 'Existing Stores',       visible: true,  color: '#10b981' },
    { id: 'retailzone-boundaries', label: 'RetailZone Boundaries', visible: true,  color: '#3b82f6' },
    { id: 'competitor-stores',     label: 'Competitor Stores',     visible: false, color: '#ef4444' },
    { id: 'catchment-areas',       label: 'Catchment Areas',       visible: false, color: '#8b5cf6' },
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

export const { setBaseMap, toggleOverlayLayer, toggleLayerPanel } = mapSlice.actions;
export default mapSlice.reducer;
