import * as THREE from '../../lib/three.module.js';

/**
 * Register tick handlers for idle animations (ring pulsing, etc.).
 * Called once after scene initialization.
 * @param {object} ctx - scene context returned by initScene
 * @param {function} getState - function that returns the current game state
 */
export function setupUnitAnimations(ctx, getState) {
  ctx.onTick((time) => {
    const state = getState();
    if (!state) return;

    // Find active champion ring and pulse it
    const rings = ctx.scene.children.filter(c => c.name === 'championRings');
    for (const ring of rings) {
      if (ring.isInstancedMesh) {
        const pulse = 1 + Math.sin(time * 3) * 0.1;
        ring.scale.setScalar(pulse);
      }
    }

    // Subtle bob for units — update instance matrices
    // (Can be added later for full polish)
  });
}