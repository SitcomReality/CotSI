// src/render/effects/projection.js
import * as THREE from '../../lib/three.module.js';

const _worldVec = new THREE.Vector3();
const _screenVec = new THREE.Vector3();

/**
 * Project a 3D world position to 2D canvas pixel coordinates.
 * @param {number} worldX
 * @param {number} worldY - vertical (typically surfaceY)
 * @param {number} worldZ
 * @param {THREE.Camera} camera
 * @param {HTMLCanvasElement} canvas - the effects overlay (css-sized)
 * @returns {{ x: number, y: number } | null} pixel coords or null if behind camera
 */
export function worldToScreen(worldX, worldY, worldZ, camera, canvas) {
    _worldVec.set(worldX, worldY, worldZ);
    _screenVec.copy(_worldVec).project(camera);
    
    if (_screenVec.z > 1) return null;
    
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    const x = (_screenVec.x * 0.5 + 0.5) * cssW;
    const y = (-_screenVec.y * 0.5 + 0.5) * cssH;

    return { x, y };
}