/**
 * shadowQuality.js — Dev-only shadow map resolution cycler.
 *
 * shadowLightConfig.mapSize stays 2048 by default (1024 aliases badly); this
 * lets the dev panel A/B the resolution against frame time without a rebuild.
 *
 * Layer: dev/ — imports render/ scene context and shadow config.
 */

import { getSceneContext } from '../../render/hexmap3d/sceneContext.js';
import { shadowLightConfig } from '../../render/shadowLightConfig.js';
import { applyShadowConfig } from '../../render/hexmap3d/scene/lightSetup.js';

/** Cycled resolutions (px per side). */
const SHADOW_MAP_SIZES = [1024, 2048, 4096];

/**
 * Advance to the next shadow map resolution and rebuild the shadow map.
 * @returns {number} the new size in pixels
 */
export function cycleShadowQuality() {
  const idx = SHADOW_MAP_SIZES.indexOf(shadowLightConfig.mapSize);
  shadowLightConfig.mapSize = SHADOW_MAP_SIZES[(idx + 1) % SHADOW_MAP_SIZES.length];

  const ctx = getSceneContext();
  const light = ctx?.lights?.directional;
  if (light && ctx.renderer?.shadowMap?.enabled) {
    const shadow = light.shadow;
    // Force reallocation at the new size. VSM keeps a second target for the
    // blur pass; both must be released or their sizes diverge.
    if (shadow.map) {
      if (shadow.map.depthTexture) {
        shadow.map.depthTexture.dispose();
        shadow.map.depthTexture = null;
      }
      shadow.map.dispose();
      shadow.map = null;
    }
    if (shadow.mapPass) {
      shadow.mapPass.dispose();
      shadow.mapPass = null;
    }
    applyShadowConfig(light);
    ctx.requestShadowUpdate?.();
  }

  return shadowLightConfig.mapSize;
}
