import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ASSET_ROOT } from './wardMap';

const loader = new GLTFLoader();
const cache = new Map<string, THREE.Group>();

export type ProgressCb = (done: number, total: number, label: string) => void;

export function assetUrl(relativePath: string): string {
  return `${ASSET_ROOT}/${relativePath.replace(/^\//, '')}`;
}

function placeholder(name: string, color = 0x445566): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 1.6, 0.6),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.12 }),
  );
  mesh.position.y = 0.8;
  g.add(mesh);
  return g;
}

/** Load GLB once; returns a cloned group for placement. */
export async function loadModel(
  relativePath: string,
  options: { name?: string; onProgress?: ProgressCb } = {},
): Promise<THREE.Group> {
  if (/\.fbx$/i.test(relativePath)) {
    return placeholder(options.name ?? 'fbx', 0x884422);
  }

  let template = cache.get(relativePath);
  if (!template) {
    const url = assetUrl(relativePath);
    try {
      const gltf = await loader.loadAsync(url);
      template = gltf.scene;
      template.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
          // Kenney dungeon uses vertex colors / single colormap — keep as-is
        }
      });
      cache.set(relativePath, template);
    } catch (err) {
      console.warn(`[horror-ward] missing → placeholder: ${relativePath}`, err);
      return placeholder(options.name ?? relativePath, 0x334455);
    }
  }

  const clone = template.clone(true);
  if (options.name) clone.name = options.name;
  return clone;
}

export function normalizeStandingHeight(root: THREE.Object3D, targetHeight = 1.75, floorY = 0): void {
  const box = new THREE.Box3().setFromObject(root);
  const h = box.max.y - box.min.y;
  if (!Number.isFinite(h) || h < 0.01) return;
  const s = targetHeight / h;
  root.scale.multiplyScalar(s);
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y += floorY - box2.min.y;
}

export function clearModelCache(): void {
  cache.clear();
}
