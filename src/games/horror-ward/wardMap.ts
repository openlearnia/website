/**
 * Ward 7 floor-plan — Kenney Modular Dungeon grid (game-engine tilemap skill).
 *
 * CELL = 4. room-small = 12×12 → center 2 cells off spine.
 * Kenney kit: floor TOP at local y=0, walls to ~4.
 * DUNGEON_Y = 0 → walkable world y≈0 (eye ~1.55, props on floor).
 *
 * Kenney corridor AXIS (raycast-verified):
 *   rot 0   → open ±X (east–west), walls on ±Z
 *   rot 90  → open ±Z (north–south), walls on ±X  ← spine default
 *   end 270 → open +Z only; end 90 → open −Z only
 *   end 0   → open +X only; end 180 → open −X only
 * Wrong rot puts wall slabs across the walk path (looks like “floors in the hall”).
 *
 * Load phases: lobby (gz≤3) first → bay → mid → deep.
 */

export const CELL = 4;
/** World Y of tile root. Keep 0 so kit floor top == walkable plane. */
export const DUNGEON_Y = 0;
/** Eye height above walkable floor (FPS camera). */
export const EYE_HEIGHT = 1.55;
/** Stay inside corridor walls (~1.4m from cell center to wall face). */
export const WALK_RADIUS = 1.25;
/** Player capsule radius for AABB wall tests. */
export const PLAYER_RADIUS = 0.32;
/** World half-width of walkable channel before wall face (~1.4). */
export const WALL_INSET = 1.32;
export const ASSET_ROOT = '/games/horror-ward/assets';

/** Axis openings for a Kenney tile at given yaw (degrees). */
export type TileOpenings = { n: boolean; s: boolean; e: boolean; w: boolean };

export type Aabb2 = { minX: number; maxX: number; minZ: number; maxZ: number; id?: string };

export function tileOpenings(tile: TileId, rot = 0): TileOpenings {
  const r = ((rot % 360) + 360) % 360;
  const closed: TileOpenings = { n: false, s: false, e: false, w: false };
  if (tile === 'corridor' || tile === 'corridor-wide') {
    // rot 0 → open ±X; rot 90 → open ±Z
    if (r === 0 || r === 180) return { n: false, s: false, e: true, w: true };
    return { n: true, s: true, e: false, w: false };
  }
  if (tile === 'corridor-end') {
    if (r === 0) return { ...closed, e: true };
    if (r === 180) return { ...closed, w: true };
    if (r === 90) return { ...closed, s: true };
    return { ...closed, n: true }; // 270
  }
  if (tile === 'corridor-intersection') return { n: true, s: true, e: true, w: true };
  if (tile === 'corridor-junction') {
    // rot 0 blocked +Z(N); 90 blocked +X(E); 180 blocked −Z(S); 270 blocked −X(W)
    if (r === 0) return { n: false, s: true, e: true, w: true };
    if (r === 90) return { n: true, s: true, e: false, w: true };
    if (r === 180) return { n: true, s: false, e: true, w: true };
    return { n: true, s: true, e: true, w: false };
  }
  if (tile === 'corridor-corner') {
    if (r === 0) return { n: true, s: false, e: true, w: false };
    if (r === 90) return { n: false, s: true, e: true, w: false };
    if (r === 180) return { n: false, s: true, e: false, w: true };
    return { n: true, s: false, e: false, w: true };
  }
  // rooms / stairs / gate: open (perimeter handled separately)
  return { n: true, s: true, e: true, w: true };
}

function pushWall(out: Aabb2[], id: string, minX: number, maxX: number, minZ: number, maxZ: number) {
  if (maxX <= minX || maxZ <= minZ) return;
  out.push({ minX, maxX, minZ, maxZ, id });
}

