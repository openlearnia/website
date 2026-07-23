/**
 * Blender-authored Ward 7 GLB — primary map source (Kenney dungeon is fallback only).
 * Naming: Floor_*, Wall_*, Door_*, Prop_*, Col_*, Spawn_*, Interact_*, Checkpoint_*
 */
import * as THREE from 'three';
import { loadModel } from './assets';
import { PLAYER_RADIUS, type Aabb2, type InteractSpec, type SpawnSpec } from './wardMap';

export const WARD7_GLB = 'maps/ward7.glb';

/** Empty / node name → wardMap interact id */
export const INTERACT_NAME_TO_ID: Record<string, string> = {
  Interact_UPS: 'ups',
  Interact_AnyaMeet: 'anya_meet',
  Interact_BayB_Gate: 'bay_b_gate',
  Interact_Badge1: 'badge_1',
  Interact_Badge2: 'badge_2',
  Interact_Badge3: 'badge_3',
  Interact_Doc: 'doc_shift',
  Interact_Lantern: 'lantern',
  Interact_Lucid: 'lucid',
  Interact_Stair: 'stair_gate',
  Interact_Wristband: 'wristband',
  Interact_Exit: 'exit_tunnel',
};

/** Col_* mesh → toggleable blocker id (gates/doors). Others are static walls. */
export const COL_TO_BLOCKER: Record<string, string> = {
  Col_Door_BayB_Gate: 'bay_b_gate',
  Col_Door_Stair: 'stair_gate',
};

export type BlenderWardParsed = {
  root: THREE.Group;
  walls: Aabb2[];
  blockers: Map<string, Aabb2>;
  spawns: Record<string, THREE.Vector3>;
  checkpoints: Record<string, THREE.Vector3>;
  interactPositions: Record<string, THREE.Vector3>;
};

function worldAabb2(obj: THREE.Object3D): Aabb2 | null {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (!Number.isFinite(box.min.x) || box.isEmpty()) return null;
  // Ignore flat floor-like slabs (collision is walls/props only)
  const h = box.max.y - box.min.y;
  if (h < 0.35) return null;
  return {
    id: obj.name,
    minX: box.min.x,
    maxX: box.max.x,
    minZ: box.min.z,
    maxZ: box.max.z,
  };
}

/**
 * Load ward7.glb, hide Col_* visuals, build AABB walls/blockers from collision meshes.
 */
export async function loadBlenderWard(): Promise<BlenderWardParsed> {
  const root = await loadModel(WARD7_GLB, { name: 'ward7_blender' });
  const walls: Aabb2[] = [];
  const blockers = new Map<string, Aabb2>();
  const spawns: Record<string, THREE.Vector3> = {};
  const checkpoints: Record<string, THREE.Vector3> = {};
  const interactPositions: Record<string, THREE.Vector3> = {};

  root.updateMatrixWorld(true);
  let colCount = 0;
  root.traverse((o) => {
    const name = o.name;
    if (name.startsWith('Col_')) {
      colCount += 1;
      const aabb = worldAabb2(o);
      o.visible = false;
      if (!aabb) return;
      const blockerId = COL_TO_BLOCKER[name];
      if (blockerId) blockers.set(blockerId, { ...aabb, id: blockerId });
      else walls.push(aabb);
      return;
    }
    if (name.startsWith('Spawn_')) {
      const id = name.slice('Spawn_'.length).toLowerCase();
      const p = new THREE.Vector3();
      o.getWorldPosition(p);
      spawns[id] = new THREE.Vector3(p.x, 0.85, p.z);
      o.visible = false;
      return;
    }
    if (name.startsWith('Checkpoint_')) {
      const id = name.slice('Checkpoint_'.length).replace('_', '-');
      // Checkpoint_CP01 → CP-01
      const mapped = id.startsWith('CP') ? `CP-${id.slice(2)}` : id;
      const p = new THREE.Vector3();
      o.getWorldPosition(p);
      checkpoints[mapped] = new THREE.Vector3(p.x, 0.85, p.z);
      o.visible = false;
      return;
    }
    if (name.startsWith('Interact_')) {
      const id = INTERACT_NAME_TO_ID[name];
      if (id) {
        const p = new THREE.Vector3();
        o.getWorldPosition(p);
        interactPositions[id] = new THREE.Vector3(p.x, p.y, p.z);
      }
      o.visible = false;
      return;
    }
    // Clinical mesh shadows + keep underside ceilings readable under hemi-ground (near-black).
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      clinicalCeilingMaterials(mesh);
    }
  });

  // Placeholder cube from assets.ts has no Col_* — force Kenney fallback
  if (colCount < 8 || walls.length < 4) {
    throw new Error(`[horror-ward] ${WARD7_GLB} missing or invalid (cols=${colCount}, walls=${walls.length})`);
  }
  if (!spawns.player) spawns.player = new THREE.Vector3(0, 0.85, 2);

  return { root, walls, blockers, spawns, checkpoints, interactPositions };
}

