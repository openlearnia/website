import * as THREE from 'three';
import { loadModel } from './assets';
import { applyHorrorLighting, makeRoomLight, type HorrorLighting } from './lighting';
import {
  WARD7_MAP,
  TILE_FILE,
  PROP_FILE,
  CELL,
  DUNGEON_Y,
  WALK_RADIUS,
  cellWorld,
  phaseOrder,
  tilesInPhase,
  propsInPhase,
  lightsInPhase,
  buildWalkable,
  type WardMap,
  type LoadPhase,
  type InteractSpec,
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
};

export type WardLevel = {
  map: WardMap;
  lighting: HorrorLighting;
  interactables: Interactable[];
  checkpoints: Record<string, THREE.Vector3>;
  spawns: Record<string, THREE.Vector3>;
  zones: Record<string, THREE.Vector3>;
  walkable: Set<string>;
  hideNodes: THREE.Vector3[];
  root: THREE.Group;
  setFogAct: (act: number) => void;
  nearestInteractable: (pos: THREE.Vector3, maxDist?: number) => Interactable | null;
  canStand: (x: number, z: number) => boolean;
  dispose: () => void;
};

export type LevelProgress = {
  phase: LoadPhase | 'ready';
  done: number;
  total: number;
  label: string;
};

const DUNGEON_ROOT = 'models/environment/dungeon';

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

/**
 * Build Ward 7 from authored map. Fast Play: await lobby phase, stream the rest.
 */
export async function buildWardLevel(
  scene: THREE.Scene,
  options: {
    map?: WardMap;
    onProgress?: (p: LevelProgress) => void;
    /** If true, resolves after lobby tiles; continues loading in background. */
    fastPlay?: boolean;
  } = {},
): Promise<WardLevel> {
  const map = options.map ?? WARD7_MAP;
  const lighting = applyHorrorLighting(scene);
  const root = new THREE.Group();
  root.name = 'ward7';
  scene.add(root);

  const interactables: Interactable[] = [];
  const walkable = buildWalkable(map);

  // Invisible ground pad for feet
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
    root.add(model);
  };

  const placeProp = async (p: (typeof map.props)[0]) => {
    const path = PROP_FILE[p.prop];
    const model = await loadModel(path, { name: p.id });
    // Sit on walkable floor (y=0). Nudge if GLB dips below origin (beds etc.).
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

  // —— Fast Play: lobby first ——
  await runPhase('lobby');

  const streamRest = async () => {
    for (const phase of phases.slice(1)) {
      await runPhase(phase);
    }
    options.onProgress?.({ phase: 'ready', done: total, total, label: 'Ward 7 ready' });
  };

  if (options.fastPlay !== false) {
    void streamRest();
  } else {
    await streamRest();
  }

  // Interacts (cheap boxes — always available)
  for (const spec of map.interacts) {
    const mesh = makeInteractMesh(spec);
    root.add(mesh);
    interactables.push({
      id: spec.id,
      kind: spec.kind as InteractKind,
      mesh,
      label: spec.label,
      enabled: true,
      once: true,
      data: spec.gate ? { locked: true } : undefined,
    });
  }

  const checkpoints: Record<string, THREE.Vector3> = {};
  for (const c of map.checkpoints) {
    checkpoints[c.id] = new THREE.Vector3(c.x, 0.85, c.z);
  }

  const spawns: Record<string, THREE.Vector3> = {};
  for (const s of map.spawns) {
    spawns[s.id] = new THREE.Vector3(s.x, 0.85, s.z);
  }

  const zones: Record<string, THREE.Vector3> = {
    lobby: new THREE.Vector3(0, 0, 4),
    nurses: new THREE.Vector3(-8, 0, 12),
    ups: new THREE.Vector3(7.5, 0, 12),
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

  const canStand = (x: number, z: number) => {
    const gx = Math.round(x / CELL);
    const gz = Math.round(z / CELL);
    // Rooms get a larger footprint; corridors stay inside wall faces (~±1.4).
    const tryCell = (cx: number, cz: number, radius: number) => {
      if (!walkable.has(`${cx},${cz}`)) return false;
      return Math.hypot(x - cx * CELL, z - cz * CELL) <= radius;
    };
    if (tryCell(gx, gz, WALK_RADIUS)) return true;
    // Soft edge: allow stepping into neighboring walkable cells (junctions / rooms)
    for (const [ox, oz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      // Rooms expand to 3×3 / 5×5 — use wider radius there
      const key = `${gx + ox},${gz + oz}`;
      if (!walkable.has(key)) continue;
      const wide = walkable.has(`${gx + ox + 1},${gz + oz}`) || walkable.has(`${gx + ox},${gz + oz + 1}`);
      if (tryCell(gx + ox, gz + oz, wide ? CELL * 1.2 : WALK_RADIUS)) return true;
    }
    return false;
  };

  return {
    map,
    lighting,
    interactables,
    checkpoints,
    spawns,
    zones,
    walkable,
    hideNodes,
    root,
    setFogAct: (act) => lighting.setFogAct(act),
    nearestInteractable: (pos, maxDist = 2.2) => {
      let best: Interactable | null = null;
      let bestD = maxDist;
      for (const it of interactables) {
        if (!it.enabled || it.consumed) continue;
        const d = pos.distanceTo(it.mesh.position);
        if (d < bestD) {
          bestD = d;
          best = it;
        }
      }
      return best;
    },
    canStand,
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
