/**
 * combatRender.js — Runtime composition of the combat screen.
 *
 * The combat UI renderer lives in ui/ (it cannot import render/), so this
 * runtime bridge resolves each combatant's 3D portrait snapshot from the render
 * layer and hands the results to the DOM renderer. All combat flow callers
 * render through this single entry point.
 *
 * Layer: runtime/ — imports ui/ + render/ by design.
 */
import { renderCombat as renderCombatUI } from '../../ui/combat/combatRenderer.js';
import { getCombatantPortrait } from '../../render/hexmap3d/portrait/portraitThumbnail.js';

/**
 * Render the combat modal, attaching cached 3D portraits for both sides.
 * @param {object|null} combat — the active combat state (getCombatUI())
 */
export function renderCombat(combat) {
  const portraits = {
    first: getCombatantPortrait(combat?.first),
    second: getCombatantPortrait(combat?.second),
  };
  renderCombatUI(combat, portraits);
}
