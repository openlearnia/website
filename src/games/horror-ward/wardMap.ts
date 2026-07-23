/**
 * Ward 7 floor-plan — Kenney Modular Dungeon grid (game-engine tilemap skill).
 *
 * CELL = 4. room-small = 12×12 → center 2 cells off spine.
 * DUNGEON_Y = 1 lifts kit floors (local y=-1) to walkable y≈0.
 *
 * Load phases: lobby (gz≤3) first → bay → mid → deep.
 */

export const CELL = 4;
export const DUNGEON_Y = 1;
export const ASSET_ROOT = '/games/horror-ward/assets';

export type LoadPhase = 'lobby' | 'bay' | 'mid' | 'deep';

export type TileId =
  | 'corridor'
  | 'corridor-corner'
  | 'corridor-junction'
  | 'corridor-end'
  | 'corridor-wide'
  | 'room-small'
  | 'room-large'
  | 'stairs'
  | 'gate-door';

export type PropId = 'desk' | 'bed' | 'chair' | 'lamp' | 'crate' | 'shelf' | 'door' | 'keycard';
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
    { gx: 0, gz: 0, tile: 'corridor-end', rot: 180, room: 'lobby_south' },
    { gx: 0, gz: 1, tile: 'corridor', room: 'lobby' },
    { gx: 0, gz: 2, tile: 'corridor', room: 'lobby' },
    { gx: 0, gz: 3, tile: 'corridor-junction', room: 'nurses_hub' },
    { gx: -2, gz: 3, tile: 'room-small', rot: 90, room: 'nurses_station' },
    { gx: 1, gz: 3, tile: 'corridor', rot: 90, room: 'utility' },
    { gx: 2, gz: 3, tile: 'corridor-end', rot: 90, room: 'utility_ups' },

    { gx: 0, gz: 4, tile: 'corridor', room: 'bay_b_gate' },
    { gx: 0, gz: 5, tile: 'corridor', room: 'bay_b' },
    { gx: 0, gz: 6, tile: 'corridor', room: 'bay_b' },
    { gx: 0, gz: 7, tile: 'corridor-junction', room: 'bay_b_mid' },
    { gx: -1, gz: 7, tile: 'corridor', rot: 270, room: 'patient_alcove_w' },
    { gx: -2, gz: 7, tile: 'corridor-end', rot: 270, room: 'patient_alcove_w' },
    { gx: 1, gz: 7, tile: 'corridor', rot: 90, room: 'patient_alcove_e' },
    { gx: 2, gz: 7, tile: 'corridor-end', rot: 90, room: 'patient_alcove_e' },
    { gx: 0, gz: 8, tile: 'corridor', room: 'bay_b' },

    { gx: 0, gz: 9, tile: 'corridor-junction', room: 'dayroom_hub' },
    { gx: 2, gz: 9, tile: 'room-small', rot: 270, room: 'dayroom' },
    { gx: 0, gz: 10, tile: 'corridor', room: 'hall' },
    { gx: 0, gz: 11, tile: 'corridor-junction', room: 'pharm_hub' },
    { gx: 2, gz: 11, tile: 'room-small', rot: 270, room: 'pharmacy' },
    { gx: -1, gz: 11, tile: 'corridor', rot: 270, room: 'lucid_hall' },
    { gx: -2, gz: 11, tile: 'corridor-end', rot: 270, room: 'lucid_room' },

    { gx: 0, gz: 12, tile: 'corridor', room: 'stair_approach' },
    { gx: 0, gz: 13, tile: 'corridor', room: 'stairwell' },
    { gx: 0, gz: 14, tile: 'corridor', room: 'stair_landing' },

    { gx: 0, gz: 15, tile: 'corridor', room: 'sub' },
    { gx: 0, gz: 16, tile: 'corridor', room: 'sub' },
    { gx: 0, gz: 17, tile: 'corridor', room: 'sub' },
    { gx: 0, gz: 18, tile: 'corridor-junction', room: 'gallery_hub' },
    { gx: -1, gz: 18, tile: 'corridor', rot: 270, room: 'gallery_booth' },
    { gx: -2, gz: 18, tile: 'corridor-end', rot: 270, room: 'gallery_booth' },
    { gx: 0, gz: 19, tile: 'corridor', room: 'gallery' },

    { gx: 0, gz: 20, tile: 'corridor-junction', room: 'theater_approach' },
    { gx: 0, gz: 22, tile: 'room-small', rot: 0, room: 'theater' },
    { gx: 0, gz: 24, tile: 'corridor', room: 'tunnel' },
    { gx: 0, gz: 25, tile: 'corridor-end', rot: 0, room: 'tunnel_exit' },
  ],
  props: [
    { id: 'nurses_desk', prop: 'desk', x: -8, z: 12, rot: 90 },
    { id: 'nurses_lamp', prop: 'lamp', x: -7.2, z: 11.2 },
    { id: 'nurses_chair', prop: 'chair', x: -8.6, z: 12.8, rot: 200 },
    { id: 'lobby_tray', prop: 'crate', x: 1.1, z: 6.5, scale: 0.9 },
    { id: 'ups_crate', prop: 'crate', x: 7.5, z: 12, scale: 1.1 },
    { id: 'bed_w', prop: 'bed', x: -7.5, z: 28, rot: 90 },
    { id: 'bed_e', prop: 'bed', x: 7.5, z: 28, rot: 270 },
    { id: 'day_table', prop: 'desk', x: 8, z: 36 },
    { id: 'day_chair_a', prop: 'chair', x: 7, z: 35.2, rot: 30 },
    { id: 'day_chair_b', prop: 'chair', x: 9, z: 36.8, rot: 200 },
    { id: 'day_lamp', prop: 'lamp', x: 9.2, z: 34.8 },
    { id: 'pharm_shelf', prop: 'shelf', x: 8.5, z: 44.5 },
    { id: 'pharm_lamp', prop: 'lamp', x: 7.2, z: 43.5 },
    { id: 'theater_chair', prop: 'chair', x: 0, z: 88 },
  ],
  lights: [
    { id: 'lobby_strip', kind: 'green', x: 0, y: 2.3, z: 6, intensity: 1.0, range: 12 },
    { id: 'nurses_warm', kind: 'warm', x: -7.2, y: 1.5, z: 11.2, intensity: 1.35, range: 9 },
    { id: 'util_cool', kind: 'cool', x: 7.5, y: 2.2, z: 12, intensity: 0.7, range: 7 },
    { id: 'bay_strip', kind: 'green', x: 0, y: 2.3, z: 24, intensity: 0.9, range: 14 },
    { id: 'day_warm', kind: 'warm', x: 9.2, y: 1.5, z: 34.8, intensity: 1.2, range: 10 },
    { id: 'pharm_warm', kind: 'warm', x: 7.2, y: 1.5, z: 43.5, intensity: 1.0, range: 8 },
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
    { id: 'ups', kind: 'ups', x: 7.8, z: 12, label: 'Hold E — Restore UPS', color: '#3a5a48' },
    { id: 'bay_b_gate', kind: 'gate', x: 0, z: 14, label: 'Bay B — locked', w: 2, h: 2.3, d: 0.25, color: '#1a2220', gate: true },
    { id: 'badge_1', kind: 'badge', x: -7.2, z: 28, label: 'Protocol badge (patient)', color: '#e6c089' },
    { id: 'badge_2', kind: 'badge', x: 7.2, z: 28, label: 'Protocol badge (staff)', color: '#e6c089' },
    { id: 'doc_shift', kind: 'doc', x: 1.2, z: 22, label: 'Read float-pool card', color: '#889988' },
    { id: 'badge_3', kind: 'badge', x: 7.5, z: 44, label: 'Protocol badge (visitor)', color: '#e6c089' },
    { id: 'lantern', kind: 'lantern_socket', x: 7, z: 43.2, label: 'Place emergency lantern', color: '#e6c089' },
    { id: 'lucid', kind: 'lucid', x: -7.5, z: 44, label: 'Help lucid patient', color: '#7a9bb0' },
    { id: 'stair_gate', kind: 'door', x: 0, z: 50, label: 'Descend Stairwell A', w: 1.6, h: 2.1, d: 0.25, color: '#3a4040' },
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
  'corridor-end': 'corridor-end.glb',
  'corridor-wide': 'corridor-wide.glb',
  'room-small': 'room-small.glb',
  'room-large': 'room-large.glb',
  stairs: 'stairs.glb',
  'gate-door': 'gate-door.glb',
};

export const PROP_FILE: Record<PropId, string> = {
  desk: 'models/props/furniture/desk.glb',
  bed: 'models/props/furniture/bedSingle.glb',
  chair: 'models/props/furniture/chair.glb',
  lamp: 'models/props/furniture/lampRoundFloor.glb',
  crate: 'models/props/crate.glb',
  shelf: 'models/props/furniture/bookcaseClosedDoors.glb',
  door: 'models/props/door.glb',
  keycard: 'models/props/key-card.glb',
};
