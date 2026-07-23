/** Narrative + resource state for Horror Ward (Phase 3). */

export type EndingId = 'A' | 'B' | 'C' | 'D' | null;

export type ActId = 0 | 1 | 2 | 3 | 4;

export type SceneBeat =
  | 'title'
  | 'lobby'
  | 'nurses'
  | 'bay_b'
  | 'dayroom'
  | 'pharmacy'
  | 'sub'
  | 'theater'
  | 'choice'
  | 'ending'
  | 'epilogue';

export type GameFlags = {
  metAnya: boolean;
  upsRestored: boolean;
  bayBOpen: boolean;
  badges: number;
  lucidSaved: boolean;
  lanternPlaced: boolean;
  echoIntroduced: boolean;
  wristbandSeen: boolean;
  anyaConfessed: boolean;
  galleryDone: boolean;
  mimicTaught: boolean;
};

export type GameResources = {
  battery: number;
  stamina: number;
  heart: number;
  trust: number;
  decoys: number;
  deaths: number;
};

export type Checkpoint = {
  id: string;
  position: { x: number; y: number; z: number };
  beat: SceneBeat;
};

export type GameState = {
  act: ActId;
  beat: SceneBeat;
  objective: string;
  paused: boolean;
  playing: boolean;
  ending: EndingId;
  anyaAlive: boolean;
  flags: GameFlags;
  resources: GameResources;
  checkpoint: Checkpoint;
  docs: string[];
  noiseBurst: number;
  suspicionVignette: number;
};

export function createInitialState(): GameState {
  return {
    act: 1,
    beat: 'lobby',
    objective: 'Follow the green strips into Ward 7.',
    paused: false,
    playing: false,
    ending: null,
    anyaAlive: true,
    flags: {
      metAnya: false,
      upsRestored: false,
      bayBOpen: false,
      badges: 0,
      lucidSaved: false,
      lanternPlaced: false,
      echoIntroduced: false,
      wristbandSeen: false,
      anyaConfessed: false,
      galleryDone: false,
      mimicTaught: false,
    },
    resources: {
      battery: 100,
      stamina: 100,
      heart: 100,
      trust: 45,
      decoys: 1,
      deaths: 0,
    },
    checkpoint: {
      id: 'CP-01',
      position: { x: 0, y: 0.85, z: 4 },
      beat: 'lobby',
    },
    docs: [],
    noiseBurst: 0,
    suspicionVignette: 0,
  };
}

export function trustLabel(trust: number): string {
  if (trust >= 70) return 'Anya trusts you';
  if (trust >= 40) return 'Anya is with you';
  if (trust >= 20) return 'Anya is wary';
  return 'Anya barely trusts you';
}

export function canReachEndingC(state: GameState): boolean {
  return state.flags.lucidSaved && state.resources.trust >= 70 && state.anyaAlive;
}
