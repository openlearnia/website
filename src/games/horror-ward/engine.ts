import * as THREE from 'three';

export type HorrorEngineBundle = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  clock: THREE.Clock;
  dispose: () => void;
};

/** Three.js WebGL host — horror clear color, resize via shell + window. */
export function createHorrorEngine(host: HTMLElement): HorrorEngineBundle {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;outline:none;touch-action:none;';
  canvas.setAttribute('tabindex', '0');
  host.replaceChildren(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x050a08, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050a08);
  scene.fog = new THREE.FogExp2(0x0a1210, 0.028);

  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 120);
  camera.position.set(0, 1.55, 2);
  scene.add(camera);

  const clock = new THREE.Clock();

  const resize = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  resize();
  window.addEventListener('resize', resize);
  host.addEventListener('game:resize', resize);

  return {
    renderer,
    scene,
    camera,
    canvas,
    clock,
    dispose: () => {
      window.removeEventListener('resize', resize);
      host.removeEventListener('game:resize', resize);
      renderer.dispose();
      canvas.remove();
    },
  };
}
