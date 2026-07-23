import {
  Scene,
  Color3,
  Color4,
  Vector3,
  HemisphericLight,
  PointLight,
  SpotLight,
  ShadowGenerator,
  AbstractMesh,
  GlowLayer,
} from '@babylonjs/core';

export type FlashlightHandle = {
  light: SpotLight;
  setEnabled: (on: boolean) => void;
  isEnabled: () => boolean;
  toggle: () => boolean;
  setIntensity: (v: number) => void;
  attachTo: (parent: AbstractMesh) => void;
};

export type HorrorLighting = {
  hemi: HemisphericLight;
  fillGreen: PointLight;
  warmSafe: PointLight;
  flashlight: FlashlightHandle;
  shadowGen: ShadowGenerator | null;
  glow: GlowLayer;
};

const FOG_ACT_I = 0.015;

/**
 * Low-key clinical horror defaults from DESIGN.md §11.
 * Shadows: flashlight-only 512 map — enough depth cue without melting iGPUs.
 * (Full directional cascades deferred; Phase 3 can raise map size per quality preset.)
 */
export function applyHorrorLighting(scene: Scene): HorrorLighting {
  scene.clearColor = new Color4(0.025, 0.04, 0.035, 1);
  scene.ambientColor = new Color3(0.02, 0.03, 0.025);

  scene.fogMode = Scene.FOGMODE_EXP;
  scene.fogColor = new Color3(0.039, 0.071, 0.063); // #0a1210
  scene.fogDensity = FOG_ACT_I;

  const hemi = new HemisphericLight('hemiFill', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.12;
  hemi.diffuse = new Color3(0.35, 0.45, 0.42);
  hemi.groundColor = new Color3(0.02, 0.03, 0.025);
  hemi.specular = Color3.Black();

  // Cold green emergency strip proxy
  const fillGreen = new PointLight('emergencyStrip', new Vector3(0, 2.4, 4), scene);
  fillGreen.diffuse = Color3.FromHexString('#6e9b7a');
  fillGreen.specular = new Color3(0.1, 0.15, 0.12);
  fillGreen.intensity = 0.85;
  fillGreen.range = 16;

  // Warm safe-island lamp
  const warmSafe = new PointLight('warmSafe', new Vector3(-3.5, 1.4, -1), scene);
  warmSafe.diffuse = Color3.FromHexString('#e6c089');
  warmSafe.specular = new Color3(0.2, 0.15, 0.08);
  warmSafe.intensity = 1.1;
  warmSafe.range = 9;

  const flashlight = createFlashlight(scene);

  let shadowGen: ShadowGenerator | null = null;
  try {
    shadowGen = new ShadowGenerator(512, flashlight.light);
    shadowGen.useBlurExponentialShadowMap = true;
    shadowGen.blurKernel = 8;
    shadowGen.darkness = 0.55;
    shadowGen.bias = 0.0005;
    // ponytail: single 512 flashlight shadow — upgrade path: quality preset → 1024 + cascade
  } catch {
    shadowGen = null;
  }

  const glow = new GlowLayer('emergencyGlow', scene, { blurKernelSize: 16 });
  glow.intensity = 0.35;

  return { hemi, fillGreen, warmSafe, flashlight, shadowGen, glow };
}

export function createFlashlight(scene: Scene): FlashlightHandle {
  const light = new SpotLight(
    'playerFlashlight',
    new Vector3(0, 1.5, 0),
    new Vector3(0, 0, 1),
    Math.PI / 5.5,
    2.2,
    scene,
  );
  light.diffuse = new Color3(1, 0.95, 0.85);
  light.specular = new Color3(0.4, 0.35, 0.25);
  light.intensity = 2.4;
  light.range = 18;
  light.angle = Math.PI / 5.5;

  let enabled = true;
  light.setEnabled(true);

  return {
    light,
    setEnabled: (on: boolean) => {
      enabled = on;
      light.setEnabled(on);
    },
    isEnabled: () => enabled,
    toggle: () => {
      enabled = !enabled;
      light.setEnabled(enabled);
      return enabled;
    },
    setIntensity: (v: number) => {
      light.intensity = v;
    },
    attachTo: (parent: AbstractMesh) => {
      light.parent = parent;
      light.position = new Vector3(0.15, 0.05, 0.25);
      light.direction = new Vector3(0, -0.05, 1);
    },
  };
}

export function registerShadowCasters(
  shadowGen: ShadowGenerator | null,
  meshes: AbstractMesh[],
): void {
  if (!shadowGen) return;
  for (const m of meshes) {
    shadowGen.addShadowCaster(m, true);
  }
}

export function registerShadowReceivers(meshes: AbstractMesh[]): void {
  for (const m of meshes) {
    m.receiveShadows = true;
  }
}
