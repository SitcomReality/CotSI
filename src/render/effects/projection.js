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

    // ---- DIAGNOSTIC: manual projection comparison ----
    if (Math.abs(worldX) < 5 && Math.abs(worldZ) < 5) {
        // Manual orthographic projection using camera frustum + view matrix
        const viewMatrix = new THREE.Matrix4().copy(camera.matrixWorld).invert();
        const camSpace = _worldVec.clone().applyMatrix4(viewMatrix);
        
        // Manual NDC from ortho frustum
        const ndcX = (camSpace.x - camera.left) / (camera.right - camera.left) * 2 - 1;
        const ndcY = (camSpace.y - camera.bottom) / (camera.top - camera.bottom) * 2 - 1;
        
        const manualX = (ndcX * 0.5 + 0.5) * cssW;
        const manualY = (-ndcY * 0.5 + 0.5) * cssH;
        
        console.log('[proj-comparison] world=(', worldX.toFixed(2), worldY.toFixed(2), worldZ.toFixed(2), ')');
        console.log('  THREE.project → screen=(', x.toFixed(1), ',', y.toFixed(1), ')');
        console.log('  manual        → screen=(', manualX.toFixed(1), ',', manualY.toFixed(1), ')');
        console.log('  delta=(', (x - manualX).toFixed(2), ',', (y - manualY).toFixed(2), ')');
        console.log('  camera.worldPos=', camera.position.x.toFixed(2), camera.position.y.toFixed(2), camera.position.z.toFixed(2));
    }
    // ---- END DIAGNOSTIC ----

    // ---- DIAGNOSTIC: log frustum vs canvas aspect ----
    if (Math.abs(worldX) < 2 && Math.abs(worldZ) < 2) {  // only near origin
        const frustumWidth = camera.right - camera.left;
        const frustumHeight = camera.top - camera.bottom;
        const frustumAspect = frustumWidth / frustumHeight;
        const canvasAspect = cssW / cssH;
        console.log('[proj] frustum:', 
            'l=', camera.left.toFixed(3), 'r=', camera.right.toFixed(3),
            't=', camera.top.toFixed(3), 'b=', camera.bottom.toFixed(3));
        console.log('[proj] aspects:', 
            'frustum=', frustumAspect.toFixed(4), 
            'canvas=', canvasAspect.toFixed(4),
            'match=', (Math.abs(frustumAspect - canvasAspect) < 0.001));
        console.log('[proj] camState.aspect=', camera.userData?.aspect ?? 'N/A (not stored)');
        console.log('[proj] cssW=', cssW.toFixed(1), 'cssH=', cssH.toFixed(1),
            'canvas.physW=', canvas.width, 'canvas.physH=', canvas.height);
    }
    // ---- END DIAGNOSTIC ----

    return { x, y };
}