import {
  Scene,
  FreeCamera,
  Vector3,
  MeshBuilder,
  Mesh,
  StandardMaterial,
  Color3,
  AbstractMesh,
} from '@babylonjs/core';
import type { FlashlightHandle } from './lighting';

export type PlayerController = {
  camera: FreeCamera;
  body: Mesh;
  dispose: () => void;
};

/**
 * Capsule collider + FPS camera + WASD / mouse look.
 * F toggles flashlight (when handle provided). Pointer lock on click.
 */
export function createFpsPlayer(
  scene: Scene,
  canvas: HTMLCanvasElement,
  options: {
    spawn?: Vector3;
    flashlight?: FlashlightHandle;
    eyeHeight?: number;
  } = {},
): PlayerController {
  const spawn = options.spawn ?? new Vector3(0, 0, 0);
  const eyeHeight = options.eyeHeight ?? 1.55;

  const body = MeshBuilder.CreateCapsule(
    'playerCapsule',
    { height: 1.7, radius: 0.35, tessellation: 8 },
    scene,
  );
  body.position = spawn.clone();
  body.position.y = 0.85;
  body.isPickable = false;
  body.checkCollisions = true;
  body.ellipsoid = new Vector3(0.35, 0.85, 0.35);
  body.ellipsoidOffset = new Vector3(0, 0.85, 0);

  const mat = new StandardMaterial('playerCapsuleMat', scene);
  mat.diffuseColor = new Color3(0.15, 0.2, 0.18);
  mat.alpha = 0.15;
  mat.specularColor = Color3.Black();
  body.material = mat;
  body.visibility = 0.2;

  const camera = new FreeCamera('fpsCam', spawn.add(new Vector3(0, eyeHeight, 0)), scene);
  camera.minZ = 0.05;
  camera.maxZ = 90;
  camera.fov = 1.05;
  camera.inertia = 0.4;
  camera.angularSensibility = 480;
  camera.speed = 0;
  camera.checkCollisions = false;
  camera.applyGravity = false;
  scene.activeCamera = camera;

  // Attach flashlight under an invisible forward node parented to camera
  const flashMount = MeshBuilder.CreateBox('flashMount', { size: 0.05 }, scene);
  flashMount.parent = camera;
  flashMount.position = new Vector3(0.12, -0.08, 0.2);
  flashMount.isVisible = false;
  options.flashlight?.attachTo(flashMount as AbstractMesh);

  const keys: Record<string, boolean> = {};
  const walkSpeed = 3.2;
  const sprintMul = 1.55;

  const onKeyDown = (e: KeyboardEvent) => {
    keys[e.code] = true;
    if (e.code === 'KeyF' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      // Site shell also uses F for fullscreen — only toggle flash when pointer-locked
      if (document.pointerLockElement === canvas) {
        e.preventDefault();
        e.stopPropagation();
        options.flashlight?.toggle();
      }
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
  };

  const requestLock = () => {
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock?.();
    }
    canvas.focus();
  };

  canvas.addEventListener('click', requestLock);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp);

  // Mouse look via pointer lock
  const onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement !== canvas) return;
    const sens = 0.0022;
    camera.rotation.y += e.movementX * sens;
    camera.rotation.x += e.movementY * sens;
    camera.rotation.x = Math.max(-1.2, Math.min(1.2, camera.rotation.x));
  };
  window.addEventListener('mousemove', onMouseMove);

  const gravity = -9.8;
  let vy = 0;
  const groundY = 0.85;

  const observer = scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
    const forward = camera.getDirection(Vector3.Forward());
    forward.y = 0;
    forward.normalize();
    const right = camera.getDirection(Vector3.Right());
    right.y = 0;
    right.normalize();

    let move = Vector3.Zero();
    if (keys['KeyW'] || keys['ArrowUp']) move = move.add(forward);
    if (keys['KeyS'] || keys['ArrowDown']) move = move.subtract(forward);
    if (keys['KeyA'] || keys['ArrowLeft']) move = move.subtract(right);
    if (keys['KeyD'] || keys['ArrowRight']) move = move.add(right);

    const sprint = keys['ShiftLeft'] || keys['ShiftRight'];
    const speed = walkSpeed * (sprint ? sprintMul : 1);

    if (move.lengthSquared() > 0) {
      move.normalize();
      body.moveWithCollisions(move.scale(speed * dt));
    }

    // Simple ground stick (smoke has flat floor)
    vy += gravity * dt;
    body.moveWithCollisions(new Vector3(0, vy * dt, 0));
    if (body.position.y < groundY) {
      body.position.y = groundY;
      vy = 0;
    }

    camera.position.x = body.position.x;
    camera.position.z = body.position.z;
    camera.position.y = body.position.y + (eyeHeight - 0.85);
  });

  return {
    camera,
    body,
    dispose: () => {
      scene.onBeforeRenderObservable.remove(observer);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', requestLock);
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      flashMount.dispose();
      body.dispose();
      camera.dispose();
    },
  };
}