/** Solid wall slabs for one corridor-sized cell (walls on closed edges). */
export function cellWallAabbs(gx: number, gz: number, open: TileOpenings, id: string): Aabb2[] {
  const cx = gx * CELL;
  const cz = gz * CELL;
  const half = CELL / 2;
  const inset = WALL_INSET;
  const thick = half - inset + 0.08;
  const out: Aabb2[] = [];
  if (!open.e) pushWall(out, `${id}:e`, cx + inset, cx + half + 0.05, cz - half, cz + half);
  if (!open.w) pushWall(out, `${id}:w`, cx - half - 0.05, cx - inset, cz - half, cz + half);
  if (!open.n) pushWall(out, `${id}:n`, cx - half, cx + half, cz + inset, cz + half + 0.05);
  if (!open.s) pushWall(out, `${id}:s`, cx - half, cx + half, cz - half - 0.05, cz - inset);
  // silence unused thick (documents intent vs inset)
  void thick;
  return out;
}

/** Room-small is 12×12 (3×3 cells). Outer walls + openings toward adjacent walkable. */
export function roomSmallWallAabbs(
  gx: number,
  gz: number,
  walkable: Set<string>,
  id: string,
): Aabb2[] {
  const minGx = gx - 1;
  const maxGx = gx + 1;
  const minGz = gz - 1;
  const maxGz = gz + 1;
  const x0 = minGx * CELL - CELL / 2;
  const x1 = maxGx * CELL + CELL / 2;
  const z0 = minGz * CELL - CELL / 2;
  const z1 = maxGz * CELL + CELL / 2;
  const t = 0.45;
  const out: Aabb2[] = [];
  const gap = (side: 'n' | 's' | 'e' | 'w') => {
    // Door gap if a walkable cell sits outside the room on that side
    if (side === 'e') return walkable.has(`${maxGx + 1},${gz}`);
    if (side === 'w') return walkable.has(`${minGx - 1},${gz}`);
    if (side === 'n') return walkable.has(`${gx},${maxGz + 1}`);
    return walkable.has(`${gx},${minGz - 1}`);
  };
  const doorHalf = 1.15;
  // West wall
  if (gap('w')) {
    pushWall(out, `${id}:w0`, x0, x0 + t, z0, gz * CELL - doorHalf);
    pushWall(out, `${id}:w1`, x0, x0 + t, gz * CELL + doorHalf, z1);
  } else pushWall(out, `${id}:w`, x0, x0 + t, z0, z1);
  // East wall
  if (gap('e')) {
    pushWall(out, `${id}:e0`, x1 - t, x1, z0, gz * CELL - doorHalf);
    pushWall(out, `${id}:e1`, x1 - t, x1, gz * CELL + doorHalf, z1);
  } else pushWall(out, `${id}:e`, x1 - t, x1, z0, z1);
  // South wall
  if (gap('s')) {
    pushWall(out, `${id}:s0`, x0, gx * CELL - doorHalf, z0, z0 + t);
    pushWall(out, `${id}:s1`, gx * CELL + doorHalf, x1, z0, z0 + t);
  } else pushWall(out, `${id}:s`, x0, x1, z0, z0 + t);
  // North wall
  if (gap('n')) {
    pushWall(out, `${id}:n0`, x0, gx * CELL - doorHalf, z1 - t, z1);
    pushWall(out, `${id}:n1`, gx * CELL + doorHalf, x1, z1 - t, z1);
  } else pushWall(out, `${id}:n`, x0, x1, z1 - t, z1);
  return out;
}

