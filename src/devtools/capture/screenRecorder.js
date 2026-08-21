/**
 * capture/screenRecorder.js — WebM video recording of the map viewport.
 *
 * Composites the Three.js canvas + effects overlay into an offscreen canvas
 * once per rendered frame and records it via MediaRecorder (WebM). The
 * composite runs as a clock onTick registered at record start, so it always
 * fires after the scene render callback (registered earlier during map init)
 * — required because the WebGL canvas has no preserveDrawingBuffer.
 *
 * Output is a downloadable `cotsi-capture-<timestamp>.webm`. Convert to GIF
 * afterwards with the ffmpeg palettegen recipe in `media/convert commands.txt`.
 */

import { getClock } from '../../shared/clockScheduler.js';
import { getOverlayCanvas } from '../../render/overlays/overlayCanvas.js';

let recorder = null;
let chunks = [];
let compositeCanvas = null;
let stopComposite = null;
let elapsedTimer = null;
let startTs = 0;

function getThreeCanvas() {
  return window.__getSceneContext()?.renderer.domElement || null;
}

export function isRecording() {
  return !!recorder;
}

/**
 * Start recording the map viewport (3D canvas + effects overlay).
 * @returns {boolean} true if recording started
 */
export function startRecording() {
  if (recorder) return false;

  const three = getThreeCanvas();
  const overlay = getOverlayCanvas();
  if (!three || !overlay) {
    console.warn('[capture] Map canvases not available yet.');
    return false;
  }

  // Composite canvas, sized to the WebGL backing store. It must be attached
  // to the document (offscreen) — a detached canvas is never painted by the
  // compositor and captureStream on it gets starved to ~1 frame/second.
  const composite = document.createElement('canvas');
  composite.width = three.width;
  composite.height = three.height;
  composite.style.cssText = 'position:fixed;left:-10000px;top:0;';
  document.body.appendChild(composite);
  compositeCanvas = composite;
  const ctx = composite.getContext('2d');

  // Automatic capture mode: the compositor samples the canvas as it paints.
  // (Manual requestFrame mode is unreliable for non-visible canvases.)
  const stream = composite.captureStream(30);

  // Composite each frame. Registered after the scene render tick, so the
  // freshly rendered WebGL frame is still intact when we draw it.
  stopComposite = getClock().onTick(() => {
    // New game swapped the canvas underneath us — stop gracefully.
    if (getThreeCanvas() !== three) {
      stopRecording();
      return;
    }
    if (three.width !== composite.width || three.height !== composite.height) {
      composite.width = three.width;
      composite.height = three.height;
    }
    ctx.drawImage(three, 0, 0);
    if (overlay.width > 0 && overlay.height > 0) {
      ctx.drawImage(overlay, 0, 0, composite.width, composite.height);
    }
  });

  let mime = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm';
  chunks = [];
  try {
    recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  } catch {
    recorder = new MediaRecorder(stream);
  }

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    chunks = [];
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cotsi-capture-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
    a.click();
    getClock().setTimeout(() => URL.revokeObjectURL(url), 5000, 'ui');
  };

  recorder.start(250); // timeslice so long captures flush data incrementally
  startTs = performance.now();

  // Live elapsed readout for the panel status line
  elapsedTimer = getClock().setInterval(() => {
    const el = document.getElementById('devCaptureStatus');
    if (el) el.textContent = `Recording\u2026 ${((performance.now() - startTs) / 1000).toFixed(1)}s`;
  }, 250, 'ui');

  return true;
}

/**
 * Stop recording and trigger the download. Safe to call when not recording.
 * @returns {boolean} true if a recording was stopped
 */
export function stopRecording() {
  if (!recorder) return false;
  const r = recorder;
  recorder = null;

  if (stopComposite) { stopComposite(); stopComposite = null; }
  if (elapsedTimer) { getClock().clearInterval(elapsedTimer); elapsedTimer = null; }
  if (compositeCanvas) {
    compositeCanvas.parentNode?.removeChild(compositeCanvas);
    compositeCanvas = null;
  }

  r.stop();

  const el = document.getElementById('devCaptureStatus');
  if (el) el.textContent = `Saved (${((performance.now() - startTs) / 1000).toFixed(1)}s)`;
  return true;
}
