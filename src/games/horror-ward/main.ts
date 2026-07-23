import { createHorrorEngine } from './engine';
import { mountSmokeScene } from './smokeScene';

const UI = {
  panelBg: 'rgba(8,12,10,0.92)',
  border: '#2a3a32',
  text: '#c8d4cc',
  muted: '#7a8a82',
  accent: '#6e9b7a',
} as const;

/**
 * Mount Horror Ward Phase-2 pipeline smoke test into a host element.
 * Returns dispose().
 */
export function mountHorrorWard(host: HTMLElement): () => void {
  host.style.position = 'relative';
  host.style.background = '#050a08';

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(ellipse at center,#0a1510 0%,#050a08 70%);
    z-index:2;pointer-events:auto;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    background:${UI.panelBg};border:1px solid ${UI.border};border-radius:12px;
    padding:28px 32px;text-align:center;max-width:min(92%,420px);
    color:${UI.text};font:15px/1.45 system-ui,sans-serif;
  `;

  const eyebrow = document.createElement('div');
  eyebrow.style.cssText = `font-size:0.75rem;letter-spacing:0.14em;text-transform:uppercase;color:${UI.accent};margin-bottom:8px`;
  eyebrow.textContent = 'Horror Ward · Phase 2';

  const title = document.createElement('h2');
  title.style.cssText = 'margin:0 0 8px;font-size:1.45rem;font-weight:650;color:#e8f0ea';
  title.textContent = 'Pipeline smoke';

  const help = document.createElement('p');
  help.style.cssText = `margin:0 0 6px;color:${UI.muted};font-size:0.92rem`;
  help.textContent = 'WASD move · mouse look · Shift sprint · F flashlight (while locked)';

  const hint = document.createElement('p');
  hint.style.cssText = `margin:0 0 18px;color:${UI.muted};font-size:0.85rem`;
  hint.textContent = 'Click canvas to lock pointer. Esc releases.';

  const startBtn = document.createElement('button');
  startBtn.type = 'button';
  startBtn.textContent = 'Enter Ward 7';
  startBtn.style.cssText = `
    min-height:44px;padding:0 28px;border:none;border-radius:10px;cursor:pointer;
    background:${UI.accent};color:#0a1210;font:600 15px/1 inherit;
  `;

  panel.append(eyebrow, title, help, hint, startBtn);
  overlay.appendChild(panel);

  const status = document.createElement('div');
  status.style.cssText = `
    position:absolute;left:12px;bottom:10px;z-index:3;font:12px/1.3 ui-monospace,monospace;
    color:${UI.muted};pointer-events:none;opacity:0.85;
  `;
  status.textContent = 'Loading assets…';

  let disposed = false;
  let smokeDispose: (() => void) | undefined;
  const bundle = createHorrorEngine(host);

  // Keep overlay / status above canvas
  host.appendChild(overlay);
  host.appendChild(status);

  const boot = (async () => {
    try {
      const smoke = await mountSmokeScene(bundle.scene, bundle.canvas);
      if (disposed) {
        smoke.dispose();
        return;
      }
      smokeDispose = () => smoke.dispose();
      const glbCount = smoke.index.assets.filter((a) => a.path.endsWith('.glb')).length;
      status.textContent = `Pipeline OK · ${glbCount} GLBs indexed · flashlight on · shadows ${smoke.lighting.shadowGen ? '512' : 'off'}`;

      // Debug hook for smoke screenshots / Phase 3 tooling
      (window as unknown as { __horrorWard?: unknown }).__horrorWard = {
        scene: bundle.scene,
        player: smoke.player,
        lighting: smoke.lighting,
        lookAt: (x: number, y: number, z: number) => {
          smoke.player.body.position.set(x, Math.max(0.85, y), z);
        },
      };
    } catch (err) {
      console.error(err);
      status.textContent = `Pipeline error: ${err instanceof Error ? err.message : String(err)}`;
      help.textContent = 'Asset load failed — check console.';
      startBtn.disabled = true;
    }
  })();

  startBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    status.style.opacity = '0.7';
    bundle.canvas.requestPointerLock?.();
    bundle.canvas.focus();
  });

  // Auto-hide overlay after assets ready when ?autostart=1 (screenshot / CI)
  if (new URLSearchParams(location.search).has('autostart')) {
    void boot.then(() => {
      if (!disposed) {
        overlay.style.display = 'none';
      }
    });
  }

  return () => {
    disposed = true;
    void boot;
    smokeDispose?.();
    bundle.dispose();
    overlay.remove();
    status.remove();
  };
}
