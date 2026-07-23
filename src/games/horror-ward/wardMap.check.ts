/**
 * ponytail: assert walkable + Kenney corridor axis — fails if floorplan math regresses.
 * Run: npx --yes tsx src/games/horror-ward/wardMap.check.ts
 */
import {
  WARD7_MAP,
  buildWalkable,
  phaseForGz,
  tilesInPhase,
  CELL,
  DUNGEON_Y,
  EYE_HEIGHT,
  WALK_RADIUS,
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

console.log('wardMap.check.ts OK', {
  walkable: walk.size,
  tiles: WARD7_MAP.tiles.length,
  DUNGEON_Y,
  EYE_HEIGHT,
  WALK_RADIUS,
});
