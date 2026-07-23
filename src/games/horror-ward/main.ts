import { createHorrorEngine } from './engine';
import { mountHorrorGame } from './game';

/**
 * Mount Horror Ward (Three.js + Blender ward7.glb, Kenney fallback) into a host element.
 * Returns dispose().
 */
export function mountHorrorWard(host: HTMLElement): () => void {
  host.style.position = 'relative';
  host.style.background = '#050a08';

  const status = document.createElement('div');
  status.style.cssText = `
    position:absolute;left:12px;bottom:10px;z-index:3;font:12px/1.3 ui-monospace,monospace;
    color:#7a8a82;pointer-events:none;opacity:0.75;
  `;
  status.textContent = 'Loading Ward 7…';

  let disposed = false;
  let gameDispose: (() => void) | undefined;
  const bundle = createHorrorEngine(host);
  host.appendChild(status);

  const boot = (async () => {
    try {
      const game = await mountHorrorGame(
        bundle.scene,
        bundle.camera,
        bundle.canvas,
        host,
        bundle.renderer,
        bundle.clock,
      );
      if (disposed) {
        game.dispose();
        return;
      }
      gameDispose = () => game.dispose();
      status.textContent = 'Ward 7 · Three.js · Esc pause · F light (locked) · shell F fullscreen';
      window.setTimeout(() => {
        status.style.opacity = '0';
      }, 5000);
    } catch (err) {
      console.error(err);
      status.style.opacity = '1';
      status.textContent = `Ward error: ${err instanceof Error ? err.message : String(err)}`;
    }
  })();

  return () => {
    disposed = true;
    void boot;
    gameDispose?.();
    bundle.dispose();
    status.remove();
  };
}
