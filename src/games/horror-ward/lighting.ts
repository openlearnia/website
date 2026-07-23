import * as THREE from 'three';

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
  flashlight: FlashlightHandle;
  roomLights: THREE.PointLight[];
  setFogAct: (act: number) => void;
};

const FOG: Record<number, number> = { 1: 0.028, 2: 0.032, 3: 0.042, 4: 0.05 };

export function applyHorrorLighting(scene: THREE.Scene): HorrorLighting {
  const hemi = new THREE.HemisphereLight(0x5a7a70, 0x050805, 0.22);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0x1a2a24, 0.12);
  scene.add(ambient);

  const flashlight = createFlashlight();
  scene.add(flashlight.light);
  scene.add(flashlight.light.target);

  return {
    hemi,
    ambient,
    flashlight,
    roomLights: [],
    setFogAct: (act: number) => {
      const dens = FOG[act] ?? FOG[1];
      if (scene.fog instanceof THREE.FogExp2) scene.fog.density = dens;
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