/** Merge Blender interact positions into authored InteractSpec list. */
export function applyInteractPositions(
  specs: InteractSpec[],
  positions: Record<string, THREE.Vector3>,
): InteractSpec[] {
  return specs.map((s) => {
    const p = positions[s.id];
    if (!p) return s;
    return { ...s, x: p.x, z: p.z };
  });
}

/** Merge Blender spawn empties into SpawnSpec list (for map bookkeeping). */
export function applySpawnPositions(
  specs: SpawnSpec[],
  positions: Record<string, THREE.Vector3>,
): SpawnSpec[] {
  return specs.map((s) => {
    const p = positions[s.id];
    if (!p) return s;
    return { ...s, x: p.x, z: p.z };
  });
}

/**
 * Horror HemisphereLight ground is ~black, so ceiling undersides vanish without emission.
 * Enclosure you can't see isn't enclosure — keep Ceil_* readable against fog/clear.
 */
function clinicalCeilingMaterials(mesh: THREE.Mesh) {
  const n = mesh.name;
  const isCeil = n.startsWith('Ceil_') || n.startsWith('Prop_CeilGroove');
  const isFixture = n.includes('Fixture') && (n.includes('Diff') || n.includes('Edge'));
  const isCove = n.startsWith('Prop_Cove_');
  if (!isCeil && !isFixture && !isCove) return;
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const mat of mats) {
    const std = mat as THREE.MeshStandardMaterial;
    if (!std?.isMeshStandardMaterial) continue;
    std.side = THREE.DoubleSide;
    if (isCeil) {
      // Force a cool clinical wash; glTF often bakes weak emit into a dark color @ intensity 1.
      std.color = new THREE.Color(0xd8e2dc);
      std.emissive = new THREE.Color(0xa8bdb0);
      std.emissiveIntensity = 0.55;
      std.roughness = 0.92;
      std.metalness = 0;
    } else if (isFixture || isCove) {
      std.emissive = new THREE.Color(0x6ee0a0);
      std.emissiveIntensity = Math.max(std.emissiveIntensity ?? 0, 0.85);
    }
  }
}

/** Point-in-solid test using Blender AABBs only (no Kenney walk channel). */
export function canStandBlender(x: number, z: number, walls: Aabb2[], blockers: Aabb2[]): boolean {
  const r = PLAYER_RADIUS;
  for (const b of walls) {
    const nx = Math.max(b.minX, Math.min(x, b.maxX));
    const nz = Math.max(b.minZ, Math.min(z, b.maxZ));
    const dx = x - nx;
    const dz = z - nz;
    if (dx * dx + dz * dz < r * r) return false;
  }
  for (const b of blockers) {
    const nx = Math.max(b.minX, Math.min(x, b.maxX));
    const nz = Math.max(b.minZ, Math.min(z, b.maxZ));
    const dx = x - nx;
    const dz = z - nz;
    if (dx * dx + dz * dz < r * r) return false;
  }
  return true;
}
