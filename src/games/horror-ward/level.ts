import * as THREE from 'three';
import { loadModel } from './assets';
import { applyHorrorLighting, makeRoomLight, type HorrorLighting } from './lighting';
import {
  loadBlenderWard,
  applyInteractPositions,
  canStandBlender,
  WARD7_GLB,
} from './blenderWard';
import {
  WARD7_MAP,
  TILE_FILE,
  PROP_FILE,
  CELL,
  DUNGEON_Y,
  WALK_RADIUS,
  PLAYER_RADIUS,
  WARD_SIGNS,
  cellWorld,
  phaseOrder,
  tilesInPhase,
  propsInPhase,
  lightsInPhase,
  buildWalkable,
  buildWallColliders,
  hitsAnyAabb,
  resolveAabbOverlap,
  type WardMap,
  type LoadPhase,
  type InteractSpec,
  type Aabb2,
} from './wardMap';

export type InteractKind =
  | 'door'
  | 'ups'
  | 'badge'
  | 'anya_meet'
  | 'lantern_socket'
  | 'lucid'
  | 'doc'
  | 'wristband'
  | 'exit_a'
  | 'gate';

export type Interactable = {
  id: string;
  kind: InteractKind;
  mesh: THREE.Object3D;
  label: string;
  enabled: boolean;
  once?: boolean;
  consumed?: boolean;
  data?: Record<string, unknown>;
  requires?: InteractSpec['requires'];
};

export type WardLevel = {
  map: WardMap;
  lighting: HorrorLighting;
  interactables: Interactable[];
  checkpoints: Record<string, THREE.Vector3>;
  spawns: Record<string, THREE.Vector3>;
  zones: Record<string, THREE.Vector3>;
  walkable: Set<string>;
  walls: Aabb2[];
  blockers: Map<string, Aabb2>;
  hideNodes: THREE.Vector3[];
  root: THREE.Group;
  /** True when Blender ward7.glb is the visual + collision source. */
  blenderMap: boolean;
  setFogAct: (act: number) => void;
  setBlocker: (id: string, active: boolean) => void;
  nearestInteractable: (pos: THREE.Vector3, maxDist?: number) => Interactable | null;
  canStand: (x: number, z: number) => boolean;
  resolveMove: (x: number, z: number) => { x: number; z: number };
  dispose: () => void;
};

export type LevelProgress = {
  phase: LoadPhase | 'ready';
  done: number;
  total: number;
  label: string;
};

const DUNGEON_ROOT = 'models/environment/dungeon';

/** Cool clinical wash over Kenney dungeon colormap (fallback path only). */
function clinicalSkin(root: THREE.Object3D) {
  const plaster = new THREE.Color(0xd4dde2);
  const linoleum = new THREE.Color(0x7a8884);
  const trim = new THREE.Color(0x5a6a70);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    if (!bb) return;
    const size = new THREE.Vector3();
    bb.getSize(size);
    if (Array.isArray(mesh.material)) mesh.material = mesh.material.map((m) => m.clone());
    else if (mesh.material) mesh.material = mesh.material.clone();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      if (!std?.color) continue;
      if (std.map) {
        std.map = null;
        std.needsUpdate = true;
      }
      if (size.y < 0.45 && (size.x > 1.2 || size.z > 1.2)) {
        std.color.copy(linoleum);
        std.roughness = 0.88;
        std.metalness = 0.02;
      } else if (size.y > 1.0) {
        std.color.copy(plaster);
        std.roughness = 0.72;
        std.metalness = 0.05;
        std.emissive = new THREE.Color(0x1a2228);
        std.emissiveIntensity = 0.04;
      } else {
        std.color.copy(trim);
        std.roughness = 0.65;
        std.metalness = 0.12;
      }
    }
  });
}

function makeInteractMesh(spec: InteractSpec): THREE.Mesh {
  const w = spec.w ?? 0.45;
  const h = spec.h ?? 1.2;
  const d = spec.d ?? 0.45;
  const color = new THREE.Color(spec.color ?? '#556655');
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.85,
    }),
  );
  mesh.position.set(spec.x, h / 2, spec.z);
  mesh.name = spec.id;
  return mesh;
}

