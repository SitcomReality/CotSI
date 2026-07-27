/**
 * colorMaps.js — Color mapping functions for noise overlay views.
 *
 * Maps elevation and moisture values (0–1) to display colors
 * for the analysis page's overlay rendering modes.
 */

/**
 * Map a raw elevation value (0–1) to a terrain-height color.
 * Emphasizes the thresholds used by terrain generation so the user can
 * see where water, land, and mountains form.
 */
export function elevationColor(elev) {
  if (elev < 0.04) return '#0a1a3a';       // deep ocean — very dark navy
  if (elev < 0.07) return '#1a4a8a';       // shallow water — blue
  if (elev < 0.12) return '#3a8a8a';       // shore / beach — teal transition
  if (elev < 0.25) return '#4a9a4a';       // lowland — green
  if (elev < 0.45) return '#7aaa4a';       // midland — yellow-green
  if (elev < 0.65) return '#fae06f';       // highland — yellow
  if (elev < 0.80) return '#ec9748';       // foothill — orange
  if (elev < 0.905) return '#db532e';      // sub-mountain — red-orange
  if (elev < 0.95) return '#c4301c';       // mountain — deep red
  return '#570000';                         // peak — bright warm red
}

/**
 * Map a raw moisture value (0–1) to a moisture color.
 * Shows the wetness gradient across the map.
 */
export function moistureColor(moist) {
  if (moist < 0.10) return '#c8b050';       // very dry
  if (moist < 0.20) return '#b8a848';       // arid
  if (moist < 0.35) return '#8aaa4a';       // dry
  if (moist < 0.50) return '#6a9a3a';       // moderate
  if (moist < 0.65) return '#4a8a2a';       // moist
  if (moist < 0.80) return '#3a7a2a';       // wet
  return '#2a6a4a';                          // saturated
}
