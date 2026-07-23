import { ASSET_ROOT } from './wardMap';

type Track = {
  el: HTMLAudioElement;
  baseVol: number;
};

/**
 * Lightweight HTMLAudio layer — beds + one-shots from ASSET_INDEX paths.
 * No Web Audio graph; good enough for browser horror beds.
 */
export type AudioDirector = {
  resume: () => Promise<void>;
  playSfx: (id: SfxId, opts?: { volume?: number; rate?: number }) => void;
  setBed: (id: BedId | null, fadeMs?: number) => void;
  setMuted: (m: boolean) => void;
  dispose: () => void;
};

export type BedId = 'hvac' | 'explore' | 'echo' | 'breath';
export type SfxId =
  | 'foot'
  | 'footSoft'
  | 'door'
  | 'lock'
  | 'chase'
  | 'sting'
  | 'keys'
  | 'echo'
  | 'metalDoor';

const BEDS: Record<BedId, { path: string; vol: number; loop: boolean }> = {
  hvac: { path: 'audio/sfx/ambient-drone-loop-01.ogg', vol: 0.28, loop: true },
  explore: { path: 'audio/music/ambient-ancient-caverns.ogg', vol: 0.22, loop: true },
  echo: { path: 'audio/music/ambient-sci-fi-horror.mp3', vol: 0.26, loop: true },
  breath: { path: 'audio/sfx/breath.mp3', vol: 0.12, loop: true },
};

const SFX: Record<SfxId, string> = {
  foot: 'audio/sfx/footstep-01.ogg',
  footSoft: 'audio/sfx/footstep-cloth-01.ogg',
  door: 'audio/sfx/door-creak-heavy-open.ogg',
  lock: 'audio/sfx/lock-open.ogg',
  chase: 'audio/sfx/chase-cue-thunder.ogg',
  sting: 'audio/sfx/sting-hit-01.ogg',
  keys: 'audio/sfx/keys-jingle.ogg',
  echo: 'audio/sfx/sting-hit-02.ogg',
  metalDoor: 'audio/sfx/metal-door-open.ogg',
};

function makeAudio(path: string, loop: boolean, vol: number): HTMLAudioElement {
  const el = new Audio(`${ASSET_ROOT}/${path}`);
  el.loop = loop;
  el.volume = vol;
  el.preload = 'auto';
  return el;
}

export function createAudioDirector(): AudioDirector {
  const beds = new Map<BedId, Track>();
  let currentBed: BedId | null = null;
  let muted = false;
  let footFlip = false;

  for (const [id, cfg] of Object.entries(BEDS) as [BedId, (typeof BEDS)[BedId]][]) {
    beds.set(id, { el: makeAudio(cfg.path, cfg.loop, cfg.vol), baseVol: cfg.vol });
  }

  const resume = async () => {
    // Unlock audio on first gesture
    const probe = beds.get('hvac')?.el;
    if (!probe) return;
    try {
      await probe.play();
      probe.pause();
      probe.currentTime = 0;
    } catch {
      /* autoplay policy */
    }
  };

  const setBed = (id: BedId | null, fadeMs = 600) => {
    if (id === currentBed) return;
    const prev = currentBed ? beds.get(currentBed) : undefined;
    currentBed = id;
    const next = id ? beds.get(id) : undefined;

    if (prev) {
      const start = prev.el.volume;
      const t0 = performance.now();
      const step = () => {
        const t = Math.min(1, (performance.now() - t0) / fadeMs);
        prev.el.volume = start * (1 - t) * (muted ? 0 : 1);
        if (t < 1) requestAnimationFrame(step);
        else {
          prev.el.pause();
          prev.el.volume = muted ? 0 : prev.baseVol;
        }
      };
      requestAnimationFrame(step);
    }

    if (next && !muted) {
      next.el.volume = 0;
      void next.el.play().catch(() => undefined);
      const t0 = performance.now();
      const target = next.baseVol;
      const step = () => {
        const t = Math.min(1, (performance.now() - t0) / fadeMs);
        next.el.volume = target * t;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  };

  const playSfx = (id: SfxId, opts?: { volume?: number; rate?: number }) => {
    if (muted) return;
    let path = SFX[id];
    if (id === 'foot') {
      footFlip = !footFlip;
      path = footFlip ? 'audio/sfx/footstep-01.ogg' : 'audio/sfx/footstep-02.ogg';
    }
    const el = makeAudio(path, false, opts?.volume ?? 0.45);
    if (opts?.rate) el.playbackRate = opts.rate;
    void el.play().catch(() => undefined);
  };

  return {
    resume,
    playSfx,
    setBed,
    setMuted: (m) => {
      muted = m;
      for (const t of beds.values()) {
        t.el.volume = m ? 0 : t.baseVol;
        if (m) t.el.pause();
        else if (currentBed && beds.get(currentBed) === t) void t.el.play().catch(() => undefined);
      }
    },
    dispose: () => {
      for (const t of beds.values()) {
        t.el.pause();
        t.el.src = '';
      }
      beds.clear();
    },
  };
}
