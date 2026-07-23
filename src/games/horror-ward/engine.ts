import { Engine, Scene, Color4, Vector3, FreeCamera } from '@babylonjs/core';

export type HorrorEngineBundle = {
  engine: Engine;
  scene: Scene;
  canvas: HTMLCanvasElement;
  dispose: () => void;
};

/** Create WebGL engine + empty scene with horror-friendly clear color. */
export function createHorrorEngine(host: HTMLElement): HorrorEngineBundle {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;outline:none;touch-action:none;';
  canvas.setAttribute('tabindex', '0');
  host.replaceChildren(canvas);

  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    adaptToDeviceRatio: true,
    antialias: true,
  });

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.02, 0.035, 0.03, 1);
  scene.autoClear = true;
  scene.skipPointerMovePicking = true;

  // Placeholder camera so the scene is never empty before smoke mounts
  const cam = new FreeCamera('bootCam', new Vector3(0, 1.6, 0), scene);
  cam.minZ = 0.05;
  cam.maxZ = 80;

  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);
  host.addEventListener('game:resize', onResize);

  engine.runRenderLoop(() => {
    if (!scene.activeCamera) return;
    scene.render();
  });

  return {
    engine,
    scene,
    canvas,
    dispose: () => {
      window.removeEventListener('resize', onResize);
      host.removeEventListener('game:resize', onResize);
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
      canvas.remove();
    },
  };
}
