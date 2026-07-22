/**
 * terrainGenerator.js — Seeded terrain generation algorithm.
 * Pure: takes a seed, returns tiles. Hex-grid math lives in engine/rules/hexGrid.js.
 *
 * Supports biome-driven thresholds and map parameter multipliers:
 *   - heightVariation: scales elevation noise amplitude
 *   - wateriness:     multiplies the water maxElevation threshold (higher = more water)
 *   - mountainousness: divides the mountain minElevation threshold (higher = more mountains)
 */
import { seededNoise, stringSeed } from '../../engine/rules/seededRng.js';
import { coordKey, parseKey, distance, neighbors, hexesWithinRadius } from '../../engine/rules/hexGrid.js';
import { TERRAIN } from './terrainTypes.js';
import { DEFAULT_THRESHOLDS, DEFAULT_FEATURES } from './terrainTypes.js';

/**
 * Generate a tile map for a given seed and radius.
 *
 * @param {string}  seedText     - Seed string for reproducible generation
 * @param {number}  radius       - Hex map radius (center 0,0)
 * @param {object}  [biomeDef]   - Resolved biome archetype definition, or null for defaults
 * @param {object}  [params]     - Map parameter multipliers
 * @param {number}  [params.heightVariation=1]  - Elevation noise amplitude multiplier
 * @param {number}  [params.wateriness=1]       - Water threshold multiplier
 * @param {number}  [params.mountainousness=1]  - Mountain threshold divisor
 * @returns {object} tiles keyed by "q,r"
 */