function makeSign(text: string, x: number, z: number, rotDeg = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 2.35, z);
  g.rotation.y = (rotDeg * Math.PI) / 180;
  const w = Math.min(3.6, 0.26 * text.length + 0.8);
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.42, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0x163038,
      emissive: 0x3a7088,
      emissiveIntensity: 0.55,
      metalness: 0.25,
      roughness: 0.45,
    }),
  );
  g.add(plate);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#102830';
  ctx.fillRect(0, 0, 512, 64);
  ctx.fillStyle = '#e2f2f8';
  ctx.font = 'bold 30px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.08, 0.34),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }),
  );
  label.position.z = 0.04;
  g.add(label);
  return g;
}

function blockerFromSpec(spec: InteractSpec): Aabb2 {
  const w = (spec.w ?? 2) / 2 + PLAYER_RADIUS * 0.5;
  const d = (spec.d ?? 0.35) / 2 + 0.15;
  return {
    id: spec.id,
    minX: spec.x - w,
    maxX: spec.x + w,
    minZ: spec.z - d,
    maxZ: spec.z + d,
  };
}

function finishLevel(args: {
  scene: THREE.Scene;
  map: WardMap;
  lighting: HorrorLighting;
  root: THREE.Group;
  walls: Aabb2[];
  blockers: Map<string, Aabb2>;
  walkable: Set<string>;
  interactSpecs: InteractSpec[];
  checkpoints: Record<string, THREE.Vector3>;
  spawns: Record<string, THREE.Vector3>;
  blenderMap: boolean;
}): WardLevel {
  const {
    scene,
    map,
    lighting,
    root,
    walls,
    blockers,
    walkable,
    interactSpecs,
    checkpoints,
    spawns,
    blenderMap,
  } = args;

  const interactables: Interactable[] = [];
  for (const sign of WARD_SIGNS) {
    root.add(makeSign(sign.text, sign.x, sign.z, sign.rot ?? 0));
  }

  for (const spec of interactSpecs) {
    const mesh = makeInteractMesh(spec);
    root.add(mesh);
    const gated = Boolean(spec.requires);
    interactables.push({
      id: spec.id,
      kind: spec.kind as InteractKind,
      mesh,
      label: spec.label,
      enabled: !gated,
      once: true,
      data: spec.gate ? { locked: true } : undefined,
      requires: spec.requires,
    });
    if (gated) mesh.visible = false;
    // Blender path: gate AABBs already in blockers from Col_*; Kenney uses blocks flag
    if (!blenderMap && spec.blocks) {
      blockers.set(spec.id, blockerFromSpec(spec));
    } else if (blenderMap && spec.blocks && !blockers.has(spec.id)) {
      blockers.set(spec.id, blockerFromSpec(spec));
    }
  }

  const zones: Record<string, THREE.Vector3> = {
    lobby: new THREE.Vector3(0, 0, 4),
    nurses: new THREE.Vector3(-8, 0, 12),
    ups: new THREE.Vector3(6.4, 0, 12),
    dayroom: new THREE.Vector3(8, 0, 36),
    pharmacy: new THREE.Vector3(8, 0, 44),
    lucid: new THREE.Vector3(-7.5, 0, 44),
    sub: new THREE.Vector3(0, 0, 66),
    theater: new THREE.Vector3(0, 0, 88),
    tunnel: new THREE.Vector3(0, 0, 100),
  };

  const hideNodes = [
    new THREE.Vector3(-1.6, 0, 5),
    new THREE.Vector3(-9.5, 0, 13.5),
    new THREE.Vector3(-7.5, 0, 29),
    new THREE.Vector3(9.5, 0, 37.5),
    new THREE.Vector3(-1.6, 0, 67),
  ];

  const activeBlockers = (): Aabb2[] => [...blockers.values()];

  const inWalkChannel = (x: number, z: number) => {
    const gx = Math.round(x / CELL);
    const gz = Math.round(z / CELL);
    const tryCell = (cx: number, cz: number, radius: number) => {
      if (!walkable.has(`${cx},${cz}`)) return false;
      return Math.hypot(x - cx * CELL, z - cz * CELL) <= radius;
    };
    if (tryCell(gx, gz, WALK_RADIUS + 0.15)) return true;
    for (const [ox, oz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const key = `${gx + ox},${gz + oz}`;
      if (!walkable.has(key)) continue;
      const wide =
        walkable.has(`${gx + ox + 1},${gz + oz}`) || walkable.has(`${gx + ox},${gz + oz + 1}`);
      if (tryCell(gx + ox, gz + oz, wide ? CELL * 1.2 : WALK_RADIUS + 0.15)) return true;
    }
    return false;
  };

  const solidHit = (x: number, z: number) =>
    hitsAnyAabb(x, z, walls, PLAYER_RADIUS) || hitsAnyAabb(x, z, activeBlockers(), PLAYER_RADIUS);

  const canStand = (x: number, z: number) => {
    if (blenderMap) return canStandBlender(x, z, walls, activeBlockers());
    if (!inWalkChannel(x, z)) return false;
    if (solidHit(x, z)) return false;
    return true;
  };

  const resolveMove = (x: number, z: number) => {
    if (canStand(x, z)) return { x, z };
    const solids = [...walls, ...activeBlockers()];
    const pushed = resolveAabbOverlap(x, z, solids, PLAYER_RADIUS);
    if (canStand(pushed.x, pushed.z)) return pushed;
    return { x, z };
  };

  return {
    map,
    lighting,
    interactables,
    checkpoints,
    spawns,
    zones,
    walkable,
    walls,
    blockers,
    hideNodes,
    root,
    blenderMap,
    setFogAct: (act) => lighting.setFogAct(act),
    setBlocker: (id, active) => {
      const it = interactables.find((i) => i.id === id);
      if (!active) {
        blockers.delete(id);
        if (it) {
          it.enabled = false;
          it.consumed = true;
          it.mesh.visible = false;
          if (it.data) it.data.locked = false;
        }
        // Hide matching visual door if present
        root.traverse((o) => {
          if (id === 'bay_b_gate' && o.name === 'Door_BayB_Gate') o.visible = false;
          if (id === 'stair_gate' && o.name === 'Door_Stair') o.visible = false;
        });
      } else if (it) {
        const spec = interactSpecs.find((s) => s.id === id);
        if (spec?.blocks) blockers.set(id, blockerFromSpec(spec));
      }
    },
    nearestInteractable: (pos, maxDist = 2.2) => {
      let best: Interactable | null = null;
      let bestD = maxDist;
      for (const it of interactables) {
        if (!it.enabled || it.consumed) continue;
        const reach = it.kind === 'ups' ? Math.max(maxDist, 2.8) : maxDist;
        const d = pos.distanceTo(it.mesh.position);
        if (d < bestD && d <= reach) {
          bestD = d;
          best = it;
        }
      }
      return best;
    },
    canStand,
    resolveMove,
    dispose: () => {
      lighting.dispose();
      scene.remove(root);
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose();
        }
      });
    },
  };
}

