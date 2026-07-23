import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import type { FlashlightHandle } from './lighting';

export type PlayerSense = {
  position: THREE.Vector3;
  forward: THREE.Vector3;
  noise: number;
  crouched: boolean;
  sprinting: boolean;
  moving: boolean;
  flashlightOn: boolean;
};

export type PlayerController = {
  camera: THREE.PerspectiveCamera;
  body: THREE.Object3D;
  controls: PointerLockControls;
  sense: () => PlayerSense;
  setEnabled: (v: boolean) => void;
  getBattery: () => number;
  setBattery: (v: number) => void;
  getStamina: () => number;
  pulseStun: () => boolean;
  dropDecoy: () => THREE.Vector3 | null;
  onInteractKey: (cb: () => void) => void;
  onAllyCommand: (cb: (slot: 1 | 2 | 3 | 4) => void) => void;
  onStunKey: (cb: () => void) => void;
  struggleTap: () => void;
  consumeStruggle: () => number;
  teleport: (pos: THREE.Vector3) => void;
  update: (dt: number, canStand: (x: number, z: number) => boolean) => void;
  dispose: () => void;
};

/**
 * Capsule-style FPS via PointerLockControls + walkable grid.
 */
export function createFpsPlayer(
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement,
  options: {
    spawn?: THREE.Vector3;
    flashlight?: FlashlightHandle;
    onFootstep?: (loud: boolean) => void;
  } = {},
): PlayerController {
  const spawn = options.spawn ?? new THREE.Vector3(0, 0.85, 2);
  const eyeStand = 1.55;
  const eyeCrouch = 1.05;
  let battery = 100;
  let stamina = 100;
  let enabled = true;
  let footAcc = 0;
  let decoys = 1;
  let struggle = 0;
  let crouched = false;
  let interactCb: (() => void) | null = null;
  let allyCb: ((slot: 1 | 2 | 3 | 4) => void) | null = null;
  let stunCb: (() => void) | null = null;

  const body = new THREE.Object3D();
  body.position.copy(spawn);
  body.position.y = 0.85;

  camera.position.set(spawn.x, eyeStand, spawn.z);
  const controls = new PointerLockControls(camera, canvas);

  options.flashlight?.attachTo(camera);

  const keys: Record<string, boolean> = {};
  const onKeyDown = (e: KeyboardEvent) => {
    keys[e.code] = true;
    if (!enabled) return;
    if (e.code === 'KeyE') interactCb?.();
    if (e.code === 'Digit1') allyCb?.(1);
    if (e.code === 'Digit2') allyCb?.(2);
    if (e.code === 'Digit3') allyCb?.(3);
    if (e.code === 'Digit4') allyCb?.(4);
    if (e.code === 'KeyG') {
      /* decoy via dropDecoy caller */
    }
    if (e.code === 'Space') struggle += 1;
    // Flashlight: only when pointer locked (shell F = fullscreen)
    if (e.code === 'KeyF' && document.pointerLockElement === canvas) {
      e.preventDefault();
      e.stopPropagation();
      options.flashlight?.toggle();
    }
    if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'KeyC') {
      crouched = true;
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
    if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'KeyC') {
      crouched = false;
    }
  };
  const onMouseDown = (e: MouseEvent) => {
    if (!enabled) return;
    if (e.button === 0 && document.pointerLockElement === canvas) stunCb?.();
    if (e.button === 0) struggle += 1;
  };

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('click', () => {
    if (enabled) controls.lock();
  });

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const wish = new THREE.Vector3();
  const pos = new THREE.Vector3();

  const update = (dt: number, canStand: (x: number, z: number) => boolean) => {
    if (!enabled) return;

    const sprinting = keys['ShiftLeft'] || keys['ShiftRight'];
    const moving =
      keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'] || keys['ArrowUp'] || keys['ArrowDown'];

    if (sprinting && moving && stamina > 0 && !crouched) {
      stamina = Math.max(0, stamina - 18 * dt);
    } else {
      stamina = Math.min(100, stamina + 12 * dt);
    }

    const speed = crouched ? 1.6 : sprinting && stamina > 0 ? 5.2 : 3.1;
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    wish.set(0, 0, 0);
    if (keys['KeyW'] || keys['ArrowUp']) wish.add(forward);
    if (keys['KeyS'] || keys['ArrowDown']) wish.sub(forward);
    if (keys['KeyD'] || keys['ArrowRight']) wish.add(right);
    if (keys['KeyA'] || keys['ArrowLeft']) wish.sub(right);
    if (wish.lengthSq() > 0) {
      wish.normalize().multiplyScalar(speed * dt);
      const nx = camera.position.x + wish.x;
      const nz = camera.position.z + wish.z;
      if (canStand(nx, camera.position.z)) camera.position.x = nx;
      if (canStand(camera.position.x, nz)) camera.position.z = nz;

      footAcc += speed * dt;
      if (footAcc > (crouched ? 1.4 : 1.0)) {
        footAcc = 0;
        options.onFootstep?.(sprinting && !crouched);
      }
    }

    const eye = crouched ? eyeCrouch : eyeStand;
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, eye, 1 - Math.pow(0.001, dt));
    body.position.set(camera.position.x, 0.85, camera.position.z);

    if (options.flashlight?.isEnabled()) {
      battery = Math.max(0, battery - 2.2 * dt);
      if (battery <= 0) options.flashlight.setEnabled(false);
      else options.flashlight.setIntensity(2.2 + (battery / 100) * 1.4);
    }
  };

  return {
    camera,
    body,
    controls,
    sense: () => {
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      pos.copy(camera.position);
      const moving =
        keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'];
      const sprinting = (keys['ShiftLeft'] || keys['ShiftRight']) && stamina > 0;
      let noise = 0;
      if (moving) noise = crouched ? 0.25 : sprinting ? 1 : 0.55;
      return {
        position: pos.clone(),
        forward: forward.clone(),
        noise,
        crouched,
        sprinting: Boolean(sprinting && moving),
        moving: Boolean(moving),
        flashlightOn: options.flashlight?.isEnabled() ?? false,
      };
    },
    setEnabled: (v) => {
      enabled = v;
      if (!v && document.pointerLockElement) document.exitPointerLock();
    },
    getBattery: () => battery,
    setBattery: (v) => {
      battery = Math.max(0, Math.min(100, v));
    },
    getStamina: () => stamina,
    pulseStun: () => {
      if (battery < 12) return false;
      battery -= 12;
      return true;
    },
    dropDecoy: () => {
      if (decoys <= 0) return null;
      decoys -= 1;
      return camera.position.clone().add(forward.clone().multiplyScalar(2));
    },
    onInteractKey: (cb) => {
      interactCb = cb;
    },
    onAllyCommand: (cb) => {
      allyCb = cb;
    },
    onStunKey: (cb) => {
      stunCb = cb;
    },
    struggleTap: () => {
      struggle += 1;
    },
    consumeStruggle: () => {
      const n = struggle;
      struggle = 0;
      return n;
    },
    teleport: (p) => {
      camera.position.set(p.x, eyeStand, p.z);
      body.position.set(p.x, 0.85, p.z);
    },
    update,
    dispose: () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      controls.dispose();
    },
  };
}
