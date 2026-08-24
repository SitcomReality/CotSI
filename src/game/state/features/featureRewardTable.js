/**
 * featureRewardTable.js — The feature reward table and its data helpers.
 *
 * The pure-data half of the feature rewards engine (featureRewards.js):
 *
 *   - `featureName(kind)` — canonical display names from the archetype
 *     registry (namingConventions.md §6),
 *   - choice-card builders (`choiceCard`, `goldCard`, `relicCard`, ...) —
 *     pure data payloads for the `state.reward` modal and bot policies,
 *   - `FEATURES` — the reward table every reward-bearing feature kind resolves
 *     through (class, log line, grants / choices).
 *
 * No state mutation here — the engine (featureRewards.js) applies everything.
 * Layer: game/state — imports engine, game/rules, itself.
 */
import { getArchetype } from '../../rules/archetypes.js';
import { LOG_CATEGORY } from '../../rules/logGrammar.js';
import {
  FEATURE_RELIC_AMOUNT,
  FEATURE_CRYSTAL_GOLD,
  FEATURE_KNOTS_AMOUNT,
  FEATURE_LAMB_HEAL,
  FEATURE_COPYIST_DEFENSE,
  FEATURE_WAXBLOOM_HEAL,
  FEATURE_CINDERBLOOM_HEAL,
  FEATURE_EDEN_MUSHROOM_HEAL,
  FEATURE_EDEN_SHROOMLET_HEAL,
  FEATURE_PERIDEXION_HEAL,
  FEATURE_PERIDEXION_DEFENSE,
  FEATURE_SCORIA_KNOTS,
  FEATURE_SNOWPERSON_MOVEMENT,
  FEATURE_RIBS_DEFENSE,
  FEATURE_INITIAL_BUFF,
  FEATURE_CENSER_ATTACK,
  FEATURE_CENSER_HP_COST,
  FEATURE_CHOICE_GOLD_STANDARD,
  FEATURE_CHOICE_GOLD_RICH,
  FEATURE_CHOICE_GOLD_WITNESS,
  FEATURE_SCREAMROOT_RISK_KNOTS,
  FEATURE_SCREAMROOT_HP_COST,
  FEATURE_SCREAMROOT_SAFE_KNOTS,
  FEATURE_CHOICE_MOVEMENT,
} from '../../../params/game/economyParams.js';

// ── Canonical names ───────────────────────────────────────────────────────────
// Every feature's display name comes from the archetype registry so UI text and
// code use the same vocabulary (namingConventions.md §6).

export function featureName(kind) {
  return getArchetype(`feature_${kind}`)?.name || kind;
}

// ── Choice card builders ──────────────────────────────────────────────────────
// Cards are pure data: { id, label, type, effects, grant, claim }.
// `grant` is what applyFeatureChoice applies; `claim` feeds the log line
// ("<name> claims <claim>") and the ledger suffix.

export function choiceCard({ id, label, type, effects, grant, claim }) {
  return { id, label, type, effects, grant, claim };
}

function goldCard(amount) {
  return choiceCard({
    id: 'gold',
    label: `${amount} gold`,
    type: 'gold',
    effects: [{ icon: 'i-gold', label: `+${amount} gold` }],
    grant: { kind: 'gold', amount },
    claim: `a pouch of ${amount} gold`,
  });
}

function relicCard(source) {
  return choiceCard({
    id: 'relic',
    label: 'Relic',
    type: 'relic',
    effects: [{ icon: 'i-relic', label: `+${FEATURE_RELIC_AMOUNT} relic` }],
    grant: { kind: 'relic', amount: FEATURE_RELIC_AMOUNT },
    claim: `a relic from the ${source}`,
  });
}

function movementCard(source) {
  return choiceCard({
    id: 'movement',
    label: `+${FEATURE_CHOICE_MOVEMENT} AP this turn`,
    type: 'ap',
    effects: [{ icon: 'i-move', label: `+${FEATURE_CHOICE_MOVEMENT} AP this turn` }],
    grant: { kind: 'movement', amount: FEATURE_CHOICE_MOVEMENT },
    claim: `a surge of ${FEATURE_CHOICE_MOVEMENT} steps from the ${source}`,
  });
}

function potencyCard(source) {
  return choiceCard({
    id: 'potency',
    label: '+1 potency',
    type: 'potency',
    effects: [{ icon: 'i-potency', label: '+1 random potency' }],
    grant: { kind: 'potency-random', amount: 1 },
    claim: `a potency from the ${source}`,
  });
}

