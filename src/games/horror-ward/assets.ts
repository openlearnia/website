import {
  Scene,
  SceneLoader,
  AbstractMesh,
  TransformNode,
  Vector3,
  Color3,
  MeshBuilder,
  StandardMaterial,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

export const ASSET_ROOT = '/games/horror-ward/assets';

export type AssetIndexEntry = {
  path: string;
  type: string;
  license?: string;
  source?: string;
  intended_use?: string;
  manifest_id?: string;
  bytes?: number;
};

export type AssetIndex = {
  project: string;
  phase: number;
  root: string;
  notes?: string[];
  assets: AssetIndexEntry[];
};

export type LoadResult = {
  root: TransformNode;
  meshes: AbstractMesh[];
  fromPlaceholder: boolean;
  path: string;
  manifestId?: string;
};

let cachedIndex: AssetIndex | null = null;

export async function loadAssetIndex(): Promise<AssetIndex> {
  if (cachedIndex) return cachedIndex;
  const res = await fetch(`${ASSET_ROOT}/ASSET_INDEX.json`);
  if (!res.ok) throw new Error(`ASSET_INDEX.json HTTP ${res.status}`);
  cachedIndex = (await res.json()) as AssetIndex;
  return cachedIndex;
}

export function findByManifestId(index: AssetIndex, id: string): AssetIndexEntry | undefined {
  return index.assets.find((a) => a.manifest_id === id);
}

export function findGlbByManifestId(index: AssetIndex, id: string): AssetIndexEntry | undefined {
  return index.assets.find(
    (a) => a.manifest_id === id && (a.path.endsWith('.glb') || a.path.endsWith('.gltf')),
  );
}

export function absoluteAssetUrl(relativePath: string): string {
  const clean = relativePath.replace(/^\//, '');
  return `${ASSET_ROOT}/${clean}`;
}

/**
 * Load a GLB/GLTF into the scene. Missing / failed loads get a labelled placeholder mesh.
 * Runtime loads GLB/GLTF only — Kenney FBX under player/kenney-animated/ is source-only
 * (see PIPELINE.md § FBX).
 */
export async function loadModel(
  scene: Scene,
  relativePath: string,
  options: {
    name?: string;
    position?: Vector3;
    scaling?: Vector3 | number;
    rotationY?: number;
    manifestId?: string;
  } = {},
): Promise<LoadResult> {
  const name = options.name ?? relativePath.split('/').pop() ?? 'model';
  const root = new TransformNode(name, scene);
  if (options.position) root.position.copyFrom(options.position);

  const scale =
    typeof options.scaling === 'number'
      ? new Vector3(options.scaling, options.scaling, options.scaling)
      : (options.scaling ?? new Vector3(1, 1, 1));
  root.scaling.copyFrom(scale);
  if (options.rotationY != null) root.rotation.y = options.rotationY;

  // Reject FBX at runtime — document path only
  if (/\.fbx$/i.test(relativePath)) {
    const ph = makePlaceholder(scene, `${name}_fbx_placeholder`, '#884422');
    ph.parent = root;
    return {
      root,
      meshes: [ph],
      fromPlaceholder: true,
      path: relativePath,
      manifestId: options.manifestId,
    };
  }

  const url = absoluteAssetUrl(relativePath);
  const dir = url.slice(0, url.lastIndexOf('/') + 1);
  const file = url.slice(url.lastIndexOf('/') + 1);

  try {
    const result = await SceneLoader.ImportMeshAsync('', dir, file, scene);
    // Keep loader hierarchy intact — only reparent the import root.
    const container = result.meshes[0];
    if (container) container.parent = root;
    for (const t of result.transformNodes) {
      if (!t.parent) t.parent = root;
    }
    const meshes = result.meshes.filter((m) => (m.getTotalVertices?.() ?? 0) > 0);
    return {
      root,
      meshes: meshes.length ? meshes : result.meshes,
      fromPlaceholder: false,
      path: relativePath,
      manifestId: options.manifestId,
    };
  } catch (err) {
    console.warn(`[horror-ward] missing asset → placeholder: ${relativePath}`, err);
    const ph = makePlaceholder(scene, `${name}_missing`, '#334455');
    ph.parent = root;
    return {
      root,
      meshes: [ph],
      fromPlaceholder: true,
      path: relativePath,
      manifestId: options.manifestId,
    };
  }
}

export async function loadByManifestId(
  scene: Scene,
  index: AssetIndex,
  manifestId: string,
  options: Omit<Parameters<typeof loadModel>[2], 'manifestId'> = {},
): Promise<LoadResult> {
  const entry = findGlbByManifestId(index, manifestId);
  if (!entry) {
    const root = new TransformNode(`${manifestId}_empty`, scene);
    if (options.position) root.position.copyFrom(options.position);
    const ph = makePlaceholder(scene, `${manifestId}_slot`, '#553344');
    ph.parent = root;
    return {
      root,
      meshes: [ph],
      fromPlaceholder: true,
      path: `(no GLB for ${manifestId})`,
      manifestId,
    };
  }
  return loadModel(scene, entry.path, { ...options, manifestId });
}

export function makePlaceholder(
  scene: Scene,
  name: string,
  hex = '#445566',
): AbstractMesh {
  const box = MeshBuilder.CreateBox(name, { width: 0.6, height: 1.6, depth: 0.6 }, scene);
  const mat = new StandardMaterial(`${name}_mat`, scene);
  mat.diffuseColor = Color3.FromHexString(hex);
  mat.emissiveColor = Color3.FromHexString(hex).scale(0.15);
  mat.specularColor = Color3.Black();
  box.material = mat;
  box.position.y = 0.8;
  return box;
}

/** Normalize a loaded character so standing height ≈ targetHeight (meters). */
export function normalizeStandingHeight(
  root: TransformNode,
  targetHeight = 1.75,
  floorY = 0,
): number {
  root.computeWorldMatrix(true);
  const meshes = root.getChildMeshes(true);
  if (!meshes.length) return 1;

  let minY = Infinity;
  let maxY = -Infinity;
  for (const m of meshes) {
    m.computeWorldMatrix(true);
    const bb = m.getBoundingInfo().boundingBox;
    minY = Math.min(minY, bb.minimumWorld.y);
    maxY = Math.max(maxY, bb.maximumWorld.y);
  }
  const h = maxY - minY;
  if (!Number.isFinite(h) || h < 0.01) return 1;

  const s = targetHeight / h;
  root.scaling.scaleInPlace(s);
  root.computeWorldMatrix(true);

  minY = Infinity;
  for (const m of root.getChildMeshes(true)) {
    m.computeWorldMatrix(true);
    minY = Math.min(minY, m.getBoundingInfo().boundingBox.minimumWorld.y);
  }
  root.position.y += floorY - minY;
  return s;
}

/** Collect all GLB paths tagged for smoke / ENV kit. */
export function listSmokeEnvPaths(index: AssetIndex): string[] {
  const wanted = [
    'models/environment/dungeon/corridor.glb',
    'models/environment/dungeon/corridor-corner.glb',
    'models/environment/dungeon/corridor-junction.glb',
    'models/environment/dungeon/corridor-end.glb',
    'models/environment/dungeon/room-small.glb',
    'models/environment/dungeon/gate-door.glb',
    'models/environment/dungeon/template-floor.glb',
  ];
  const available = new Set(index.assets.map((a) => a.path));
  return wanted.filter((p) => available.has(p));
}