/** Build static wall AABBs from the authored map (modular grid edges). */
export function buildWallColliders(map: WardMap): Aabb2[] {
  const walk = buildWalkable(map);
  const walls: Aabb2[] = [];
  for (const t of map.tiles) {
    if (t.tile === 'gate-door') continue;
    const id = `${t.room ?? t.tile}_${t.gx}_${t.gz}`;
    if (t.tile === 'room-small') {
      walls.push(...roomSmallWallAabbs(t.gx, t.gz, walk, id));
      continue;
    }
    if (t.tile === 'room-large') {
      // 5×5 footprint — same door-gap idea at center
      const minGx = t.gx - 2;
      const maxGx = t.gx + 2;
      const minGz = t.gz - 2;
      const maxGz = t.gz + 2;
      const x0 = minGx * CELL - CELL / 2;
      const x1 = maxGx * CELL + CELL / 2;
      const z0 = minGz * CELL - CELL / 2;
      const z1 = maxGz * CELL + CELL / 2;
      const thick = 0.45;
      pushWall(walls, `${id}:w`, x0, x0 + thick, z0, z1);
      pushWall(walls, `${id}:e`, x1 - thick, x1, z0, z1);
      pushWall(walls, `${id}:s`, x0, x1, z0, z0 + thick);
      pushWall(walls, `${id}:n`, x0, x1, z1 - thick, z1);
      continue;
    }
    walls.push(...cellWallAabbs(t.gx, t.gz, tileOpenings(t.tile, t.rot ?? 0), id));
  }
  return walls;
}

export function pointHitsAabb(x: number, z: number, b: Aabb2, radius: number): boolean {
  const nx = Math.max(b.minX, Math.min(x, b.maxX));
  const nz = Math.max(b.minZ, Math.min(z, b.maxZ));
  const dx = x - nx;
  const dz = z - nz;
  return dx * dx + dz * dz < radius * radius;
}

export function hitsAnyAabb(x: number, z: number, boxes: Aabb2[], radius: number): boolean {
  for (const b of boxes) {
    if (pointHitsAabb(x, z, b, radius)) return true;
  }
  return false;
}

/** Push a point out of overlapping AABBs (greedy axes). */
export function resolveAabbOverlap(
  x: number,
  z: number,
  boxes: Aabb2[],
  radius: number,
): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (let pass = 0; pass < 3; pass++) {
    for (const b of boxes) {
      if (!pointHitsAabb(px, pz, b, radius)) continue;
      const expanded = {
        minX: b.minX - radius,
        maxX: b.maxX + radius,
        minZ: b.minZ - radius,
        maxZ: b.maxZ + radius,
      };
      const dxL = px - expanded.minX;
      const dxR = expanded.maxX - px;
      const dzD = pz - expanded.minZ;
      const dzU = expanded.maxZ - pz;
      const m = Math.min(dxL, dxR, dzD, dzU);
      if (m === dxL) px = expanded.minX;
      else if (m === dxR) px = expanded.maxX;
      else if (m === dzD) pz = expanded.minZ;
      else pz = expanded.maxZ;
    }
  }
  return { x: px, z: pz };
}

export type LoadPhase = 'lobby' | 'bay' | 'mid' | 'deep';

export type TileId =
  | 'corridor'
  | 'corridor-corner'
  | 'corridor-junction'
  | 'corridor-intersection'
  | 'corridor-end'
  | 'corridor-wide'
  | 'room-small'
  | 'room-large'
  | 'stairs'
  | 'gate-door';

export type PropId =
  | 'desk'
  | 'bed'
  | 'chair'
  | 'lamp'
  | 'crate'
  | 'shelf'
  | 'door'
  | 'keycard'
  | 'cabinet'
  | 'trash'
  | 'table'
  | 'sink'
  | 'wallLamp'
  | 'plant';
export type LightKind = 'warm' | 'green' | 'cool';

export type TileSpec = { gx: number; gz: number; tile: TileId; rot?: number; room?: string };
export type PropSpec = { id: string; prop: PropId; x: number; z: number; rot?: number; scale?: number };
export type LightSpec = {
  id: string;
  kind: LightKind;
  x: number;
  y?: number;
  z: number;
  intensity?: number;
  range?: number;
};
export type SpawnSpec = { id: string; x: number; z: number; yaw?: number };
export type InteractSpec = {
  id: string;
  kind: string;
  x: number;
  z: number;
  label: string;
  w?: number;
  h?: number;
  d?: number;
  color?: string;
  gate?: boolean;
  /** Quest gate: disabled until flag is true (e.g. upsRestored). */
  requires?: 'upsRestored' | 'bayBOpen';
  /** Solid movement blocker while locked (gates/doors). */
  blocks?: boolean;
};