/** Card granting a specific catalog item (equips via trading.equipItem). */
export function equipmentCard(item, source) {
  const slotIcon = item.slot === 'weapon' ? 'i-weapon' : 'i-armor';
  const effect = item.bonus?.attack
    ? { icon: 'i-attack', label: `+${item.bonus.attack} attack` }
    : item.bonus?.defense
      ? { icon: 'i-armor', label: `+${item.bonus.defense} defense` }
      : { icon: slotIcon, label: item.name };
  return choiceCard({
    id: `equipment-${item.id}`,
    label: `${item.name} (${item.slot})`,
    type: 'equipment',
    effects: [{ icon: slotIcon, label: effect.label }],
    grant: { kind: 'equipment', itemId: item.id },
    claim: `${item.name} from the ${source}`,
  });
}

// ── Feature reward table ──────────────────────────────────────────────────────
// class: 'direct' (consume on arrival) | 'choice' (modal for humans) |
//        'potency-pick' (choice of which faction) | 'regrow' (timer-based).
// log:  { verb, object, category } for the arrival log line.
// grants: [{ kind, amount, faction?, damage? }] — see _applyGrant.

export const FEATURES = {
  // ── Direct finite grants ─────────────────────────────────────────────────
  palimpsestSlab: {
    class: 'direct',
    log: { verb: 'unearths', object: 'a relic from the Palimpsest Slab', category: LOG_CATEGORY.ECONOMY },
    grants: [{ kind: 'relic', amount: FEATURE_RELIC_AMOUNT }],
  },
  vegetableLamb: {
    class: 'direct',
    log: { verb: 'harvests', object: 'the Vegetable Lamb of Tartary', category: LOG_CATEGORY.ECONOMY },
    grants: [
      { kind: 'knots', amount: FEATURE_KNOTS_AMOUNT },
      { kind: 'heal', amount: FEATURE_LAMB_HEAL },
    ],
  },
  dustbleedCrystal: {
    class: 'direct',
    log: { verb: 'gathers', object: 'a Dustbleed Crystal', category: LOG_CATEGORY.ECONOMY },
    grants: [
      { kind: 'gold', amount: FEATURE_CRYSTAL_GOLD },
      { kind: 'potency-random', amount: 1 },
    ],
  },
  drownedCopyist: {
    class: 'direct',
    log: { verb: 'reads', object: 'the Drowned Copyist', category: LOG_CATEGORY.ECONOMY },
    grants: [
      { kind: 'knots', amount: FEATURE_KNOTS_AMOUNT },
      { kind: 'defense', amount: FEATURE_COPYIST_DEFENSE },
    ],
  },

  // ── Choice rewards (finite) ──────────────────────────────────────────────
  witnessStone: {
    class: 'choice',
    body: 'The Witness-Stone murmurs of what was, and what is owed.',
    choices: [relicCard('Witness-Stone'), goldCard(FEATURE_CHOICE_GOLD_WITNESS)],
  },
  screamroot: {
    class: 'choice',
    body: 'The roots writhe. A bargain with the buried voice?',
    choices: [
      choiceCard({
        id: 'savor',
        label: `Savor the roots (+${FEATURE_SCREAMROOT_RISK_KNOTS} God's Knots, -${FEATURE_SCREAMROOT_HP_COST} HP)`,
        type: 'knot',
        effects: [
          { icon: 'd-knot', label: `+${FEATURE_SCREAMROOT_RISK_KNOTS} God's Knots` },
          { icon: 'i-attack', label: `-${FEATURE_SCREAMROOT_HP_COST} HP` },
        ],
        grant: { kind: 'knots', amount: FEATURE_SCREAMROOT_RISK_KNOTS, damage: FEATURE_SCREAMROOT_HP_COST },
        claim: `${FEATURE_SCREAMROOT_RISK_KNOTS} God's Knots from the Screamroot`,
      }),
      choiceCard({
        id: 'clip',
        label: `Clip a sprig (+${FEATURE_SCREAMROOT_SAFE_KNOTS} God's Knots)`,
        type: 'knot',
        effects: [{ icon: 'd-knot', label: `+${FEATURE_SCREAMROOT_SAFE_KNOTS} God's Knots` }],
        grant: { kind: 'knots', amount: FEATURE_SCREAMROOT_SAFE_KNOTS },
        claim: `${FEATURE_SCREAMROOT_SAFE_KNOTS} God's Knots from the Screamroot`,
      }),
    ],
  },
  nullLily: {
    class: 'potency-pick',
    body: 'Seven petals, seven hollow blooms. Each tastes of a different absence.',
  },
  volvelle: {
    class: 'potency-pick',
    body: 'The brass wheel spins to a faction of its own choosing.',
  },
  foolsFire: {
    class: 'choice',
    body: "A will-o'-wisp dances. Follow it, or take what it offers?",
    choices: [movementCard("Fool's-Fire"), goldCard(FEATURE_CHOICE_GOLD_STANDARD)],
  },
  halfDrawnObelisk: {
    class: 'choice',
    body: 'The unfinished obelisk leans toward a destination that was never drawn.',
    choices: [movementCard('Half-Drawn Obelisk'), goldCard(FEATURE_CHOICE_GOLD_STANDARD)],
  },
  ouroborosLoop: {
    class: 'choice',
    body: 'The loop coils back on itself, offering to end where it began.',
    choices: [relicCard('Ouroboros Loop'), goldCard(FEATURE_CHOICE_GOLD_RICH)],
  },
  errataSlip: {
    class: 'choice',
    body: 'A scribbled correction flutters loose.',
    choices: [potencyCard('Errata Slip'), goldCard(FEATURE_CHOICE_GOLD_RICH)],
  },
  listenerLichen: {
    class: 'choice',
    body: 'The lichen leans in, listening.',
    choices: [potencyCard('Listener Lichen'), goldCard(FEATURE_CHOICE_GOLD_STANDARD)],
  },
  gildedInitial: {
    class: 'choice',
    body: 'A gilded flourish, opening the first line of a duel.',
    choices: [
      choiceCard({
        id: 'attack',
        label: `+${FEATURE_INITIAL_BUFF} attack this turn`,
        type: 'attack',
        effects: [{ icon: 'i-attack', label: `+${FEATURE_INITIAL_BUFF} attack this turn` }],
        grant: { kind: 'attack', amount: FEATURE_INITIAL_BUFF },
        claim: `${FEATURE_INITIAL_BUFF} attack from the Gilded Initial`,
      }),
      choiceCard({
        id: 'defense',
        label: `+${FEATURE_INITIAL_BUFF} defense this turn`,
        type: 'defense',
        effects: [{ icon: 'i-armor', label: `+${FEATURE_INITIAL_BUFF} defense this turn` }],
        grant: { kind: 'defense', amount: FEATURE_INITIAL_BUFF },
        claim: `${FEATURE_INITIAL_BUFF} defense from the Gilded Initial`,
      }),
    ],
  },
  censerSaint: {
    class: 'choice',
    body: "The censer swings. A saint's blessing — or its price?",
    choices: [
      choiceCard({
        id: 'blessing',
        label: `+${FEATURE_CENSER_ATTACK} attack, -${FEATURE_CENSER_HP_COST} HP`,
        type: 'attack',
        effects: [
          { icon: 'i-attack', label: `+${FEATURE_CENSER_ATTACK} attack this turn` },
          { icon: 'i-attack', label: `-${FEATURE_CENSER_HP_COST} HP` },
        ],
        grant: { kind: 'attack', amount: FEATURE_CENSER_ATTACK, damage: FEATURE_CENSER_HP_COST },
        claim: "the Censer Saint's blessing",
      }),
      goldCard(FEATURE_CHOICE_GOLD_STANDARD),
    ],
  },

  // ── Replenishable (regrow) ───────────────────────────────────────────────
  waxbloom: {
    class: 'regrow',
    log: { verb: 'gathers', object: 'a Waxbloom', category: LOG_CATEGORY.HEAL },
    grants: [{ kind: 'heal', amount: FEATURE_WAXBLOOM_HEAL }],
  },
  cinderbloom: {
    class: 'regrow',
    log: { verb: 'gathers', object: 'a Cinderbloom', category: LOG_CATEGORY.HEAL },
    grants: [{ kind: 'heal', amount: FEATURE_CINDERBLOOM_HEAL }],
  },
  edenMushroom: {
    class: 'regrow',
    log: { verb: 'gathers', object: 'an Eden Mushroom', category: LOG_CATEGORY.HEAL },
    grants: [{ kind: 'heal', amount: FEATURE_EDEN_MUSHROOM_HEAL }],
  },
  edenShroomlet: {
    class: 'regrow',
    log: { verb: 'gathers', object: 'a Shroomlet', category: LOG_CATEGORY.HEAL },
    grants: [{ kind: 'heal', amount: FEATURE_EDEN_SHROOMLET_HEAL }],
  },
  scoriaRose: {
    class: 'regrow',
    log: { verb: 'plucks', object: 'a Scoria Rose', category: LOG_CATEGORY.ECONOMY },
    grants: [{ kind: 'knots', amount: FEATURE_SCORIA_KNOTS }],
  },
  peridexionTree: {
    class: 'regrow',
    log: { verb: 'harvests', object: 'the Peridexion Tree', category: LOG_CATEGORY.HEAL },
    grants: [
      { kind: 'heal', amount: FEATURE_PERIDEXION_HEAL },
      { kind: 'defense', amount: FEATURE_PERIDEXION_DEFENSE },
    ],
  },
  snowperson: {
    class: 'regrow',
    log: { verb: 'meets', object: 'the Snowperson', category: LOG_CATEGORY.SYSTEM },
    grants: [{ kind: 'movement', amount: FEATURE_SNOWPERSON_MOVEMENT }],
  },
  saintsRib: {
    class: 'regrow',
    log: { verb: 'passes beneath', object: "the Saint's Rib", category: LOG_CATEGORY.SYSTEM },
    grants: [{ kind: 'defense', amount: FEATURE_RIBS_DEFENSE }],
  },
};
