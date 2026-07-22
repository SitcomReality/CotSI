/**
 * initialGameState.js — Creates the bare game-state object skeleton.
 * Pure: takes resolved inputs, returns a fresh state object.
 * Does not place factions, mobs, or traders — those are handled by
 * championFactory and entityFactory after this runs.
 */
import { weatherForDay } from '../rules/weatherScript.js';

export function createInitialState({ seed, radius, biome, mapSettings, biomePalette, tiles, objectives, rng }) {
  return {
    screen: 'world',
    seed,
    radius,
    biome,
    mapSettings,
    biomePalette,
    day: 1,
    weather: weatherForDay(1),
    tiles,
    champions: [],
    mobs: [],
    traders: [],
    currentOrder: [],
    globalOrder: [],
    activeChampionId: '',
    objectives,
    logs: [{
      plainText: 'The page wakes. The Interregnum begins.',
      segments: [{ text: 'The page wakes. The Interregnum begins.' }],
      type: 'system',
      isDeath: false,
      isDayMarker: false,
    }],
    selectedTile: null,
    reward: null,
    dispatch: null,
    notice: null,
    deathOrder: [],
    deathEvent: null,
    winnerId: null,
    victoryReason: '',
    turnLock: false,
    _rng: rng,
  };
}
