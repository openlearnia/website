import * as THREE from 'three';
import { createFpsPlayer, type PlayerController } from './player';
import { buildWardLevel, type WardLevel, type Interactable } from './level';
import { spawnEnemy, type EnemyActor } from './enemy';
import { spawnAnya, type AnyaActor } from './anya';
import { createAudioDirector } from './audio';
import { createHud } from './hud';
import { createInitialState, canReachEndingC, type GameState, type EndingId } from './state';

export type GameHandle = {
  state: GameState;
  player: PlayerController;
  dispose: () => void;
  restart: () => Promise<void>;
};

/**
 * Horror Ward play loop on Three.js — acts, Anya, pursuers, endings A–D.
 */
export async function mountHorrorGame(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  renderer: THREE.WebGLRenderer,
  clock: THREE.Clock,
): Promise<GameHandle> {
  const audio = createAudioDirector();
  const hud = createHud(host);
  let state = createInitialState();
  let level: WardLevel | null = null;
  let player: PlayerController | null = null;
  let anya: AnyaActor | null = null;
  let enemies: EnemyActor[] = [];
  let disposed = false;
  let dialogueLock = false;
  let grabActive = false;
  let grabProgress = 0;
  let decoyPos: THREE.Vector3 | null = null;
  let decoyTimer = 0;
  let upsHold = 0;
  let startPending = false;
  let holdE = false;
  let raf = 0;

  const loadBar = document.createElement('div');
  loadBar.style.cssText = `
    position:absolute;left:50%;top:62%;transform:translate(-50%,-50%);z-index:6;
    width:min(70%,280px);pointer-events:none;font:12px/1.3 ui-monospace,monospace;color:#7a8a82;text-align:center;
  `;
  const loadFillWrap = document.createElement('div');
  loadFillWrap.style.cssText = `height:4px;background:#1a221c;border-radius:2px;overflow:hidden;margin-top:8px;`;
  const loadFill = document.createElement('div');
  loadFill.style.cssText = `height:100%;width:0%;background:#6e9b7a;transition:width .15s;`;
  loadFillWrap.appendChild(loadFill);
  loadBar.append('Preparing Ward 7…', loadFillWrap);
  host.appendChild(loadBar);

  hud.showTitle(() => {
    startPending = true;
    hud.hideTitle();
    void audio.resume();
    hud.setSubtitle('Click canvas to look · loading lobby first…', 6000);
  });

  const cleanupActors = () => {
    cancelAnimationFrame(raf);
    player?.dispose();
    player = null;
    anya?.dispose();
    anya = null;
    for (const e of enemies) e.dispose();
    enemies = [];
    level?.dispose();
    level = null;
  };

  const setObjective = (text: string) => {
    state.objective = text;
    hud.setObjective(text);
  };

  const setCheckpoint = (id: string) => {
    const pos = level?.checkpoints[id];
    if (!pos) return;
    state.checkpoint = { id, position: { x: pos.x, y: pos.y, z: pos.z }, beat: state.beat };
  };

  const radio = (line: string) => hud.setSubtitle(line);

  const beginDialogue = (
    speaker: string,
    lines: string[],
    choices?: { id: string; label: string }[],
  ): Promise<string> =>
    new Promise((resolve) => {
      dialogueLock = true;
      player?.setEnabled(false);
      if (document.pointerLockElement) document.exitPointerLock?.();
      hud.showDialogue(speaker, lines, choices, (id) => {
        hud.hideDialogue();
        dialogueLock = false;
        player?.setEnabled(true);
        canvas.requestPointerLock?.();
        resolve(id);
      });
    });

  const triggerEnding = async (ending: EndingId) => {
    state.ending = ending;
    state.playing = false;
    player?.setEnabled(false);
    if (document.pointerLockElement) document.exitPointerLock?.();
    audio.setBed(null);
    audio.playSfx(ending === 'D' ? 'echo' : 'sting');
    hud.showEnding(
      ending,
      state,
      () => {
        window.location.href = '/games';
      },
      () => {
        void restart();
      },
    );
  };

  const onDeath = () => {
    state.resources.deaths += 1;
    state.resources.battery = Math.max(0, state.resources.battery - 15);
    grabActive = false;
    grabProgress = 0;
    hud.setGrab(false, 0);
    player?.setEnabled(false);
    if (document.pointerLockElement) document.exitPointerLock?.();
    audio.playSfx('sting');

    if (!state.anyaAlive || (state.resources.deaths >= 5 && state.resources.trust < 25)) {
      state.anyaAlive = false;
      void triggerEnding('D');
      return;
    }

    hud.showDeath(() => {
      hud.hideDialogue();
      const cp = state.checkpoint.position;
      player?.teleport(new THREE.Vector3(cp.x, cp.y, cp.z));
      player?.setBattery(state.resources.battery);
      for (const e of enemies) e.resetToPatrol();
      player?.setEnabled(true);
      canvas.requestPointerLock?.();
      radio('Anya: Stay on the green. Breathe.');
    });
  };

  const openBayB = () => {
    const gate = level?.interactables.find((i) => i.id === 'bay_b_gate');
    if (gate) {
      gate.enabled = false;
      gate.consumed = true;
      gate.mesh.visible = false;
    }
    state.flags.bayBOpen = true;
    state.beat = 'bay_b';
    state.act = 2;
    level?.setFogAct(2);
    setCheckpoint('CP-03');
    setObjective('Collect three Protocol badges. Cross the day room carefully.');
    radio('Anya: That flashlight ahead… that used to be Theo.');
    audio.setBed('explore');
    enemies.find((e) => e.kind === 'stitcher' && !e.root.name.includes('soft'))?.setActive(true);
  };

  const handleInteract = async (it: Interactable) => {
    if (dialogueLock || !state.playing) return;
    audio.playSfx(it.kind === 'door' || it.kind === 'gate' ? 'metalDoor' : 'keys');

    switch (it.kind) {
      case 'anya_meet': {
        if (state.flags.metAnya) return;
        state.flags.metAnya = true;
        it.consumed = true;
        it.mesh.visible = false;
        anya?.setEmbodied(true);
        anya?.root.position.copy(level!.zones.nurses);
        anya?.setMode('follow');
        anya?.setHideTarget(level!.hideNodes[1] ?? level!.zones.nurses);
        state.resources.battery = Math.min(100, state.resources.battery + 35);
        player?.setBattery(state.resources.battery);
        setCheckpoint('CP-02');
        await beginDialogue('Nurse Anya Rhee', [
          'If you can hear this, stay on the green strips.',
          'I’m Anya. Charge pack — take it. Utility closet has the UPS.',
          'Don’t follow voices that aren’t me.',
        ]);
        setObjective('Restore the UPS in the utility closet (hold E).');
        radio('Anya: When the UPS kicks, Bay B unlocks. Then we move.');
        break;
      }
      case 'badge': {
        if (it.consumed) return;
        it.consumed = true;
        it.mesh.visible = false;
        state.flags.badges += 1;
        state.resources.trust += 2;
        setObjective(`Protocol badges ${state.flags.badges}/3. Keep moving.`);
        radio(`Badge secured (${state.flags.badges}/3).`);
        if (state.flags.badges >= 3) {
          setObjective('All badges. Clear pharmacy, then descend Stairwell A.');
        }
        break;
      }
      case 'doc': {
        if (it.consumed) return;
        it.consumed = true;
        state.docs.push('DOC-01');
        await beginDialogue('Float pool shift card', [
          'Ellis Kane — night orderly, float pool.',
          'Hire date… predates any Ward 7 posting you remember.',
        ]);
        radio('Anya: Don’t look at your chart first. Look at me — later.');
        state.resources.trust += 3;
        break;
      }
      case 'lantern_socket': {
        if (state.flags.lanternPlaced) return;
        state.flags.lanternPlaced = true;
        it.consumed = true;
        it.mesh.scale.multiplyScalar(1.4);
        state.resources.trust += 5;
        anya?.setMode('follow');
        radio('Anya: Light path’s good. I can walk that aisle now.');
        setObjective('Optional: help the lucid patient, then descend the stairwell.');
        break;
      }
      case 'lucid': {
        if (state.flags.lucidSaved) return;
        state.flags.lucidSaved = true;
        it.consumed = true;
        it.mesh.visible = false;
        state.resources.trust += 15;
        state.docs.push('DOC-07');
        await beginDialogue('Lucid patient', [
          'They rewrite roles until nothing sticks.',
          'Take this — if you open the theater, overload the core. Don’t become it.',
        ]);
        radio('Anya: That letter… keep it. Please.');
        break;
      }
      case 'door': {
        if (it.id === 'stair_gate') {
          if (state.flags.badges < 2 || !state.flags.lanternPlaced) {
            radio('Anya: Badges and a lit pharmacy path first.');
            return;
          }
          it.consumed = true;
          it.mesh.visible = false;
          state.act = 3;
          state.beat = 'sub';
          level?.setFogAct(3);
          setCheckpoint('CP-05');
          audio.setBed('echo');
          enemies.find((e) => e.kind === 'echo')?.setActive(true);
          enemies.find((e) => e.kind === 'warden')?.setActive(false);
          await beginDialogue('Anya', [
            'When this is over, don’t look at your chart first. Look at me.',
            'Below… lights won’t stay. Keep the beam honest.',
          ]);
          setObjective('Survive the sub-level. Reach the theater chair.');
          state.flags.echoIntroduced = true;
          radio('Something shifts only when your light dies.');
        }
        break;
      }
      case 'wristband': {
        if (state.flags.wristbandSeen) return;
        state.flags.wristbandSeen = true;
        it.consumed = true;
        state.docs.push('DOC-05');
        state.beat = 'choice';
        setCheckpoint('CP-10');
        await beginDialogue('Patient wristband', [
          'Ashford Memorial — Patient 7-14.',
          'Name: Ellis Kane. Voluntary admission. Dissociative episodes.',
        ]);
        await confessAndChoose();
        break;
      }
      case 'exit_a': {
        if (!state.flags.anyaConfessed) {
          radio('Not yet — the theater still holds the truth.');
          return;
        }
        await triggerEnding(state.ending === 'A' || !state.ending ? 'A' : state.ending);
        break;
      }
      case 'gate': {
        if (!state.flags.upsRestored) radio('Bay B sealed until the UPS is online.');
        break;
      }
      default:
        break;
    }
  };

  const confessAndChoose = async () => {
    state.flags.anyaConfessed = true;
    state.act = 4;
    level?.setFogAct(4);
    const choice = await beginDialogue(
      'Anya',
      [
        'You’re Patient 7-14. I rewrote a blank badge into “orderly.”',
        'The lie kept the Protocol from locking onto one identity.',
        'Now you have to choose who walks out.',
      ],
      [
        { id: 'accept', label: 'Accept the patient truth — leave with Anya (A)' },
        { id: 'deny', label: 'Keep the orderly story — stay on shift (B)' },
        ...(canReachEndingC(state)
          ? [{ id: 'core', label: 'Destroy the Protocol (trust + lucid) (C)' }]
          : []),
      ],
    );

    if (choice === 'deny') {
      state.resources.trust -= 10;
      anya?.setEmbodied(false);
      await triggerEnding('B');
      return;
    }
    if (choice === 'core' && canReachEndingC(state)) {
      await triggerEnding('C');
      return;
    }
    state.resources.trust += 10;
    state.ending = 'A';
    setObjective('Flashlight dying — reach the service tunnel with Anya.');
    player?.setBattery(Math.min(player.getBattery(), 12));
    state.resources.battery = player?.getBattery() ?? 12;
    radio('Anya: Almost dark. Stay close.');
    anya?.setMode('follow');
  };

  const boot = async () => {
    cleanupActors();
    state = createInitialState();
    loadBar.style.display = 'block';
    loadFill.style.width = '0%';

    level = await buildWardLevel(scene, {
      fastPlay: true,
      onProgress: (p) => {
        const pct = Math.min(100, Math.floor((p.done / Math.max(1, p.total)) * 100));
        loadFill.style.width = `${pct}%`;
        loadBar.firstChild && (loadBar.childNodes[0].textContent = p.label);
      },
    });

    // Lobby ready — hide bar once play starts; stream continues
    const spawnPlayer = level.spawns.player ?? new THREE.Vector3(0, 0.85, 2);
    player = createFpsPlayer(camera, canvas, {
      spawn: spawnPlayer,
      flashlight: level.lighting.flashlight,
      onFootstep: (loud) => audio.playSfx(loud ? 'foot' : 'footSoft', { volume: loud ? 0.35 : 0.22 }),
    });
    player.setBattery(state.resources.battery);

    anya = await spawnAnya(scene, level.spawns.anya ?? level.zones.nurses);

    const s1 = level.spawns.stitcher ?? new THREE.Vector3(0, 0, 20);
    const soft = await spawnEnemy(
      scene,
      'stitcher',
      [s1, s1.clone().add(new THREE.Vector3(1.2, 0, -2)), s1.clone().add(new THREE.Vector3(-1, 0, 2))],
      { audio, softOnly: true },
    );
    soft.root.name = 'stitcher_soft';

    const wSpawn = level.spawns.warden ?? level.zones.dayroom;
    const warden = await spawnEnemy(
      scene,
      'warden',
      [
        wSpawn,
        wSpawn.clone().add(new THREE.Vector3(-2, 0, 2)),
        wSpawn.clone().add(new THREE.Vector3(1.5, 0, -1)),
      ],
      {
        audio,
        onMimic: () => {
          if (!state.flags.mimicTaught) {
            state.flags.mimicTaught = true;
            radio('"Anya": Go left— wait. Wrong channel. Stay.');
          } else {
            radio('"Anya": Staff lounge is clear. (static)');
          }
        },
      },
    );
    warden.setActive(false);

    const echo = await spawnEnemy(scene, 'echo', [level.zones.sub], { audio });
    echo.setActive(false);

    const s2 = new THREE.Vector3(-6, 0, 28);
    const stitcher2 = await spawnEnemy(
      scene,
      'stitcher',
      [s2, s2.clone().add(new THREE.Vector3(2, 0, 0)), s2.clone().add(new THREE.Vector3(0, 0, -2))],
      { audio },
    );
    stitcher2.root.name = 'stitcher_bay';
    stitcher2.setActive(false);

    enemies = [soft, warden, echo, stitcher2];

    player.onInteractKey(() => {
      if (!player || !level || dialogueLock) return;
      const near = level.nearestInteractable(player.body.position);
      if (!near || near.kind === 'ups') return;
      void handleInteract(near);
    });

    player.onAllyCommand((slot) => {
      if (!anya?.embodied) return;
      if (slot === 1) anya.setMode('follow');
      if (slot === 2) anya.setMode('wait');
      if (slot === 3) {
        anya.setHideTarget(level?.hideNodes[0] ?? null);
        anya.setMode('hide');
      }
      if (slot === 4) {
        const lead = player!.body.position.clone().add(new THREE.Vector3(2, 0, 3));
        anya.setLeadTarget(lead);
        anya.setMode('distract');
        decoyPos = lead;
        decoyTimer = 4;
        audio.playSfx('door');
        state.resources.trust += 5;
        radio('Anya: Drawing them — hide!');
      }
      hud.setAlly(anya.mode, anya.fear);
    });

    player.onStunKey(() => {
      if (!player?.pulseStun()) return;
      audio.playSfx('sting', { volume: 0.55 });
      state.noiseBurst = 1;
      for (const e of enemies) {
        if (!e.active) continue;
        if (e.root.position.distanceTo(player!.body.position) < 10) {
          e.stun(e.kind === 'warden' ? 1.6 : 2.5);
        }
      }
    });

    radio('Anya (radio): If you can hear this, stay on the green strips.');
    setObjective('Reach the nurses’ station. Meet Anya.');
    level.setFogAct(1);
    audio.setBed('hvac');

    const onHoldDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE') holdE = true;
      if (e.code === 'Escape' && state.playing && !dialogueLock) {
        state.paused = !state.paused;
        if (state.paused) {
          player?.setEnabled(false);
          hud.setPaused(
            true,
            () => {
              state.paused = false;
              hud.setPaused(false, () => undefined, () => undefined);
              player?.setEnabled(true);
              canvas.requestPointerLock?.();
            },
            () => void restart(),
          );
        }
      }
    };
    const onHoldUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyE') holdE = false;
    };
    window.addEventListener('keydown', onHoldDown);
    window.addEventListener('keyup', onHoldUp);

    const flashDir = new THREE.Vector3();
    const tick = () => {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      renderer.render(scene, camera);

      if (!startPending || !player || !level) return;
      if (!state.playing) {
        state.playing = true;
        loadBar.style.display = 'none';
      }
      if (!state.playing || state.paused || dialogueLock) return;

      player.update(dt, level.canStand);
      const sense = player.sense();
      state.resources.battery = player.getBattery();
      state.resources.stamina = player.getStamina();
      hud.setBattery(state.resources.battery);
      hud.setStamina(state.resources.stamina, sense.sprinting || state.resources.stamina < 95);

      if (anya?.embodied) {
        const enemyNear = enemies.some(
          (e) =>
            e.active && e.getState() === 'chase' && e.root.position.distanceTo(anya!.root.position) < 10,
        );
        const chased = enemies.some((e) => e.active && e.getState() === 'chase');
        anya.update({ playerPos: sense.position, enemyNear, chased, dt });
        hud.setAlly(anya.mode, anya.fear);
      }

      const near = level.nearestInteractable(sense.position, 2.2);
      if (near && near.enabled && !near.consumed) {
        if (near.kind === 'ups' && !state.flags.upsRestored) {
          hud.setPrompt('Hold E — Restore UPS');
          if (holdE) {
            upsHold += dt;
            hud.setPrompt(`Restoring UPS… ${Math.min(100, Math.floor((upsHold / 2.5) * 100))}%`);
            if (upsHold >= 2.5) {
              state.flags.upsRestored = true;
              near.consumed = true;
              near.mesh.visible = false;
              upsHold = 0;
              state.noiseBurst = 1.2;
              audio.playSfx('lock');
              audio.playSfx('chase', { volume: 0.4 });
              openBayB();
              enemies.find((e) => e.root.name === 'stitcher_bay')?.setActive(true);
            }
          } else upsHold = Math.max(0, upsHold - dt * 2);
        } else {
          hud.setPrompt(`E — ${near.label}`);
          upsHold = 0;
        }
      } else {
        hud.setPrompt(null);
        upsHold = 0;
      }

      if (state.flags.bayBOpen && sense.position.z > 32 && state.beat === 'bay_b') {
        state.beat = 'dayroom';
        setCheckpoint('CP-04');
        enemies.find((e) => e.kind === 'warden')?.setActive(true);
        radio('Hard soles. A white cone sweeps the glass.');
      }
      if (state.flags.badges >= 1 && sense.position.z > 42 && state.beat === 'dayroom') {
        state.beat = 'pharmacy';
        setCheckpoint('CP-05');
      }

      if (decoyTimer > 0) {
        decoyTimer -= dt;
        if (decoyTimer <= 0) decoyPos = null;
      }
      if (state.noiseBurst > 0) state.noiseBurst = Math.max(0, state.noiseBurst - dt);

      player.camera.getWorldDirection(flashDir);
      flashDir.y = 0;
      flashDir.normalize();

      let maxSus = 0;
      for (const e of enemies) {
        if (!e.active) continue;
        if (e.kind === 'warden' && !state.flags.bayBOpen) continue;
        if (e.kind === 'echo' && state.act < 3) continue;
        const result = e.update({
          playerPos: sense.position,
          playerSense: sense,
          flashDir,
          decoyPos,
          noiseBurst: state.noiseBurst,
          dt,
        });
        maxSus = Math.max(maxSus, result.suspicion);
        if (result.grab && !grabActive) {
          grabActive = true;
          grabProgress = 0.2;
          player.setEnabled(false);
          audio.playSfx('chase');
        }
      }
      hud.flashVignette(Math.min(0.7, maxSus * 0.45 + (grabActive ? 0.3 : 0)));

      if (grabActive) {
        hud.setGrab(true, grabProgress);
        grabProgress += player.consumeStruggle() * 0.08 - dt * 0.12;
        if (grabProgress >= 1) {
          grabActive = false;
          grabProgress = 0;
          hud.setGrab(false, 0);
          player.setEnabled(true);
          radio('You tear free. Move.');
          for (const e of enemies) e.stun(2);
        } else if (grabProgress <= 0) {
          onDeath();
        }
      }

      // Autostart / screenshot helpers
    };

    raf = requestAnimationFrame(tick);

    // Screenshot / audit query params
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startPending = true;
      hud.hideTitle();
      state.playing = true;
      loadBar.style.display = 'none';
    }
    const at = params.get('at');
    if (at && level) {
      const spots: Record<string, THREE.Vector3> = {
        lobby: level.zones.lobby,
        nurses: level.zones.nurses,
        dayroom: level.zones.dayroom,
        sub: level.zones.sub,
        theater: level.zones.theater,
      };
      const spot = spots[at];
      if (spot) player.teleport(new THREE.Vector3(spot.x, 0.85, spot.z));
    }
    if (params.get('safe') === '1') {
      for (const e of enemies) e.setActive(false);
    }

    return () => {
      window.removeEventListener('keydown', onHoldDown);
      window.removeEventListener('keyup', onHoldUp);
    };
  };

  let unbindHold: (() => void) | undefined;
  unbindHold = await boot();

  async function restart() {
    hud.hideDialogue();
    unbindHold?.();
    unbindHold = await boot();
  }

  return {
    get state() {
      return state;
    },
    get player() {
      return player!;
    },
    restart,
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      unbindHold?.();
      cleanupActors();
      audio.dispose();
      hud.dispose();
      loadBar.remove();
    },
  };
}
