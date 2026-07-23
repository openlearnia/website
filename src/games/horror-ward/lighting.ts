import * as THREE from 'three';

export const GLOBAL_LIGHT_STORAGE_KEY = 'horror-ward-global-light';

/** Horror defaults — flashlight does the heavy lifting. */
const HORROR = {
  hemi: 0.22,
  ambient: 0.12,
  fill: 0,
  fogMul: 1,
  roomMul: 1,
} as const;

/**
 * Tasteful debug/casual fill — readable geometry without washing to white.
 * Opponent note: stadium floodlights would kill dread; this stays green-ward tinted.
 */
const GLOBAL = {
  hemi: 1.35,
  ambient: 1.1,
  fill: 0.85,
  fogMul: 0.22,
  roomMul: 2.4,
} as const;

export type FlashlightHandle = {
  light: THREE.SpotLight;
  setEnabled: (on: boolean) => void;
  isEnabled: () => boolean;
  toggle: () => boolean;
  setIntensity: (v: number) => void;
  attachTo: (camera: THREE.Camera) => void;
};

export type HorrorLighting = {
  hemi: THREE.HemisphereLight;
  ambient: THREE.AmbientLight;
  fill: THREE.DirectionalLight;
  flashlight: FlashlightHandle;
  roomLights: THREE.PointLight[];
  addRoomLight: (pl: THREE.PointLight) => void;
  setFogAct: (act: number) => void;
  setGlobalLighting: (on: boolean) => void;
  isGlobalLighting: () => boolean;
  dispose: () => void;
};

const FOG: Record<number, number> = { 1: 0.028, 2: 0.032, 3: 0.042, 4: 0.05 };

export function loadGlobalLightPref(): boolean {
  try {
    return localStorage.getItem(GLOBAL_LIGHT_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveGlobalLightPref(on: boolean): void {
  try {
    localStorage.setItem(GLOBAL_LIGHT_STORAGE_KEY, on ? '1' : '0');
  } catch {
    /* private mode */
  }
}

export function applyHorrorLighting(scene: THREE.Scene): HorrorLighting {
  const hemi = new THREE.HemisphereLight(0x5a7a70, 0x050805, HORROR.hemi);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0x2a3a32, HORROR.ambient);
  scene.add(ambient);

  // Soft key fill for global mode only (intensity 0 while horror).
  const fill = new THREE.DirectionalLight(0xc5dcc8, HORROR.fill);
  fill.position.set(6, 14, 8);
  fill.target.position.set(0, 0, 24);
  scene.add(fill);
  scene.add(fill.target);

  // Second fill from opposite side so corridors aren't one-sided silhouettes.
  const fill2 = new THREE.DirectionalLight(0x8aab9a, 0);
  fill2.position.set(-8, 10, -4);
  fill2.target.position.set(0, 0, 40);
  scene.add(fill2);
  scene.add(fill2.target);

  const flashlight = createFlashlight();
  scene.add(flashlight.light);
  scene.add(flashlight.light.target);

  let globalOn = false;
  let fogAct = 1;
  const roomLights: THREE.PointLight[] = [];

  const applyFog = () => {
    const dens = (FOG[fogAct] ?? FOG[1]) * (globalOn ? GLOBAL.fogMul : HORROR.fogMul);
    if (scene.fog instanceof THREE.FogExp2) scene.fog.density = dens;
  };

  const applyMode = () => {
    const m = globalOn ? GLOBAL : HORROR;
    hemi.intensity = m.hemi;
    ambient.intensity = m.ambient;
    fill.intensity = m.fill;
    fill2.intensity = globalOn ? m.fill * 0.55 : 0;
    for (const pl of roomLights) {
      const base = (pl.userData.baseIntensity as number | undefined) ?? pl.intensity;
      pl.userData.baseIntensity = base;
      pl.intensity = base * m.roomMul;
    }
    applyFog();
  };

  return {
    hemi,
    ambient,
    fill,
    flashlight,
    roomLights,
    addRoomLight: (pl) => {
      pl.userData.baseIntensity = pl.intensity;
      pl.intensity = pl.intensity * (globalOn ? GLOBAL.roomMul : HORROR.roomMul);
      roomLights.push(pl);
    },
    setFogAct: (act: number) => {
      fogAct = act;
      applyFog();
    },
    setGlobalLighting: (on: boolean) => {
      globalOn = on;
      saveGlobalLightPref(on);
      applyMode();
    },
    isGlobalLighting: () => globalOn,
    dispose: () => {
      scene.remove(hemi);
      scene.remove(ambient);
      scene.remove(fill);
      scene.remove(fill.target);
      scene.remove(fill2);
      scene.remove(fill2.target);
      scene.remove(flashlight.light);
      scene.remove(flashlight.light.target);
      hemi.dispose();
      ambient.dispose();
      fill.dispose();
      fill2.dispose();
      flashlight.light.dispose();
    },
  };
}

export function createFlashlight(): FlashlightHandle {
  const light = new THREE.SpotLight(0xfff2d9, 0, 18, Math.PI / 5.5, 0.45, 1.2);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  light.shadow.bias = -0.0005;
  // ponytail: 512 flashlight shadow — upgrade: quality preset → 1024

  let enabled = true;
  light.intensity = 3.4;

  return {
    light,
    setEnabled: (on) => {
      enabled = on;
      light.intensity = on ? 3.4 : 0;
    },
    isEnabled: () => enabled,
    toggle: () => {
      enabled = !enabled;
      light.intensity = enabled ? 3.4 : 0;
      return enabled;
    },
    setIntensity: (v) => {
      if (enabled) light.intensity = v;
    },
    attachTo: (camera) => {
      camera.add(light);
      light.position.set(0.12, -0.08, -0.15);
      light.target.position.set(0, -0.05, -4);
      camera.add(light.target);
    },
  };
}

const KIND_COLOR: Record<string, number> = {
  warm: 0xe6c089,
  green: 0x6e9b7a,
  cool: 0x7a9bb0,
};

export function makeRoomLight(spec: {
  kind: string;
  x: number;
  y?: number;
  z: number;
  intensity?: number;
  range?: number;
}): THREE.PointLight {
  const pl = new THREE.PointLight(
    KIND_COLOR[spec.kind] ?? 0x889988,
    spec.intensity ?? 1,
    spec.range ?? 10,
    1.5,
  );
  pl.position.set(spec.x, spec.y ?? 2.2, spec.z);
  return pl;
}