/**
 * Build Ward 7 — Blender ward7.glb primary; Kenney modular dungeon fallback only.
 */
export async function buildWardLevel(
  scene: THREE.Scene,
  options: {
    map?: WardMap;
    onProgress?: (p: LevelProgress) => void;
    /** If true (Kenney fallback), resolves after lobby tiles; continues loading in background. */
    fastPlay?: boolean;
    /** Force Kenney path (debug). */
    forceKenney?: boolean;
  } = {},
): Promise<WardLevel> {
  const map = options.map ?? WARD7_MAP;
  const lighting = applyHorrorLighting(scene);
  const root = new THREE.Group();
  root.name = 'ward7';
  scene.add(root);

  options.onProgress?.({ phase: 'lobby', done: 0, total: 1, label: `Loading ${WARD7_GLB}…` });

  if (!options.forceKenney) {
    try {
      const blender = await loadBlenderWard();
      root.add(blender.root);

      // Clinical fog: pure black exp fog turns distant ceilings into "void" even when meshed.
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.set(0x121a18);
        scene.fog.density = Math.min(scene.fog.density, 0.022);
      }
      scene.background = new THREE.Color(0x0c1412);

      // Room lights from authored map (same meters as Blender empties)
      for (const phase of phaseOrder()) {
        for (const l of lightsInPhase(map, phase)) {
          const pl = makeRoomLight(l);
          root.add(pl);
          lighting.addRoomLight(pl);
        }
      }

      const interactSpecs = applyInteractPositions(map.interacts, blender.interactPositions);
      const checkpoints = { ...blender.checkpoints };
      for (const c of map.checkpoints) {
        if (!checkpoints[c.id]) checkpoints[c.id] = new THREE.Vector3(c.x, 0.85, c.z);
      }
      const spawns = { ...blender.spawns };
      for (const s of map.spawns) {
        if (!spawns[s.id]) spawns[s.id] = new THREE.Vector3(s.x, 0.85, s.z);
      }

      options.onProgress?.({ phase: 'ready', done: 1, total: 1, label: 'Ward 7 (Blender) ready' });

      return finishLevel({
        scene,
        map,
        lighting,
        root,
        walls: blender.walls,
        blockers: blender.blockers,
        walkable: buildWalkable(map),
        interactSpecs,
        checkpoints,
        spawns,
        blenderMap: true,
      });
    } catch (err) {
      console.warn('[horror-ward] Blender map failed → Kenney fallback', err);
    }
  }

  // —— Kenney fallback (modular dungeon kit) ——
  const walkable = buildWalkable(map);
  const walls = buildWallColliders(map);
  const blockers = new Map<string, Aabb2>();

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 140),
    new THREE.MeshStandardMaterial({ color: 0x0a100e, visible: false }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 50);
  floor.receiveShadow = true;
  root.add(floor);

  const placeTile = async (t: (typeof map.tiles)[0]) => {
    if (t.tile === 'gate-door') return;
    const file = TILE_FILE[t.tile];
    const { x, z } = cellWorld(t.gx, t.gz);
    const model = await loadModel(`${DUNGEON_ROOT}/${file}`, {
      name: `${t.room ?? t.tile}_${t.gx}_${t.gz}`,
    });
    model.position.set(x, DUNGEON_Y, z);
    if (t.rot) model.rotation.y = (t.rot * Math.PI) / 180;
    clinicalSkin(model);
    root.add(model);
  };

  const placeProp = async (p: (typeof map.props)[0]) => {
    const path = PROP_FILE[p.prop];
    const model = await loadModel(path, { name: p.id });
    model.position.set(p.x, 0, p.z);
    if (p.rot) model.rotation.y = (p.rot * Math.PI) / 180;
    if (p.scale) model.scale.setScalar(p.scale);
    root.add(model);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    if (Number.isFinite(box.min.y) && box.min.y < -0.01) {
      model.position.y += -box.min.y;
    }
  };

  const placeLights = (phase: LoadPhase) => {
    for (const l of lightsInPhase(map, phase)) {
      const pl = makeRoomLight(l);
      root.add(pl);
      lighting.addRoomLight(pl);
    }
  };

  const phases = phaseOrder();
  let done = 0;
  const total =
    map.tiles.filter((t) => t.tile !== 'gate-door').length + map.props.length + phases.length;

  const runPhase = async (phase: LoadPhase) => {
    options.onProgress?.({ phase, done, total, label: `Loading ${phase}…` });
    placeLights(phase);
    done += 1;
    for (const t of tilesInPhase(map, phase)) {
      await placeTile(t);
      done += 1;
      options.onProgress?.({ phase, done, total, label: `${phase}: ${t.room ?? t.tile}` });
    }
    for (const p of propsInPhase(map, phase)) {
      await placeProp(p);
      done += 1;
      options.onProgress?.({ phase, done, total, label: `${phase}: ${p.id}` });
    }
  };

  await runPhase('lobby');

  const streamRest = async () => {
    for (const phase of phases.slice(1)) {
      await runPhase(phase);
    }
    options.onProgress?.({ phase: 'ready', done: total, total, label: 'Ward 7 ready (Kenney)' });
  };

  if (options.fastPlay !== false) void streamRest();
  else await streamRest();

  const checkpoints: Record<string, THREE.Vector3> = {};
  for (const c of map.checkpoints) checkpoints[c.id] = new THREE.Vector3(c.x, 0.85, c.z);
  const spawns: Record<string, THREE.Vector3> = {};
  for (const s of map.spawns) spawns[s.id] = new THREE.Vector3(s.x, 0.85, s.z);

  return finishLevel({
    scene,
    map,
    lighting,
    root,
    walls,
    blockers,
    walkable,
    interactSpecs: map.interacts,
    checkpoints,
    spawns,
    blenderMap: false,
  });
}