export function generateTiles(seedText, radius, biomeDef = null, params = {}){
  const seed = stringSeed(seedText);
  const thresholds = biomeDef?.terrainThresholds || DEFAULT_THRESHOLDS;
  const features = biomeDef?.featureFrequencies || DEFAULT_FEATURES;

  const heightMult = params.heightVariation ?? 1.0;
  const waterMult = params.wateriness ?? 1.0;
  const mountainMult = params.mountainousness ?? 1.0;

  // Resolve thresholds with parameter multipliers
  const mtThreshold = thresholds.mountain?.minElevation !== undefined
    ? thresholds.mountain.minElevation / Math.max(0.1, mountainMult)
    : 0.905 / Math.max(0.1, mountainMult);
  const waterThreshold = thresholds.water?.maxElevation !== undefined
    ? thresholds.water.maxElevation * waterMult
    : 0.07 * waterMult;
  const waterMinMoisture = thresholds.water?.minMoisture ?? 0.5;
  const forestMinMoisture = thresholds.forest?.minMoisture ?? 0.72;
  const desertMaxMoisture = thresholds.desert?.maxMoisture ?? 0.20;
  const marshMinMoisture = thresholds.marsh?.minMoisture ?? 0.58;
  const marshMaxElevation = thresholds.marsh?.maxElevation ?? 0.35;

  const treeThreshold = features.tree?.threshold ?? 0.935;
  const treeExclude = features.tree?.exclude ?? ['desert'];
  const knotThreshold = features.knot?.threshold ?? 0.038;

  const tiles={};
  for(const c of hexesWithinRadius(radius)){
    const elevation = seededNoise(seed, c.q, c.r, 1) * heightMult;
    const moisture = seededNoise(seed, c.q, c.r, 2);
    let terrain='plains';
    if(elevation > mtThreshold) terrain='mountain';
    else if(elevation < waterThreshold && moisture > waterMinMoisture) terrain='water';
    else if(moisture > forestMinMoisture) terrain='forest';
    else if(moisture < desertMaxMoisture) terrain='desert';
    else if(moisture > marshMinMoisture && elevation < marshMaxElevation) terrain='marsh';
    const key = coordKey(c);
    tiles[key] = {...c, terrain, feature:null };
  }
  // ensure contiguous passable land
  const passableKeys = Object.keys(tiles).filter(k=> TERRAIN[tiles[k].terrain].passable);
  const seen = new Set();
  const start = passableKeys.find(k=> distance(parseKey(k),{q:0,r:0}) < radius/2) ?? passableKeys[0];
  if(start){
    const q=[start]; seen.add(start);
    while(q.length){
      const cur=q.shift();
      for(const n of neighbors(parseKey(cur)).map(coordKey)){
        if(tiles[n] && TERRAIN[tiles[n].terrain].passable && !seen.has(n)){ seen.add(n); q.push(n); }
      }
    }
  }
  for(const k of passableKeys){ if(!seen.has(k)) tiles[k].terrain='mountain'; }

  // ==== Mountain group tagging (chains, peaks, foothills) ====
  const mountainKeys = Object.keys(tiles).filter(k => tiles[k].terrain === 'mountain');
  const mtSeen = new Set();
  for (const key of mountainKeys) {
    if (mtSeen.has(key)) continue;
    // Flood-fill to find the contiguous mountain group
    const group = [];
    const queue = [key];
    mtSeen.add(key);
    while (queue.length) {
      const cur = queue.shift();
      group.push(cur);
      for (const n of neighbors(parseKey(cur)).map(coordKey)) {
        if (tiles[n] && tiles[n].terrain === 'mountain' && !mtSeen.has(n)) {
          mtSeen.add(n);
          queue.push(n);
        }
      }
    }
    // Tag each tile in the group
    if (group.length === 1) {
      tiles[group[0]].mountainType = 'isolated';
    } else {
      for (const gk of group) {
        const neighborCount = neighbors(parseKey(gk))
          .filter(n => tiles[coordKey(n)] && tiles[coordKey(n)].terrain === 'mountain')
          .length;
        tiles[gk].mountainType = neighborCount >= 4 ? 'peak' : 'slope';
      }
    }
  }

  // ==== Water cluster tagging (lakes vs ocean) ====
  const waterKeys = Object.keys(tiles).filter(k => tiles[k].terrain === 'water');
  const wSeen = new Set();
  for (const key of waterKeys) {
    if (wSeen.has(key)) continue;
    // Flood-fill this water cluster
    const cluster = [];
    const queue = [key];
    wSeen.add(key);
    while (queue.length) {
      const cur = queue.shift();
      cluster.push(cur);
      for (const n of neighbors(parseKey(cur)).map(coordKey)) {
        if (tiles[n] && tiles[n].terrain === 'water' && !wSeen.has(n)) {
          wSeen.add(n);
          queue.push(n);
        }
      }
    }
    // Check if any tile in the cluster touches the map edge
    const touchesEdge = cluster.some(k => {
      const p = parseKey(k);
      return distance({ q: 0, r: 0 }, p) >= radius - 0.5;
    });
    const waterType = touchesEdge ? 'ocean' : 'lake';
    for (const wk of cluster) {
      tiles[wk].waterType = waterType;
    }
  }

  // ==== Sprinkle features using biome frequencies ====
  for (const t of Object.values(tiles)) {
    if (!TERRAIN[t.terrain].passable) continue;
    const roll = seededNoise(seed, t.q, t.r, 4);
    if (roll > treeThreshold && !treeExclude.includes(t.terrain)) {
      // Assign density tier based on terrain
      const density = t.terrain === 'forest' ? 'dense'
        : t.terrain === 'plains' ? 'medium'
        : 'sparse';
      t.feature = { kind: 'tree', nextFruitDay: 1, ripe: true, density };
    } else if (roll < knotThreshold) {
      t.feature = { kind: 'knot', mined: false, amount: 2 + Math.floor(roll * 100) % 3 };
    }
  }

  // ==== Environmental debris (grass tufts, rocks, flowers) ====
  for (const t of Object.values(tiles)) {
    if (!TERRAIN[t.terrain].passable) continue;
    if (t.feature) continue; // skip tiles that already have a feature
    const debrisRoll = seededNoise(seed, t.q, t.r, 5);
    if (debrisRoll > 0.92) {
      const kindRoll = seededNoise(seed, t.q, t.r, 6);
      const kind = kindRoll < 0.4 ? 'tuft'
        : kindRoll < 0.7 ? 'rock'
        : 'flower';
      t.debris = { kind };
    }
  }

  return tiles;
}
