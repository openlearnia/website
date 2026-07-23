import * as THREE from 'three';
import { loadModel, normalizeStandingHeight } from './assets';
import type { AudioDirector } from './audio';
import type { PlayerSense } from './player';

export type EnemyKind = 'stitcher' | 'warden' | 'echo';

export type EnemyActor = {
  kind: EnemyKind;
  root: THREE.Object3D;
  meshes: THREE.Object3D[];
  active: boolean;
  setActive: (v: boolean) => void;
  stun: (sec: number) => void;
  resetToPatrol: () => void;
  getState: () => string;
  update: (ctx: {
    playerPos: THREE.Vector3;
    playerSense: PlayerSense;
    flashDir: THREE.Vector3;
    decoyPos: THREE.Vector3 | null;
    noiseBurst: number;
    dt: number;
  }) => { suspicion: number; grab: boolean };
  dispose: () => void;
};

const PATHS: Record<EnemyKind, string> = {
  stitcher: 'models/chars/stitcher-proxy-demon.glb',
  warden: 'models/enemies/enemy-large.glb',
  echo: 'models/chars/echo-proxy-ghost.glb',
};

export async function spawnEnemy(
  scene: THREE.Scene,
  kind: EnemyKind,
  patrol: THREE.Vector3[],
  options: { audio?: AudioDirector; softOnly?: boolean; onMimic?: () => void } = {},
): Promise<EnemyActor> {
  const root = await loadModel(PATHS[kind], { name: kind });
  normalizeStandingHeight(root, kind === 'warden' ? 2.1 : 1.85);
  const start = patrol[0] ?? new THREE.Vector3();
  root.position.set(start.x, 0, start.z);
  scene.add(root);

  let active = Boolean(kind === 'stitcher' && options.softOnly);
  let state: 'patrol' | 'investigate' | 'chase' | 'stun' = 'patrol';
  let stunT = 0;
  let patrolI = 0;
  let suspicion = 0;
  let mimicAcc = 0;
  let grabAcc = 0;
  const speed = kind === 'warden' ? 2.4 : kind === 'echo' ? 2.8 : 2.1;

  const api: EnemyActor = {
    kind,
    root,
    meshes: [root],
    get active() {
      return active;
    },
    setActive(v) {
      active = v;
      root.visible = v;
    },
    stun(sec) {
      stunT = Math.max(stunT, sec);
      state = 'stun';
    },
    resetToPatrol() {
      state = 'patrol';
      suspicion = 0;
      grabAcc = 0;
      root.position.set(start.x, 0, start.z);
    },
    getState: () => state,
    update({ playerPos, playerSense, flashDir, decoyPos, noiseBurst, dt }) {
      if (!active) return { suspicion: 0, grab: false };
      if (stunT > 0) {
        stunT -= dt;
        if (stunT <= 0) state = 'patrol';
        return { suspicion, grab: false };
      }

      const toPlayer = playerPos.clone().setY(0).sub(root.position.clone().setY(0));
      const dist = toPlayer.length();
      const dir = dist > 0.001 ? toPlayer.normalize() : new THREE.Vector3(0, 0, 1);

      if (kind === 'echo' && playerSense.flashlightOn) {
        const facing = flashDir.dot(dir);
        if (facing > 0.55 && dist < 14) {
          root.position.addScaledVector(dir, -speed * 1.4 * dt);
          suspicion = Math.max(0, suspicion - dt);
          return { suspicion, grab: false };
        }
      }

      const hear =
        playerSense.noise * (14 / Math.max(1, dist)) + noiseBurst * 0.8 + (decoyPos ? 0.6 : 0);
      suspicion = THREE.MathUtils.clamp(suspicion + (hear - 0.35) * dt, 0, 1.5);

      if (kind === 'warden') {
        mimicAcc += dt;
        if (mimicAcc > 9) {
          mimicAcc = 0;
          options.onMimic?.();
        }
      }

      const target = decoyPos ?? (suspicion > 0.55 || state === 'chase' ? playerPos : null);
      if (!target) {
        state = 'patrol';
        const wp = patrol[patrolI % patrol.length];
        const toWp = wp.clone().setY(0).sub(root.position.clone().setY(0));
        if (toWp.length() < 0.6) patrolI += 1;
        else {
          toWp.normalize();
          root.position.addScaledVector(toWp, speed * 0.7 * dt);
          root.lookAt(root.position.x + toWp.x, root.position.y, root.position.z + toWp.z);
        }
      } else {
        state = suspicion > 1.0 || dist < 8 ? 'chase' : 'investigate';
        const toT = target.clone().setY(0).sub(root.position.clone().setY(0));
        if (toT.length() > 0.4) {
          toT.normalize();
          const soft = options.softOnly && state !== 'chase';
          root.position.addScaledVector(toT, speed * (soft ? 0.45 : 1) * dt);
          root.lookAt(root.position.x + toT.x, root.position.y, root.position.z + toT.z);
        }
        if (state === 'chase' && dist < 1.35 && !options.softOnly) grabAcc += dt;
        else grabAcc = Math.max(0, grabAcc - dt);
      }

      if (options.softOnly && dist < 6 && playerSense.flashlightOn) {
        root.position.addScaledVector(dir, -1.2 * dt);
      }

      return { suspicion, grab: grabAcc > 0.55 };
    },
    dispose() {
      scene.remove(root);
    },
  };

  api.setActive(active);
  return api;
}
