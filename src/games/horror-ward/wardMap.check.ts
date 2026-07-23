/**
 * ponytail: assert walkable + phase helpers — fails if floorplan math regresses.
 * Run: npx --yes tsx src/games/horror-ward/wardMap.check.ts
 */
import {
  WARD7_MAP,
  buildWalkable,
  phaseForGz,
  tilesInPhase,
  CELL,
  cellWorld,
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

// No Math.random in map props
const src = JSON.stringify(WARD7_MAP.props);
assert(!src.includes('random'), 'props authored');

console.log('wardMap.check.ts OK', { walkable: walk.size, tiles: WARD7_MAP.tiles.length });
