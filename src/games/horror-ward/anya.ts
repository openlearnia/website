import * as THREE from 'three';
import { loadModel, normalizeStandingHeight } from './assets';

export type AnyaMode = 'follow' | 'wait' | 'hide' | 'lead' | 'distract';

export type AnyaActor = {
  root: THREE.Object3D;
  meshes: THREE.Object3D[];
  embodied: boolean;
  mode: AnyaMode;
  fear: string;
  setEmbodied: (v: boolean) => void;
  setMode: (m: AnyaMode) => void;
  setHideTarget: (p: THREE.Vector3 | null) => void;
  setLeadTarget: (p: THREE.Vector3 | null) => void;
  update: (ctx: {
    playerPos: THREE.Vector3;
    enemyNear: boolean;
    chased: boolean;
    dt: number;
  }) => void;
  dispose: () => void;
};

export async function spawnAnya(scene: THREE.Scene, spawn: THREE.Vector3): Promise<AnyaActor> {
  const root = await loadModel('models/chars/anya-proxy-wizard.glb', { name: 'anya' });
  normalizeStandingHeight(root, 1.7);
  root.position.set(spawn.x, 0, spawn.z);
  root.visible = false;
  scene.add(root);

  let embodied = false;
  let mode: AnyaMode = 'wait';
  let fear = 'steady';
  let hideTarget: THREE.Vector3 | null = null;
  let leadTarget: THREE.Vector3 | null = null;
  let fearAcc = 0;

  return {
    root,
    meshes: [root],
    get embodied() {
      return embodied;
    },
    get mode() {
      return mode;
    },
    get fear() {
      return fear;
    },
    setEmbodied(v) {
      embodied = v;
      root.visible = v;
    },
    setMode(m) {
      mode = m;
    },
    setHideTarget(p) {
      hideTarget = p;
    },
    setLeadTarget(p) {
      leadTarget = p;
    },
    update({ playerPos, enemyNear, chased, dt }) {
      if (!embodied) return;
      fearAcc = THREE.MathUtils.clamp(fearAcc + (enemyNear || chased ? dt * 0.4 : -dt * 0.2), 0, 1);
      fear = fearAcc > 0.7 ? 'terrified' : fearAcc > 0.35 ? 'tense' : 'steady';

      let target: THREE.Vector3 | null = null;
      if (mode === 'follow') target = playerPos.clone().add(new THREE.Vector3(-0.8, 0, -1.2));
      else if (mode === 'hide') target = hideTarget;
      else if (mode === 'lead' || mode === 'distract') target = leadTarget;

      if (target) {
        const to = target.clone().setY(0).sub(root.position.clone().setY(0));
        if (to.length() > 0.5) {
          to.normalize();
          const spd = mode === 'distract' ? 3.2 : 2.6;
          root.position.addScaledVector(to, spd * dt);
          root.lookAt(root.position.x + to.x, root.position.y, root.position.z + to.z);
        }
      }
    },
    dispose() {
      scene.remove(root);
    },
  };
}
