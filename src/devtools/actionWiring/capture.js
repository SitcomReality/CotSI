/**
 * actionWiring/capture.js — Register data-action handlers for the Capture tab.
 *
 * Layer: dev/ — wires capture.
 */

import { registerAction } from '../../shared/actionBus.js';
import { startRecording, stopRecording, isRecording } from '../capture/screenRecorder.js';

export function registerCaptureActions() {
  registerAction('dev:capture:start', () => {
    if (isRecording()) return;
    if (startRecording()) {
      document.getElementById('devCaptureStart').disabled = true;
      document.getElementById('devCaptureStop').disabled = false;
    } else {
      document.getElementById('devCaptureStatus').textContent = 'Failed to start (no map yet?).';
    }
  });

  registerAction('dev:capture:stop', () => {
    if (!isRecording()) return;
    stopRecording();
    document.getElementById('devCaptureStart').disabled = false;
    document.getElementById('devCaptureStop').disabled = true;
  });
}
