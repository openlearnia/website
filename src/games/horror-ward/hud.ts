import type { EndingId, GameState } from './state';
import { trustLabel } from './state';

const UI = {
  panelBg: 'rgba(8,12,10,0.94)',
  border: '#2a3a32',
  text: '#c8d4cc',
  muted: '#7a8a82',
  accent: '#6e9b7a',
  warm: '#e6c089',
  danger: '#a85858',
} as const;

export type DialogueChoice = {
  id: string;
  label: string;
};

export type HudApi = {
  root: HTMLElement;
  showTitle: (onStart: () => void) => void;
  hideTitle: () => void;
  setObjective: (text: string, flash?: boolean) => void;
  setSubtitle: (text: string, ms?: number) => void;
  setPrompt: (text: string | null) => void;
  setBattery: (v: number) => void;
  setStamina: (v: number, show: boolean) => void;
  setAlly: (mode: string, fear: string) => void;
  setPaused: (on: boolean, onResume: () => void, onRestart: () => void) => void;
  showDialogue: (
    speaker: string,
    lines: string[],
    choices?: DialogueChoice[],
    onChoice?: (id: string) => void,
  ) => void;
  hideDialogue: () => void;
  showEnding: (ending: EndingId, state: GameState, onHub: () => void, onRestart: () => void) => void;
  showDeath: (onContinue: () => void) => void;
  setGrab: (active: boolean, progress: number) => void;
  flashVignette: (amount: number) => void;
  dispose: () => void;
};

