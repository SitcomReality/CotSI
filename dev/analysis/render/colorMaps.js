/**
 * colorMaps.js — Color mapping functions for noise overlay views.
 *
 * Single source of truth for elevation and moisture color stops.
 * The exported arrays drive both the canvas rendering and the legend.
 * If you change a color here, the legend updates automatically.
 *
 * Maps elevation and moisture values (0–1) to display colors
 * for the analysis page's overlay rendering modes.
 */

// ─── Elevation color stops (ascending by max) ──────────────────────────────

/** @type {{ max: number, color: string, label: string }[]} */
export const ELEVATION_COLOR_STOPS = [
  { max: 0.04,   color: '#0a1a3a', label: 'Deep ocean' },
  { max: 0.07,   color: '#1a4a8a', label: 'Shallow water' },
  { max: 0.12,   color: '#3a8a8a', label: 'Shore / beach' },
  { max: 0.25,   color: '#4a9a4a', label: 'Lowland' },
  { max: 0.45,   color: '#7aaa4a', label: 'Midland' },
  { max: 0.65,   color: '#fae06f', label: 'Highland' },
  { max: 0.80,   color: '#ec9748', label: 'Foothill' },
  { max: 0.905,  color: '#db532e', label: 'Sub-mountain' },
  { max: 0.95,   color: '#c4301c', label: 'Mountain' },
  { max: 1.0,    color: '#570000', label: 'Peak' },
];

// ─── Moisture color stops (ascending by max) ───────────────────────────────

/** @type {{ max: number, color: string, label: string }[]} */
export const MOISTURE_COLOR_STOPS = [
  { max: 0.10,   color: '#683333', label: 'Very dry' },
  { max: 0.20,   color: '#b14c1d', label: 'Arid' },
  { max: 0.35,   color: '#d38900', label: 'Dry' },
  { max: 0.50,   color: '#fbff01', label: 'Moderate' },
  { max: 0.65,   color: '#25d41f', label: 'Moist' },
  { max: 0.80,   color: '#20c8d4', label: 'Wet' },
  { max: 1.0,    color: '#004a8f', label: 'Saturated' },
];

// ─── Feature density color stops (ascending by max) ─────────────────────────

/** @type {{ max: number, color: string, label: string }[]} */
export const DENSITY_COLOR_STOPS = [
  { max: 0.20,  color: '#2a2a2a', label: 'Sparse' },
  { max: 0.40,  color: '#4a6a3a', label: 'Low' },
  { max: 0.60,  color: '#6a9a4a', label: 'Moderate' },
  { max: 0.80,  color: '#8aba5a', label: 'Dense' },
  { max: 1.0,   color: '#aada6a', label: 'Lush' },
];

// ─── Lookup helpers ────────────────────────────────────────────────────────

/**
 * Map a raw elevation value (0–1) to a terrain-height color.
 * Emphasizes the thresholds used by terrain generation so the user can
 * see where water, land, and mountains form.
 */
export function elevationColor(elev) {
  for (const stop of ELEVATION_COLOR_STOPS) {
    if (elev < stop.max) return stop.color;
  }
  // Safety net (should not be reached with normal 0–1 input)
  return ELEVATION_COLOR_STOPS[ELEVATION_COLOR_STOPS.length - 1].color;
}

/**
 * Map a raw moisture value (0–1) to a moisture color.
 * Shows the wetness gradient across the map.
 */
export function moistureColor(moist) {
  for (const stop of MOISTURE_COLOR_STOPS) {
    if (moist < stop.max) return stop.color;
  }
  // Safety net (should not be reached with normal 0–1 input)
  return MOISTURE_COLOR_STOPS[MOISTURE_COLOR_STOPS.length - 1].color;
}

/**
 * Map a feature density value (0–1) to a vegetation-density color.
 * Shows how climate (moisture, elevation, slope) influences feature spawning density.
 */
export function densityColor(value) {
  for (const stop of DENSITY_COLOR_STOPS) {
    if (value < stop.max) return stop.color;
  }
  // Safety net (should not be reached with normal 0–1 input)
  return DENSITY_COLOR_STOPS[DENSITY_COLOR_STOPS.length - 1].color;
}
