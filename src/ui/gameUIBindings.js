/**
 * gameUIBindings — Wires buttons, keyboard shortcuts, and global click handlers.
 */
import {
  zoomMap as _zoomMap,
  resetCameraView as _resetCameraView,
  centerOnChampion as _centerOnChampion,
  refreshZoomDisplay,
} from './mapView.js';
import { toast } from './hud.js';
import { currentChamp } from '../game/gameOrchestrator.js';
import { onEndTurn } from '../game/turnController.js';

export function bindGameUI() {
  document.getElementById('btnEndTurn')?.addEventListener('click', onEndTurn);

  document.getElementById('zoomIn')?.addEventListener('click', () => {
    const svgEl = document.getElementById('hexMapSvg');
    if (svgEl) _zoomMap(1.3, svgEl);
    refreshZoomDisplay();
  });
  document.getElementById('zoomOut')?.addEventListener('click', () => {
    const svgEl = document.getElementById('hexMapSvg');
    if (svgEl) _zoomMap(0.77, svgEl);
    refreshZoomDisplay();
  });
  document.getElementById('zoomReset')?.addEventListener('click', () => {
    const svgEl = document.getElementById('hexMapSvg');
    _resetCameraView(svgEl);
    refreshZoomDisplay();
  });
  document.getElementById('centerChampion')?.addEventListener('click', () => {
    const ch = currentChamp();
    const svgEl = document.getElementById('hexMapSvg');
    if (ch && svgEl) _centerOnChampion(ch, svgEl);
  });

  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btnEndTurn') onEndTurn();
    if (e.target && e.target.id === 'btnInspect')
      toast(
        'Click a highlighted hex to move. Adjacent foes to duel. End turn on empty parchment to dig.'
      );
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'c' || e.key === 'C') {
      const ch = currentChamp();
      const svgEl = document.getElementById('hexMapSvg');
      if (ch && svgEl) _centerOnChampion(ch, svgEl);
    }
    if (e.key === 'r' || e.key === 'R') {
      const svgEl = document.getElementById('hexMapSvg');
      _resetCameraView(svgEl);
      refreshZoomDisplay();
    }
    if (e.key === '+' || e.key === '=') {
      const svgEl = document.getElementById('hexMapSvg');
      if (svgEl) _zoomMap(1.3, svgEl);
      refreshZoomDisplay();
    }
    if (e.key === '-' || e.key === '_') {
      const svgEl = document.getElementById('hexMapSvg');
      if (svgEl) _zoomMap(0.77, svgEl);
      refreshZoomDisplay();
    }
    if (e.key === ' ') {
      e.preventDefault();
      onEndTurn();
    }
  });
}