export function createHud(host: HTMLElement): HudApi {
  const root = document.createElement('div');
  root.className = 'hw-hud';
  root.style.cssText = `
    position:absolute;inset:0;z-index:5;pointer-events:none;
    font:15px/1.45 "IBM Plex Sans",system-ui,sans-serif;color:${UI.text};
  `;

  const objective = el('div', `
    position:absolute;left:16px;bottom:18px;max-width:min(70%,420px);
    opacity:0.9;transition:opacity .4s;text-shadow:0 1px 8px #000;
  `);
  const subtitle = el('div', `
    position:absolute;left:50%;bottom:72px;transform:translateX(-50%);
    max-width:min(88%,520px);text-align:center;color:${UI.warm};
    text-shadow:0 2px 12px #000;opacity:0;transition:opacity .3s;
  `);
  const prompt = el('div', `
    position:absolute;left:50%;top:58%;transform:translate(-50%,-50%);
    padding:6px 14px;border:1px solid ${UI.border};background:rgba(0,0,0,.45);
    border-radius:6px;font-size:0.9rem;opacity:0;transition:opacity .15s;
  `);
  const battery = el('div', `
    position:absolute;right:16px;bottom:18px;width:88px;height:6px;
    background:#1a221c;border:1px solid ${UI.border};border-radius:3px;overflow:hidden;
  `);
  const batteryFill = el('div', `height:100%;width:100%;background:${UI.accent};transition:width .2s,background .3s`);
  battery.appendChild(batteryFill);
  const batteryLabel = el('div', `
    position:absolute;right:16px;bottom:28px;font-size:0.7rem;letter-spacing:.08em;
    text-transform:uppercase;color:${UI.muted};
  `);
  batteryLabel.textContent = 'Battery';

  const stamina = el('div', `
    position:absolute;left:50%;bottom:14px;transform:translateX(-50%);
    width:140px;height:4px;background:#1a221c;border-radius:2px;opacity:0;
    transition:opacity .2s;overflow:hidden;
  `);
  const staminaFill = el('div', `height:100%;width:100%;background:${UI.warm}`);
  stamina.appendChild(staminaFill);

  const ally = el('div', `
    position:absolute;left:16px;top:14px;font-size:0.78rem;color:${UI.muted};
    letter-spacing:.04em;
  `);

  const vignette = el('div', `
    position:absolute;inset:0;pointer-events:none;
    background:radial-gradient(ellipse at center,transparent 40%,rgba(80,10,10,0) 100%);
    opacity:0;transition:opacity .15s;
  `);

  const grab = el('div', `
    position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);
    text-align:center;opacity:0;pointer-events:none;
  `);
  const grabTitle = el('div', `color:${UI.danger};font-weight:600;margin-bottom:8px`);
  grabTitle.textContent = 'STRUGGLE';
  const grabBar = el('div', `width:160px;height:8px;background:#1a1515;border:1px solid ${UI.danger};border-radius:4px;overflow:hidden;margin:0 auto`);
  const grabFill = el('div', `height:100%;width:0%;background:${UI.danger}`);
  grabBar.appendChild(grabFill);
  const grabHint = el('div', `font-size:0.8rem;color:${UI.muted};margin-top:6px`);
  grabHint.textContent = 'Mash Space / Click';
  grab.append(grabTitle, grabBar, grabHint);

  const modalHost = el('div', `position:absolute;inset:0;display:none;align-items:center;justify-content:center;pointer-events:auto;background:rgba(2,6,4,.72)`);

  root.append(vignette, objective, subtitle, prompt, battery, batteryLabel, stamina, ally, grab, modalHost);
  host.appendChild(root);

  let subtitleTimer = 0;
  let objectiveFlashTimer = 0;

  const makePanel = (): HTMLElement => {
    const p = el('div', `
      background:${UI.panelBg};border:1px solid ${UI.border};border-radius:12px;
      padding:26px 28px;max-width:min(92%,440px);text-align:center;color:${UI.text};
    `);
    return p;
  };

  const mkBtn = (label: string, primary: boolean): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.style.cssText = primary
      ? `min-height:42px;padding:0 22px;margin:6px;border:none;border-radius:9px;cursor:pointer;background:${UI.accent};color:#0a1210;font:600 14px/1 inherit;`
      : `min-height:42px;padding:0 18px;margin:6px;border:1px solid ${UI.border};border-radius:9px;cursor:pointer;background:transparent;color:${UI.text};font:500 14px/1 inherit;`;
    return b;
  };

  const clearModal = () => {
    modalHost.style.display = 'none';
    while (modalHost.firstChild) modalHost.removeChild(modalHost.firstChild);
  };

  const showModal = (panel: HTMLElement) => {
    while (modalHost.firstChild) modalHost.removeChild(modalHost.firstChild);
    modalHost.appendChild(panel);
    modalHost.style.display = 'flex';
  };

  return {
    root,
    showTitle(onStart) {
      const p = makePanel();
      const eyebrow = el('div', `font-size:0.72rem;letter-spacing:.16em;text-transform:uppercase;color:${UI.accent};margin-bottom:8px`);
      eyebrow.textContent = 'Ashford Memorial · Ward 7';
      const title = el('h2', `margin:0 0 10px;font-size:1.55rem;font-weight:650;color:#e8f0ea`);
      title.textContent = 'Horror Ward';
      const tag = el('p', `margin:0 0 8px;color:${UI.muted};font-size:0.92rem`);
      tag.textContent = 'The night shift is a story someone wrote on your badge.';
      const help = el('p', `margin:0 0 18px;color:${UI.muted};font-size:0.82rem`);
      help.textContent = 'WASD · mouse · Shift sprint · Ctrl crouch · F light · E interact · 1–4 Anya · Esc pause';
      const start = mkBtn('Enter Ward 7', true);
      start.addEventListener('click', () => onStart());
      p.append(eyebrow, title, tag, help, start);
      showModal(p);
    },
    hideTitle: clearModal,
    setObjective(text, flash = true) {
      objective.textContent = text;
      if (flash) {
        objective.style.opacity = '1';
        window.clearTimeout(objectiveFlashTimer);
        objectiveFlashTimer = window.setTimeout(() => {
          objective.style.opacity = '0.55';
        }, 4000);
      }
    },
    setSubtitle(text, ms = 4200) {
      subtitle.textContent = text;
      subtitle.style.opacity = '1';
      window.clearTimeout(subtitleTimer);
      subtitleTimer = window.setTimeout(() => {
        subtitle.style.opacity = '0';
      }, ms);
    },
    setPrompt(text) {
      if (!text) {
        prompt.style.opacity = '0';
        prompt.textContent = '';
        return;
      }
      prompt.textContent = text;
      prompt.style.opacity = '1';
    },
    setBattery(v) {
      const pct = Math.max(0, Math.min(100, v));
      batteryFill.style.width = `${pct}%`;
      batteryFill.style.background = pct < 20 ? UI.danger : pct < 45 ? UI.warm : UI.accent;
    },
    setStamina(v, show) {
      stamina.style.opacity = show ? '0.9' : '0';
      staminaFill.style.width = `${Math.max(0, Math.min(100, v))}%`;
    },
    setAlly(mode, fear) {
      ally.textContent = `Anya · ${mode} · ${fear}`;
    },
    setPaused(on, onResume, onRestart) {
      if (!on) {
        clearModal();
        return;
      }
      const p = makePanel();
      const h = el('h2', `margin:0 0 8px;font-size:1.25rem;color:#e8f0ea`);
      h.textContent = 'Paused';
      const sub = el('p', `margin:0 0 16px;color:${UI.muted};font-size:0.88rem`);
      sub.textContent = 'The dark waits. So do they.';
      const resume = mkBtn('Resume', true);
      resume.addEventListener('click', onResume);
      const restart = mkBtn('Restart', false);
      restart.addEventListener('click', onRestart);
      p.append(h, sub, resume, restart);
      showModal(p);
    },
    showDialogue(speaker, lines, choices, onChoice) {
      const p = makePanel();
      const sp = el('div', `font-size:0.72rem;letter-spacing:.12em;text-transform:uppercase;color:${UI.accent};margin-bottom:10px`);
      sp.textContent = speaker;
      p.appendChild(sp);
      for (const line of lines) {
        const para = el('p', `margin:0 0 10px;color:${UI.text}`);
        para.textContent = line;
        p.appendChild(para);
      }
      if (choices?.length && onChoice) {
        for (const c of choices) {
          const b = mkBtn(c.label, false);
          b.style.display = 'block';
          b.style.width = '100%';
          b.style.textAlign = 'left';
          b.addEventListener('click', () => onChoice(c.id));
          p.appendChild(b);
        }
      } else {
        const cont = mkBtn('Continue', true);
        cont.addEventListener('click', () => onChoice?.('continue'));
        p.appendChild(cont);
      }
      showModal(p);
    },
    hideDialogue: clearModal,
    showEnding(ending, state, onHub, onRestart) {
      const copy = endingCopy(ending, state);
      const p = makePanel();
      const eye = el('div', `font-size:0.72rem;letter-spacing:.14em;text-transform:uppercase;color:${UI.accent};margin-bottom:8px`);
      eye.textContent = `Ending ${ending ?? '?'}`;
      const h = el('h2', `margin:0 0 10px;font-size:1.35rem;color:#e8f0ea`);
      h.textContent = copy.title;
      const body = el('p', `margin:0 0 14px;color:${UI.muted};font-size:0.92rem`);
      body.textContent = copy.body;
      const meta = el('p', `margin:0 0 18px;color:${UI.muted};font-size:0.8rem`);
      meta.textContent = `${trustLabel(state.resources.trust)} · badges ${state.flags.badges}/3 · deaths ${state.resources.deaths}`;
      const again = mkBtn('Play again', true);
      again.addEventListener('click', onRestart);
      const hub = document.createElement('a');
      hub.href = '/games';
      hub.textContent = 'Back to Games';
      hub.style.cssText = `min-height:42px;padding:0 18px;margin:6px;border:1px solid ${UI.border};border-radius:9px;cursor:pointer;background:transparent;color:${UI.text};font:500 14px/1 inherit;display:inline-flex;align-items:center;text-decoration:none;`;
      hub.addEventListener('click', (e) => {
        e.preventDefault();
        onHub();
      });
      p.append(eye, h, body, meta, again, hub);
      showModal(p);
    },
    showDeath(onContinue) {
      const p = makePanel();
      const h = el('h2', `margin:0 0 8px;color:${UI.danger}`);
      h.textContent = 'Taken';
      const sub = el('p', `margin:0 0 16px;color:${UI.muted};font-size:0.9rem`);
      sub.textContent = 'The role closed around you. Checkpoint strip still glows.';
      const cont = mkBtn('Wake at checkpoint', true);
      cont.addEventListener('click', onContinue);
      p.append(h, sub, cont);
      showModal(p);
    },
    setGrab(active, progress) {
      grab.style.opacity = active ? '1' : '0';
      grabFill.style.width = `${Math.max(0, Math.min(100, progress * 100))}%`;
    },
    flashVignette(amount) {
      vignette.style.opacity = String(Math.max(0, Math.min(0.85, amount)));
      const r = Math.floor(40 + amount * 80);
      vignette.style.background = `radial-gradient(ellipse at center,transparent 35%,rgba(${r},8,8,${0.15 + amount * 0.5}) 100%)`;
    },
    dispose() {
      window.clearTimeout(subtitleTimer);
      window.clearTimeout(objectiveFlashTimer);
      root.remove();
    },
  };
}

function el(tag: string, css: string): HTMLElement {
  const n = document.createElement(tag);
  n.style.cssText = css;
  return n;
}

function endingCopy(ending: EndingId, state: GameState): { title: string; body: string } {
  switch (ending) {
    case 'A':
      return {
        title: 'Discharge',
        body: 'You accept the patient truth and leave with Anya through the service tunnel. Dawn grey. A discharge form waits — signed by Anya, dated this morning.',
      };
    case 'B':
      return {
        title: 'Night Shift',
        body: 'You keep the orderly story. The Protocol stabilizes as you. Anya is locked out. The station is calm. The silhouettes are not.',
      };
    case 'C':
      return {
        title: 'Open Protocol',
        body: `You overload the theater core with Anya${state.flags.lucidSaved ? ' and the lucid patient’s map' : ''}. The wing goes inert. One Echo footprint does not fade.`,
      };
    case 'D':
      return {
        title: 'Static',
        body: 'Radio hiss. Title glyph glitches to patient 7-14. Without Anya, the night has no tourniquet.',
      };
    default:
      return { title: 'Ward silent', body: 'No ending recorded.' };
  }
}
