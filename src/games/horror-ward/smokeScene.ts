import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  AbstractMesh,
  Mesh,
} from '@babylonjs/core';
import {
  loadAssetIndex,
  loadModel,
  loadByManifestId,
  listSmokeEnvPaths,
  normalizeStandingHeight,
  type AssetIndex,
} from './assets';
import {
  applyHorrorLighting,
  registerShadowCasters,
  registerShadowReceivers,
  type HorrorLighting,
} from './lighting';
import { applyHorrorPost } from './postprocess';
import { createFpsPlayer, type PlayerController } from './player';

export type SmokeSceneHandle = {
  lighting: HorrorLighting;
  player: PlayerController;
  index: AssetIndex;
  dispose: () => void;
};

/** Kenney Modular Dungeon: mesh floor sits at local y=-1 → lift pieces by 1. */
const DUNGEON_Y = 1;

/**
 * Greybox smoke: modular dungeon corridor + enemy proxy + FPS walk + flashlight.
 * Verifies asset loader + lighting + post — not a level.
 */
export async function mountSmokeScene(
  scene: Scene,
  canvas: HTMLCanvasElement,
): Promise<SmokeSceneHandle> {
  scene.collisionsEnabled = true;
  scene.gravity = new Vector3(0, -9.8, 0);

  const lighting = applyHorrorLighting(scene);
  const index = await loadAssetIndex();

  const floor = MeshBuilder.CreateGround('smokeFloor', { width: 48, height: 48 }, scene);
  floor.position.y = 0;
  floor.checkCollisions = true;
  floor.isVisible = false;

  const envMeshes: AbstractMesh[] = [];
  const envPaths = listSmokeEnvPaths(index);

  const corridor = envPaths.find((p) => p.endsWith('corridor.glb'));
  const corner = envPaths.find((p) => p.endsWith('corridor-corner.glb'));
  const junction = envPaths.find((p) => p.endsWith('corridor-junction.glb'));
  const end = envPaths.find((p) => p.endsWith('corridor-end.glb'));
  const door = envPaths.find((p) => p.endsWith('gate-door.glb'));

  // 4m Kenney corridor cells along +Z
  const placements: { path: string; pos: Vector3; rotY?: number }[] = [];
  if (corridor) {
    placements.push({ path: corridor, pos: new Vector3(0, DUNGEON_Y, 0) });
    placements.push({ path: corridor, pos: new Vector3(0, DUNGEON_Y, 4) });
    placements.push({ path: corridor, pos: new Vector3(0, DUNGEON_Y, 8) });
  }
  if (junction) {
    placements.push({ path: junction, pos: new Vector3(0, DUNGEON_Y, 12) });
  }
  if (corridor) {
    placements.push({ path: corridor, pos: new Vector3(4, DUNGEON_Y, 12), rotY: Math.PI / 2 });
    placements.push({ path: corridor, pos: new Vector3(-4, DUNGEON_Y, 12), rotY: -Math.PI / 2 });
  }
  if (corner) {
    placements.push({ path: corner, pos: new Vector3(8, DUNGEON_Y, 12), rotY: Math.PI / 2 });
  }
  if (end) {
    placements.push({ path: end, pos: new Vector3(0, DUNGEON_Y, -4), rotY: Math.PI });
  }
  if (door) {
    placements.push({ path: door, pos: new Vector3(0, DUNGEON_Y, 2) });
  }

  if (placements.length === 0) {
    console.warn('[horror-ward] no dungeon GLBs — procedural greybox');
    addProceduralCorridor(scene, envMeshes);
  }

  for (const p of placements) {
    const loaded = await loadModel(scene, p.path, {
      position: p.pos,
      rotationY: p.rotY,
    });
    for (const m of loaded.meshes) {
      m.checkCollisions = true;
      envMeshes.push(m);
    }
  }

  const enemy = await loadByManifestId(scene, index, 'CHR-STITCHER', {
    name: 'stitcherProxy',
    position: new Vector3(1.2, 0, 9.5),
    rotationY: Math.PI,
  });
  normalizeStandingHeight(enemy.root, 1.8, 0);
  for (const m of enemy.meshes) envMeshes.push(m);

  const lamp = await loadByManifestId(scene, index, 'PROP-FLASHLIGHT', {
    name: 'lampProxy',
    position: new Vector3(-1.4, 0, 1.2),
    scaling: 4,
  });
  for (const m of lamp.meshes) envMeshes.push(m);

  const strip = MeshBuilder.CreateBox('exitStrip', { width: 0.12, height: 0.06, depth: 2.8 }, scene);
  strip.position = new Vector3(-1.85, 0.04, 6);
  const stripMat = new StandardMaterial('exitStripMat', scene);
  stripMat.diffuseColor = Color3.FromHexString('#6e9b7a');
  stripMat.emissiveColor = Color3.FromHexString('#6e9b7a').scale(0.85);
  stripMat.specularColor = Color3.Black();
  strip.material = stripMat;
  lighting.glow.addIncludedOnlyMesh(strip as Mesh);
  envMeshes.push(strip);

  registerShadowReceivers(envMeshes);
  registerShadowCasters(lighting.shadowGen, enemy.meshes.concat(lamp.meshes));

  const player = createFpsPlayer(scene, canvas, {
    spawn: new Vector3(0, 0, -1.5),
    flashlight: lighting.flashlight,
  });
  // Look down the corridor
  player.camera.rotation.y = 0;

  applyHorrorPost(scene, player.camera);

  lighting.fillGreen.position = new Vector3(0, 2.4, 6);
  lighting.warmSafe.position = new Vector3(-1.4, 1.1, 1.2);

  return {
    lighting,
    player,
    index,
    dispose: () => {
      player.dispose();
      floor.dispose();
      strip.dispose();
    },
  };
}

function addProceduralCorridor(scene: Scene, out: AbstractMesh[]): void {
  const wallMat = new StandardMaterial('greyWall', scene);
  wallMat.diffuseColor = new Color3(0.12, 0.14, 0.13);
  wallMat.specularColor = Color3.Black();

  const mkWall = (name: string, w: number, h: number, d: number, pos: Vector3) => {
    const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    m.position = pos;
    m.material = wallMat;
    m.checkCollisions = true;
    out.push(m);
  };

  mkWall('wallL', 0.3, 3, 20, new Vector3(-2.2, 1.5, 6));
  mkWall('wallR', 0.3, 3, 20, new Vector3(2.2, 1.5, 6));
  mkWall('ceil', 4.5, 0.2, 20, new Vector3(0, 3.1, 6));
  mkWall('endWall', 4.5, 3, 0.3, new Vector3(0, 1.5, 16));
}
