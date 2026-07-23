/**
 * ponytail: assert walkable + Kenney corridor axis + collision/progression — fails if floorplan math regresses.
 * Run: npx --yes tsx src/games/horror-ward/wardMap.check.ts
 */
import {
  WARD7_MAP,
  buildWalkable,
  buildWallColliders,
  hitsAnyAabb,
  tileOpenings,
  phaseForGz,
  tilesInPhase,
  CELL,
  DUNGEON_Y,
  EYE_HEIGHT,
  WALK_RADIUS,
  PLAYER_RADIUS,
  WALL_INSET,
  cellWorld,
  isSpineCorridorRot,
} from './wardMap.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const walk = buildWalkable(WARD7_MAP);
assert(walk.has('0,1'), 'lobby corridor walkable');
assert(walk.has('-2,3') || walk.has('-1,3'), 'nurses room footprint walkable');
assert(phaseForGz(0) === 'lobby', 'gz0 lobby');
assert(phaseForGz(7) === 'bay', 'gz7 bay');
assert(phaseForGz(12) === 'mid', 'gz12 mid');
assert(phaseForGz(20) === 'deep', 'gz20 deep');
assert(tilesInPhase(WARD7_MAP, 'lobby').length >= 5, 'lobby has tiles');
assert(CELL === 4, 'CELL=4');
const c = cellWorld(2, 3);
assert(c.x === 8 && c.z === 12, 'cellWorld');

assert(DUNGEON_Y === 0, 'DUNGEON_Y must be 0 (floor top == world 0)');
assert(EYE_HEIGHT > 1.2 && EYE_HEIGHT < 2.0, 'EYE_HEIGHT sane for standing FPS');
assert(EYE_HEIGHT > DUNGEON_Y + 1.0, 'eye must clear walkable floor by ≥1m');
assert(WALK_RADIUS < 1.5, 'WALK_RADIUS must stay inside Kenney wall faces (~1.4)');
assert(WALL_INSET < 1.45 && WALL_INSET > 1.1, 'WALL_INSET near wall face');

// Spine tiles at gx=0 must open ±Z (rot 90 for straight corridor)
for (const t of WARD7_MAP.tiles) {
  if (t.gx !== 0) continue;
  if (t.tile === 'room-small' || t.tile === 'room-large' || t.tile === 'gate-door') continue;
  assert(
    isSpineCorridorRot(t.tile, t.rot ?? 0),
    `spine tile ${t.tile}@gz=${t.gz} rot=${t.rot ?? 0} blocks +Z path`,
  );
}

// EW spurs must NOT use spine rot 90 on plain corridor
for (const t of WARD7_MAP.tiles) {
  if (t.gx === 0) continue;
  if (t.tile !== 'corridor') continue;
  const r = ((t.rot ?? 0) % 360 + 360) % 360;
  assert(r === 0 || r === 180, `EW corridor ${t.room} should be rot 0/180, got ${r}`);
}

const src = JSON.stringify(WARD7_MAP.props);
assert(!src.includes('random'), 'props authored');

// —— Wall AABB: center of NS corridor must be free; wall face must block ——
const walls = buildWallColliders(WARD7_MAP);
assert(walls.length > 20, 'wall colliders authored from tiles');
assert(!hitsAnyAabb(0, 4, walls, PLAYER_RADIUS), 'lobby center must be clear');
assert(hitsAnyAabb(1.6, 4, walls, PLAYER_RADIUS), 'lobby east wall face must block (x≈1.6)');
assert(!hitsAnyAabb(0, 8, walls, PLAYER_RADIUS), 'spine mid must be clear');

const utilOpen = tileOpenings('corridor-end', 180);
assert(utilOpen.w && !utilOpen.e && !utilOpen.n && !utilOpen.s, 'utility end opens west only');

// —— UPS approachable: interact west of end curb ——
const ups = WARD7_MAP.interacts.find((i) => i.id === 'ups')!;
assert(ups.x < 7.2, 'UPS must sit west of corridor-end curb for approach');
assert(Math.hypot(ups.x - 6.0, ups.z - 12) < 1.2, 'UPS near approachable utility channel');

// —— Gate blocks movement; badges gated behind UPS ——
const gate = WARD7_MAP.interacts.find((i) => i.id === 'bay_b_gate')!;
assert(gate.blocks === true, 'Bay B gate must be a solid blocker');
assert(gate.gate === true, 'Bay B gate flagged locked');
for (const id of ['badge_1', 'badge_2', 'badge_3', 'doc_shift', 'lantern', 'lucid']) {
  const it = WARD7_MAP.interacts.find((i) => i.id === id)!;
  assert(it.requires === 'upsRestored', `${id} must require upsRestored`);
}

const stair = WARD7_MAP.interacts.find((i) => i.id === 'stair_gate')!;
assert(stair.blocks === true, 'stair gate blocks until unlocked');

console.log('wardMap.check.ts OK', {
  walkable: walk.size,
  walls: walls.length,
  tiles: WARD7_MAP.tiles.length,
  DUNGEON_Y,
  EYE_HEIGHT,
  WALK_RADIUS,
  PLAYER_RADIUS,
});