export type WardMap = {
  name: string;
  cell: number;
  tiles: TileSpec[];
  props: PropSpec[];
  lights: LightSpec[];
  spawns: SpawnSpec[];
  interacts: InteractSpec[];
  checkpoints: SpawnSpec[];
};

export function cellWorld(gx: number, gz: number) {
  return { x: gx * CELL, z: gz * CELL };
}

export function phaseForGz(gz: number): LoadPhase {
  if (gz <= 3) return 'lobby';
  if (gz <= 8) return 'bay';
  if (gz <= 14) return 'mid';
  return 'deep';
}

export function phaseOrder(): LoadPhase[] {
  return ['lobby', 'bay', 'mid', 'deep'];
}

export function tilesInPhase(map: WardMap, phase: LoadPhase) {
  return map.tiles.filter((t) => phaseForGz(t.gz) === phase);
}

export function propsInPhase(map: WardMap, phase: LoadPhase) {
  return map.props.filter((p) => phaseForGz(Math.round(p.z / CELL)) === phase);
}

export function lightsInPhase(map: WardMap, phase: LoadPhase) {
  return map.lights.filter((l) => phaseForGz(Math.round(l.z / CELL)) === phase);
}

/** Walkable "gx,gz" keys from tile footprints. */
export function buildWalkable(map: WardMap): Set<string> {
  const walk = new Set<string>();
  const add = (gx: number, gz: number) => walk.add(`${gx},${gz}`);
  for (const t of map.tiles) {
    if (t.tile === 'gate-door') continue;
    if (t.tile === 'room-small') {
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) add(t.gx + dx, t.gz + dz);
    } else if (t.tile === 'room-large') {
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) add(t.gx + dx, t.gz + dz);
    } else {
      add(t.gx, t.gz);
    }
  }
  return walk;
}

