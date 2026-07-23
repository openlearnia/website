/** Fullscreen helper for Openlearnia game shells. Uses Fullscreen API with CSS fallback. */

type FullscreenCapable = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitEnterFullscreen?: () => void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type DocFullscreen = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenEnabled?: boolean;
};

export type FullscreenHandle = {
  toggle: () => Promise<void>;
  enter: () => Promise<void>;
  exit: () => Promise<void>;
  isActive: () => boolean;
  destroy: () => void;
};

function fsElement(doc: DocFullscreen = document as DocFullscreen): Element | null {
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function apiAvailable(doc: DocFullscreen = document as DocFullscreen): boolean {
  return Boolean(
    doc.fullscreenEnabled ||
      doc.webkitFullscreenEnabled ||
      'webkitRequestFullscreen' in HTMLElement.prototype ||
      'requestFullscreen' in HTMLElement.prototype,
  );
}

async function requestFs(el: FullscreenCapable): Promise<'api' | 'css'> {
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return 'api';
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return 'api';
    }
    if (el.msRequestFullscreen) {
      await el.msRequestFullscreen();
      return 'api';
    }
    // iOS video-style hook (rarely on divs; still try)
    if (typeof el.webkitEnterFullscreen === 'function') {
      el.webkitEnterFullscreen();
      return 'api';
    }
  } catch {
    /* fall through to CSS */
  }
  el.classList.add('is-css-fullscreen');
  document.documentElement.classList.add('game-css-fullscreen-active');
  return 'css';
}

async function exitFs(el: HTMLElement, doc: DocFullscreen = document as DocFullscreen): Promise<void> {
  el.classList.remove('is-css-fullscreen');
  document.documentElement.classList.remove('game-css-fullscreen-active');
  try {
    if (fsElement(doc)) {
      if (doc.exitFullscreen) await doc.exitFullscreen();
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      else if (doc.msExitFullscreen) await doc.msExitFullscreen();
    }
  } catch {
    /* already exited */
  }
}

/**
 * Attach fullscreen controls to a game shell.
 * - `shell` is the element that goes fullscreen (chrome outside stays put).
 * - Button + F key + optional double-click on `clickTarget`.
 */
export function attachFullscreen(options: {
  shell: HTMLElement;
  button: HTMLButtonElement;
  clickTarget?: HTMLElement;
  enableDoubleClick?: boolean;
  onChange?: (active: boolean) => void;
}): FullscreenHandle {
  const { shell, button, clickTarget, enableDoubleClick = true, onChange } = options;
  const doc = document as DocFullscreen;
  let cssActive = false;

  const isActive = () => cssActive || fsElement(doc) === shell || shell.classList.contains('is-css-fullscreen');

  const syncUi = () => {
    const active = isActive();
    button.textContent = active ? 'Exit full' : 'Fullscreen';
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.title = active ? 'Exit fullscreen (Esc or F)' : 'Enter fullscreen (F)';
    shell.dataset.fullscreen = active ? 'true' : 'false';
    onChange?.(active);
    // Give Phaser/Three a tick to reflow
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
      shell.dispatchEvent(new CustomEvent('game:resize', { bubbles: true }));
    });
  };

  const enter = async () => {
    if (isActive()) return;
    const mode = await requestFs(shell as FullscreenCapable);
    cssActive = mode === 'css';
    syncUi();
  };

  const exit = async () => {
    cssActive = false;
    await exitFs(shell, doc);
    syncUi();
  };

  const toggle = async () => {
    if (isActive()) await exit();
    else await enter();
  };

  const onFsChange = () => {
    if (!fsElement(doc)) {
      cssActive = shell.classList.contains('is-css-fullscreen');
    }
    syncUi();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'KeyF' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      void toggle();
    }
    if (e.code === 'Escape' && shell.classList.contains('is-css-fullscreen')) {
      void exit();
    }
  };

  const onDblClick = (e: MouseEvent) => {
    if (!enableDoubleClick) return;
    // Ignore double-clicks on buttons/links inside the shell chrome
    const t = e.target as HTMLElement | null;
    if (t?.closest('button, a, input')) return;
    e.preventDefault();
    void toggle();
  };

  const onBtnClick = () => void toggle();
  button.addEventListener('click', onBtnClick);
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  window.addEventListener('keydown', onKey);
  const dblEl = clickTarget ?? shell;
  if (enableDoubleClick) dblEl.addEventListener('dblclick', onDblClick);

  if (!apiAvailable(doc)) {
    button.title = 'Fullscreen (CSS fallback)';
  }

  syncUi();

  return {
    toggle,
    enter,
    exit,
    isActive,
    destroy: () => {
      button.removeEventListener('click', onBtnClick);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      window.removeEventListener('keydown', onKey);
      dblEl.removeEventListener('dblclick', onDblClick);
      void exit();
    },
  };
}
