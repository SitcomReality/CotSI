/**
 * Register tick handlers for idle animations (ring pulsing, etc.).
 * Called once after scene initialization.
 * @param {object} ctx - scene context returned by initScene
 * @param {function} getState - function that returns the current game state
 */
export function setupUnitAnimations(ctx, getState) {
  const clock = ctx.getClock && ctx.getClock();
  if (!clock) return;

  clock.onTick((time) => {
    const state = getState();
    if (!state) return;

    // Subtle bob for units — update instance matrices
    // (Can be added later for full polish)
  });
}