export const WARD7_MAP: WardMap = {
  name: 'Ashford Ward 7',
  cell: CELL,
  tiles: [
    // Spine runs +Z — Kenney corridor needs rot 90 (open ±Z). rot 0 walls block the path.
    { gx: 0, gz: 0, tile: 'corridor-end', rot: 270, room: 'lobby_south' },
    { gx: 0, gz: 1, tile: 'corridor', rot: 90, room: 'lobby' },
    { gx: 0, gz: 2, tile: 'corridor', rot: 90, room: 'lobby' },
    { gx: 0, gz: 3, tile: 'corridor-intersection', room: 'nurses_hub' },
    { gx: -2, gz: 3, tile: 'room-small', rot: 90, room: 'nurses_station' },
    // EW utility spur — rot 0 opens ±X
    { gx: 1, gz: 3, tile: 'corridor', rot: 0, room: 'utility' },
    { gx: 2, gz: 3, tile: 'corridor-end', rot: 180, room: 'utility_ups' },

    { gx: 0, gz: 4, tile: 'corridor', rot: 90, room: 'bay_b_gate' },
    { gx: 0, gz: 5, tile: 'corridor', rot: 90, room: 'bay_b' },
    { gx: 0, gz: 6, tile: 'corridor', rot: 90, room: 'bay_b' },
    { gx: 0, gz: 7, tile: 'corridor-intersection', room: 'bay_b_mid' },
    { gx: -1, gz: 7, tile: 'corridor', rot: 0, room: 'patient_alcove_w' },
    { gx: -2, gz: 7, tile: 'corridor-end', rot: 0, room: 'patient_alcove_w' },
    { gx: 1, gz: 7, tile: 'corridor', rot: 0, room: 'patient_alcove_e' },
    { gx: 2, gz: 7, tile: 'corridor-end', rot: 180, room: 'patient_alcove_e' },
    { gx: 0, gz: 8, tile: 'corridor', rot: 90, room: 'bay_b' },

    // T: open N/S/E (dayroom east)
    { gx: 0, gz: 9, tile: 'corridor-junction', rot: 270, room: 'dayroom_hub' },
    { gx: 2, gz: 9, tile: 'room-small', rot: 270, room: 'dayroom' },
    { gx: 0, gz: 10, tile: 'corridor', rot: 90, room: 'hall' },
    { gx: 0, gz: 11, tile: 'corridor-intersection', room: 'pharm_hub' },
    { gx: 2, gz: 11, tile: 'room-small', rot: 270, room: 'pharmacy' },
    { gx: -1, gz: 11, tile: 'corridor', rot: 0, room: 'lucid_hall' },
    { gx: -2, gz: 11, tile: 'corridor-end', rot: 0, room: 'lucid_room' },

    { gx: 0, gz: 12, tile: 'corridor', rot: 90, room: 'stair_approach' },
    { gx: 0, gz: 13, tile: 'corridor', rot: 90, room: 'stairwell' },
    { gx: 0, gz: 14, tile: 'corridor', rot: 90, room: 'stair_landing' },

    { gx: 0, gz: 15, tile: 'corridor', rot: 90, room: 'sub' },
    { gx: 0, gz: 16, tile: 'corridor', rot: 90, room: 'sub' },
    { gx: 0, gz: 17, tile: 'corridor', rot: 90, room: 'sub' },
    // T: open N/S/W (gallery booth west)
    { gx: 0, gz: 18, tile: 'corridor-junction', rot: 90, room: 'gallery_hub' },
    { gx: -1, gz: 18, tile: 'corridor', rot: 0, room: 'gallery_booth' },
    { gx: -2, gz: 18, tile: 'corridor-end', rot: 0, room: 'gallery_booth' },
    { gx: 0, gz: 19, tile: 'corridor', rot: 90, room: 'gallery' },

    { gx: 0, gz: 20, tile: 'corridor', rot: 90, room: 'theater_approach' },
    { gx: 0, gz: 21, tile: 'corridor', rot: 90, room: 'theater_link' },
    { gx: 0, gz: 22, tile: 'room-small', rot: 0, room: 'theater' },
    { gx: 0, gz: 24, tile: 'corridor', rot: 90, room: 'tunnel' },
    { gx: 0, gz: 25, tile: 'corridor-end', rot: 90, room: 'tunnel_exit' },
  ],
  props: [
    // Nurses' station — clinical desk island
    { id: 'nurses_desk', prop: 'desk', x: -8, z: 12, rot: 90 },
    { id: 'nurses_lamp', prop: 'lamp', x: -7.2, z: 11.2 },
    { id: 'nurses_chair', prop: 'chair', x: -8.6, z: 12.8, rot: 200 },
    { id: 'nurses_cabinet', prop: 'cabinet', x: -10.2, z: 10.5, rot: 90 },
    { id: 'nurses_trash', prop: 'trash', x: -6.4, z: 13.4 },
    // Lobby / utility
    { id: 'lobby_cart', prop: 'table', x: 1.1, z: 6.5, scale: 0.85 },
    // UPS closet — small crate pulled west so player can approach (not jammed in end curb)
    { id: 'ups_crate', prop: 'crate', x: 6.35, z: 12, scale: 0.85 },
    { id: 'util_cabinet', prop: 'cabinet', x: 9.1, z: 11.2, rot: 180 },
    // Bay B patient beds
    { id: 'bed_w', prop: 'bed', x: -7.5, z: 28, rot: 90 },
    { id: 'bed_w_cab', prop: 'cabinet', x: -6.2, z: 26.8 },
    { id: 'bed_e', prop: 'bed', x: 7.5, z: 28, rot: 270 },
    { id: 'bed_e_cab', prop: 'cabinet', x: 6.2, z: 26.8 },
    { id: 'bay_trash', prop: 'trash', x: 1.4, z: 24 },
    // Day room
    { id: 'day_table', prop: 'desk', x: 8, z: 36 },
    { id: 'day_chair_a', prop: 'chair', x: 7, z: 35.2, rot: 30 },
    { id: 'day_chair_b', prop: 'chair', x: 9, z: 36.8, rot: 200 },
    { id: 'day_lamp', prop: 'lamp', x: 9.2, z: 34.8 },
    { id: 'day_plant', prop: 'plant', x: 6.2, z: 37.5 },
    // Pharmacy
    { id: 'pharm_shelf', prop: 'shelf', x: 8.5, z: 44.5 },
    { id: 'pharm_lamp', prop: 'lamp', x: 7.2, z: 43.5 },
    { id: 'pharm_sink', prop: 'sink', x: 9.4, z: 42.8, rot: 270 },
    // Lucid side room
    { id: 'lucid_bed', prop: 'bed', x: -7.5, z: 44, rot: 90 },
    // Theater
    { id: 'theater_chair', prop: 'chair', x: 0, z: 88 },
  ],
  lights: [
    { id: 'lobby_strip', kind: 'cool', x: 0, y: 2.6, z: 6, intensity: 0.85, range: 12 },
    { id: 'nurses_warm', kind: 'warm', x: -7.2, y: 1.5, z: 11.2, intensity: 1.15, range: 9 },
    { id: 'util_cool', kind: 'cool', x: 6.4, y: 2.4, z: 12, intensity: 0.75, range: 7 },
    { id: 'bay_strip', kind: 'cool', x: 0, y: 2.6, z: 24, intensity: 0.7, range: 14 },
    { id: 'day_warm', kind: 'warm', x: 9.2, y: 1.5, z: 34.8, intensity: 1.05, range: 10 },
    { id: 'pharm_warm', kind: 'cool', x: 7.2, y: 1.5, z: 43.5, intensity: 0.9, range: 8 },
    { id: 'sub_green', kind: 'green', x: 0, y: 2.2, z: 66, intensity: 0.55, range: 10 },
    { id: 'theater_cool', kind: 'cool', x: 0, y: 2.4, z: 88, intensity: 0.8, range: 12 },
  ],
  spawns: [
    { id: 'player', x: 0, z: 2, yaw: 0 },
    { id: 'anya', x: -8, z: 12, yaw: 90 },
    { id: 'stitcher', x: 0, z: 20, yaw: 180 },
    { id: 'warden', x: 8, z: 36, yaw: 270 },
  ],
  interacts: [
    { id: 'anya_meet', kind: 'anya_meet', x: -7.5, z: 12.5, label: 'Talk to Anya', color: '#6e9b7a' },
    // Slim interact volume + approachable X (west of end curb)
    {
      id: 'ups',
      kind: 'ups',
      x: 6.5,
      z: 12,
      label: 'Hold E — Restore UPS',
      w: 0.35,
      h: 1.1,
      d: 0.35,
      color: '#3a5a48',
    },
    {
      id: 'bay_b_gate',
      kind: 'gate',
      x: 0,
      z: 14,
      label: 'Bay B — locked',
      w: 2.2,
      h: 2.3,
      d: 0.35,
      color: '#1a2220',
      gate: true,
      blocks: true,
    },
    {
      id: 'badge_1',
      kind: 'badge',
      x: -7.2,
      z: 28,
      label: 'Protocol badge (patient)',
      color: '#e6c089',
      requires: 'upsRestored',
    },
    {
      id: 'badge_2',
      kind: 'badge',
      x: 7.2,
      z: 28,
      label: 'Protocol badge (staff)',
      color: '#e6c089',
      requires: 'upsRestored',
    },
    {
      id: 'doc_shift',
      kind: 'doc',
      x: 1.2,
      z: 22,
      label: 'Read float-pool card',
      color: '#889988',
      requires: 'upsRestored',
    },
    {
      id: 'badge_3',
      kind: 'badge',
      x: 7.5,
      z: 44,
      label: 'Protocol badge (visitor)',
      color: '#e6c089',
      requires: 'upsRestored',
    },
    {
      id: 'lantern',
      kind: 'lantern_socket',
      x: 7,
      z: 43.2,
      label: 'Place emergency lantern',
      color: '#e6c089',
      requires: 'upsRestored',
    },
    {
      id: 'lucid',
      kind: 'lucid',
      x: -7.5,
      z: 44,
      label: 'Help lucid patient',
      color: '#7a9bb0',
      requires: 'upsRestored',
    },
    {
      id: 'stair_gate',
      kind: 'door',
      x: 0,
      z: 50,
      label: 'Descend Stairwell A',
      w: 1.8,
      h: 2.1,
      d: 0.35,
      color: '#3a4040',
      blocks: true,
    },
    { id: 'wristband', kind: 'wristband', x: 0.6, z: 88, label: 'Inspect wristband', color: '#a85858' },
    { id: 'exit_tunnel', kind: 'exit_a', x: 0, z: 100, label: 'Service tunnel exit', w: 1.5, h: 2.1, d: 0.3, color: '#6e9b7a' },
  ],
  checkpoints: [
    { id: 'CP-01', x: 0, z: 4 },
    { id: 'CP-02', x: -8, z: 12 },
    { id: 'CP-03', x: 0, z: 22 },
    { id: 'CP-04', x: 0, z: 34 },
    { id: 'CP-05', x: 6, z: 44 },
    { id: 'CP-10', x: 0, z: 86 },
  ],
};

export const TILE_FILE: Record<TileId, string> = {
  corridor: 'corridor.glb',
  'corridor-corner': 'corridor-corner.glb',
  'corridor-junction': 'corridor-junction.glb',
  'corridor-intersection': 'corridor-intersection.glb',
  'corridor-end': 'corridor-end.glb',
  'corridor-wide': 'corridor-wide.glb',
  'room-small': 'room-small.glb',
  'room-large': 'room-large.glb',
  stairs: 'stairs.glb',
  'gate-door': 'gate-door.glb',
};

/** True when a corridor piece on the +Z spine has open ±Z (walls left/right). */
export function isSpineCorridorRot(tile: TileId, rot = 0): boolean {
  if (tile === 'corridor' || tile === 'corridor-wide') return ((rot % 360) + 360) % 360 === 90;
  if (tile === 'corridor-end') {
    const r = ((rot % 360) + 360) % 360;
    return r === 90 || r === 270;
  }
  if (tile === 'corridor-intersection') return true;
  if (tile === 'corridor-junction') {
    const r = ((rot % 360) + 360) % 360;
    return r === 90 || r === 270;
  }
  return true;
}

export const PROP_FILE: Record<PropId, string> = {
  desk: 'models/props/furniture/desk.glb',
  bed: 'models/props/furniture/bedSingle.glb',
  chair: 'models/props/furniture/chair.glb',
  lamp: 'models/props/furniture/lampRoundFloor.glb',
  crate: 'models/props/crate.glb',
  shelf: 'models/props/furniture/bookcaseClosedDoors.glb',
  door: 'models/props/door.glb',
  keycard: 'models/props/key-card.glb',
  cabinet: 'models/props/furniture/cabinetBedDrawer.glb',
  trash: 'models/props/furniture/trashcan.glb',
  table: 'models/props/furniture/table.glb',
  sink: 'models/props/furniture/bathroomSink.glb',
  wallLamp: 'models/props/wall-lamp.glb',
  plant: 'models/props/furniture/plantSmall1.glb',
};

/** Ward signage plates (world meters) — hospital readability over dungeon kit. */
export const WARD_SIGNS: { id: string; text: string; x: number; z: number; rot?: number }[] = [
  { id: 'sign_lobby', text: 'WARD 7 · LOBBY', x: 0, z: 3.2 },
  { id: 'sign_nurses', text: "NURSES' STATION", x: -5.2, z: 12, rot: 90 },
  { id: 'sign_util', text: 'UTILITY · UPS', x: 5.2, z: 12, rot: -90 },
  { id: 'sign_bay', text: 'BAY B · PATIENT ROOMS', x: 0, z: 16 },
  { id: 'sign_day', text: 'DAY ROOM', x: 5.2, z: 36, rot: -90 },
  { id: 'sign_pharm', text: 'PHARMACY', x: 5.2, z: 44, rot: -90 },
  { id: 'sign_stair', text: 'STAIRWELL A', x: 0, z: 49 },
];
