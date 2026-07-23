import * as THREE from 'three';

const COLORS = {
  bg: 0x050810,
  cyan: 0x6ea8fe,
  green: 0x3dd68c,
  purple: 0xc084fc,
  text: '#e8eaed',
  muted: '#9aa0a6',
  accent: '#6ea8fe',
  panelBg: 'rgba(15,17,23,0.92)',
  panelBorder: '#2a2f3a',
  panelTextDark: '#0f1117',
} as const;

const MAX_MISSES = 3;
const RING_SPACING = 22;
const BASE_SPEED = 16;
const BOOST_SPEED = 28;
const BOOST_DURATION = 0.45;
const STEER_SPEED = 11;
const STEER_BOUNDS = 5.5;
const PLAYABLE_SHRINK = 0.82;

type GameState = 'start' | 'playing' | 'gameover';

interface RingData {
  group: THREE.Group;
  z: number;
  x: number;
  y: number;
  rx: number;
  ry: number;
  evaluated: boolean;
  passed: boolean;
}

interface InputState {
  steerX: number;
  steerY: number;
  boost: boolean;
  keys: Record<string, boolean>;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj: THREE.Object3D) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      const { material } = obj;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
    }
  });
}

function createOverlayPanel(): HTMLDivElement {
  const panel = document.createElement('div');
  panel.style.cssText = `
    background: ${COLORS.panelBg};
    border: 1px solid ${COLORS.panelBorder};
    border-radius: 14px;
    padding: 28px 32px;
    text-align: center;
    max-width: min(92%, 420px);
    box-shadow: 0 18px 48px rgba(0,0,0,0.45);
  `;
  return panel;
}

function createButton(label: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = label;
  btn.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 28px;
    margin-top: 18px;
    border: none;
    border-radius: 10px;
    background: ${COLORS.accent};
    color: ${COLORS.panelTextDark};
    font: 600 16px/1.2 inherit;
    cursor: pointer;
    touch-action: manipulation;
    transition: filter 0.15s ease, transform 0.1s ease;
  `;
  btn.addEventListener('pointerenter', () => {
    btn.style.filter = 'brightness(1.08)';
  });
  btn.addEventListener('pointerleave', () => {
    btn.style.filter = '';
    btn.style.transform = '';
  });
  btn.addEventListener('pointerdown', () => {
    btn.style.transform = 'scale(0.98)';
  });
  btn.addEventListener('pointerup', () => {
    btn.style.transform = '';
  });
  return btn;
}

function createShip(): THREE.Group {
  const ship = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: COLORS.cyan,
    emissive: COLORS.cyan,
    emissiveIntensity: 0.55,
    metalness: 0.35,
    roughness: 0.25,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: COLORS.green,
    emissive: COLORS.green,
    emissiveIntensity: 0.7,
    metalness: 0.2,
    roughness: 0.3,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: COLORS.purple,
    emissive: COLORS.purple,
    emissiveIntensity: 0.35,
    metalness: 0.4,
    roughness: 0.35,
  });

  const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 8), bodyMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.z = -0.2;
  ship.add(fuselage);

  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), accentMat);
  cockpit.position.set(0, 0.12, -0.35);
  ship.add(cockpit);

  const wingGeo = new THREE.BoxGeometry(1.5, 0.06, 0.45);
  const wings = new THREE.Mesh(wingGeo, wingMat);
  wings.position.set(0, 0, 0.15);
  ship.add(wings);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.35), wingMat);
  fin.position.set(0, 0.22, 0.45);
  ship.add(fin);

  const engineGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 8),
    new THREE.MeshBasicMaterial({ color: COLORS.green, transparent: true, opacity: 0.85 }),
  );
  engineGlow.position.set(0, 0, 0.75);
  engineGlow.name = 'engineGlow';
  ship.add(engineGlow);

  return ship;
}

function createRingMesh(rx: number, ry: number, hue: number): THREE.Group {
  const group = new THREE.Group();
  const color = hue === 0 ? COLORS.cyan : hue === 1 ? COLORS.green : COLORS.purple;

  const coreMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.45,
    metalness: 0.1,
    roughness: 0.18,
    transparent: true,
    opacity: 0.98,
  });
  const glowMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const torus = new THREE.Mesh(new THREE.TorusGeometry(1, 0.16, 20, 72), coreMat);
  torus.scale.set(rx, ry, 1);
  group.add(torus);

  const glow = new THREE.Mesh(new THREE.TorusGeometry(1, 0.32, 14, 56), glowMat);
  glow.scale.set(rx * 1.12, ry * 1.12, 1);
  group.add(glow);

  const outer = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.05, 10, 64),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  outer.scale.set(rx * 1.22, ry * 1.22, 1);
  group.add(outer);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.04, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }),
  );
  rim.scale.set(rx * 1.02, ry * 1.02, 1);
  group.add(rim);

  return group;
}

function createStarfield(): THREE.Points {
  const count = 2400;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 220;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 120;
    positions[i * 3 + 2] = -Math.random() * 400 - 20;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.12,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}

export function mountRingRunner(host: HTMLElement): () => void {
  const prevPosition = host.style.position;
  const prevOverflow = host.style.overflow;
  const prevTouchAction = host.style.touchAction;
  host.replaceChildren();
  host.style.position = 'relative';
  host.style.overflow = 'hidden';
  host.style.touchAction = 'none';
  host.style.background = '#050810';

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;';
  host.appendChild(canvas);

  const overlayRoot = document.createElement('div');
  overlayRoot.style.cssText =
    'position:absolute;inset:0;display:flex;flex-direction:column;pointer-events:none;font:inherit;color:' +
    COLORS.text +
    ';';
  host.appendChild(overlayRoot);

  const hud = document.createElement('div');
  hud.style.cssText =
    'display:none;justify-content:space-between;padding:14px 16px;font-size:15px;font-weight:600;pointer-events:none;';
  const scoreEl = document.createElement('span');
  scoreEl.textContent = 'Score 0';
  const missesEl = document.createElement('span');
  missesEl.textContent = 'Misses 0/3';
  missesEl.style.color = COLORS.muted;
  hud.append(scoreEl, missesEl);
  overlayRoot.appendChild(hud);

  const startScreen = document.createElement('div');
  startScreen.style.cssText =
    'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:auto;background:radial-gradient(ellipse at center,rgba(5,8,16,0.55) 0%,rgba(5,8,16,0.78) 100%);';
  const startPanel = createOverlayPanel();
  const startTitle = document.createElement('h1');
  startTitle.textContent = 'Ring Runner';
  startTitle.style.cssText = 'margin:0 0 8px;font-size:clamp(28px,6vw,40px);font-weight:700;letter-spacing:0.04em;';
  const startSub = document.createElement('p');
  startSub.textContent = 'Thread glowing rings in deep space — miss three and you\'re toast.';
  startSub.style.cssText = 'margin:0;color:' + COLORS.muted + ';font-size:15px;line-height:1.5;';
  const startHint = document.createElement('p');
  startHint.textContent = '← → / WASD · drag to steer · Space / tap to boost';
  startHint.style.cssText = 'margin:14px 0 0;color:' + COLORS.muted + ';font-size:13px;';
  const playBtn = createButton('Play');
  startPanel.append(startTitle, startSub, startHint, playBtn);
  startScreen.appendChild(startPanel);
  overlayRoot.appendChild(startScreen);

  const gameOverScreen = document.createElement('div');
  gameOverScreen.style.cssText =
    'position:absolute;inset:0;display:none;align-items:center;justify-content:center;pointer-events:auto;';
  const overPanel = createOverlayPanel();
  const overTitle = document.createElement('h2');
  overTitle.textContent = 'Game Over';
  overTitle.style.cssText = 'margin:0 0 8px;font-size:32px;color:#f28b82;font-weight:700;';
  const overScore = document.createElement('p');
  overScore.style.cssText = 'margin:0;font-size:20px;';
  const restartBtn = createButton('Restart');
  overPanel.append(overTitle, overScore, restartBtn);
  gameOverScreen.appendChild(overPanel);
  overlayRoot.appendChild(gameOverScreen);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(COLORS.bg, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x071018, 0.014);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 500);
  camera.position.set(0, 2.4, 8);

  scene.add(new THREE.AmbientLight(0x446688, 0.7));
  const keyLight = new THREE.PointLight(COLORS.cyan, 3.2, 100);
  keyLight.position.set(6, 8, 4);
  scene.add(keyLight);
  const fillLight = new THREE.PointLight(COLORS.purple, 1.8, 80);
  fillLight.position.set(-5, -2, 2);
  scene.add(fillLight);
  const shipLight = new THREE.PointLight(COLORS.green, 2.0, 22);
  scene.add(shipLight);

  // Soft nebula billboards for depth (not empty void)
  const nebulaGeo = new THREE.PlaneGeometry(40, 24);
  for (let i = 0; i < 4; i++) {
    const nebula = new THREE.Mesh(
      nebulaGeo,
      new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? COLORS.cyan : COLORS.purple,
        transparent: true,
        opacity: 0.045,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    nebula.position.set((i - 1.5) * 12, (i % 2 === 0 ? 4 : -3), -40 - i * 35);
    scene.add(nebula);
  }

  const stars = createStarfield();
  scene.add(stars);

  const ship = createShip();
  scene.add(ship);

  const trailPositions = new Float32Array(90 * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  trailGeo.setDrawRange(0, 0);
  const trailMat = new THREE.LineBasicMaterial({
    color: COLORS.cyan,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const trail = new THREE.Line(trailGeo, trailMat);
  scene.add(trail);

  const rings: RingData[] = [];
  let nextRingZ = -RING_SPACING * 2;
  let ringHue = 0;

  function spawnRing(z: number): void {
    const rx = 2.4 + Math.random() * 1.6;
    const ry = 2.0 + Math.random() * 1.4;
    const x = (Math.random() - 0.5) * 4.5;
    const y = (Math.random() - 0.5) * 3.2;
    const group = createRingMesh(rx, ry, ringHue % 3);
    ringHue += 1;
    group.position.set(x, y, z);
    scene.add(group);
    rings.push({ group, z, x, y, rx, ry, evaluated: false, passed: false });
  }

  for (let i = 0; i < 10; i++) {
    spawnRing(nextRingZ);
    nextRingZ -= RING_SPACING;
  }

  let state: GameState = 'start';
  let score = 0;
  let misses = 0;
  let boostTimer = 0;
  let rafId = 0;
  let lastTime = performance.now();
  const trailHistory: THREE.Vector3[] = [];
  const cameraPos = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const input: InputState = { steerX: 0, steerY: 0, boost: false, keys: {} };

  function resize(): void {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  resize();

  function updateHud(): void {
    scoreEl.textContent = `Score ${score}`;
    missesEl.textContent = `Misses ${misses}/${MAX_MISSES}`;
    missesEl.style.color = misses >= 2 ? '#f28b82' : COLORS.muted;
  }

  function setState(next: GameState): void {
    state = next;
    startScreen.style.display = next === 'start' ? 'flex' : 'none';
    gameOverScreen.style.display = next === 'gameover' ? 'flex' : 'none';
    hud.style.display = next === 'playing' ? 'flex' : 'none';
  }

  function resetGame(): void {
    score = 0;
    misses = 0;
    boostTimer = 0;
    ship.position.set(0, 0, 0);
    ship.rotation.set(0, 0, 0);
    trailHistory.length = 0;
    trailGeo.setDrawRange(0, 0);

    for (const ring of rings) {
      scene.remove(ring.group);
      disposeObject3D(ring.group);
    }
    rings.length = 0;
    nextRingZ = -RING_SPACING * 2;
    ringHue = 0;
    for (let i = 0; i < 10; i++) {
      spawnRing(nextRingZ);
      nextRingZ -= RING_SPACING;
    }

    updateHud();
    setState('playing');
  }

  function endGame(): void {
    overScore.textContent = `Score ${score}`;
    setState('gameover');
  }

  function insideRing(shipX: number, shipY: number, ring: RingData): boolean {
    const dx = (shipX - ring.x) / (ring.rx * PLAYABLE_SHRINK);
    const dy = (shipY - ring.y) / (ring.ry * PLAYABLE_SHRINK);
    return dx * dx + dy * dy <= 1;
  }

  function evaluateRing(ring: RingData): void {
    if (ring.evaluated) return;
    ring.evaluated = true;

    const hit = insideRing(ship.position.x, ship.position.y, ring);
    ring.passed = hit;

    const core = ring.group.children[0] as THREE.Mesh;
    const mat = core.material as THREE.MeshStandardMaterial;
    if (hit) {
      score += 1;
      mat.emissive.setHex(COLORS.green);
      mat.emissiveIntensity = 1.8;
    } else {
      misses += 1;
      mat.emissive.setHex(0xf28b82);
      mat.emissiveIntensity = 1.6;
    }
    updateHud();

    if (misses >= MAX_MISSES) endGame();
  }

  function updateInputFromKeys(): void {
    let sx = 0;
    let sy = 0;
    const k = input.keys;
    if (k.ArrowLeft || k.a || k.A) sx -= 1;
    if (k.ArrowRight || k.d || k.D) sx += 1;
    if (k.ArrowUp || k.w || k.W) sy += 1;
    if (k.ArrowDown || k.s || k.S) sy -= 1;

    if (sx !== 0 || sy !== 0) {
      input.steerX = sx;
      input.steerY = sy;
    }
  }

  function pointerToSteer(clientX: number, clientY: number): void {
    const rect = host.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    input.steerX = clamp((clientX - cx) / (rect.width * 0.38), -1, 1);
    input.steerY = clamp(-(clientY - cy) / (rect.height * 0.38), -1, 1);
  }

  function onKeyDown(e: KeyboardEvent): void {
    input.keys[e.key] = true;
    updateInputFromKeys();
    if (e.code === 'Space') {
      e.preventDefault();
      input.boost = true;
      if (state === 'start') resetGame();
      else if (state === 'gameover') resetGame();
    }
    if (e.code === 'Enter' && state === 'start') resetGame();
  }

  function onKeyUp(e: KeyboardEvent): void {
    input.keys[e.key] = false;
    updateInputFromKeys();
    if (e.code === 'Space') input.boost = false;
  }

  let pointerActive = false;

  function onPointerDown(e: PointerEvent): void {
    if (state !== 'playing') return;
    pointerActive = true;
    host.setPointerCapture(e.pointerId);
    pointerToSteer(e.clientX, e.clientY);
    input.boost = true;
    boostTimer = BOOST_DURATION;
  }

  function onPointerMove(e: PointerEvent): void {
    if (!pointerActive || state !== 'playing') return;
    pointerToSteer(e.clientX, e.clientY);
  }

  function onPointerUp(e: PointerEvent): void {
    pointerActive = false;
    input.boost = false;
    input.steerX = 0;
    input.steerY = 0;
    try {
      host.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }

  function onResize(): void {
    resize();
  }

  playBtn.addEventListener('click', resetGame);
  restartBtn.addEventListener('click', resetGame);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onResize);
  host.addEventListener('pointerdown', onPointerDown);
  host.addEventListener('pointermove', onPointerMove);
  host.addEventListener('pointerup', onPointerUp);
  host.addEventListener('pointercancel', onPointerUp);

  function tick(now: number): void {
    rafId = requestAnimationFrame(tick);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (state === 'playing') {
      updateInputFromKeys();

      if (input.boost && input.keys[' ']) boostTimer = BOOST_DURATION;
      if (boostTimer > 0) boostTimer -= dt;

      const speed = boostTimer > 0 ? BOOST_SPEED : BASE_SPEED;
      ship.position.z -= speed * dt;
      ship.position.x += input.steerX * STEER_SPEED * dt;
      ship.position.y += input.steerY * STEER_SPEED * dt;
      ship.position.x = clamp(ship.position.x, -STEER_BOUNDS, STEER_BOUNDS);
      ship.position.y = clamp(ship.position.y, -STEER_BOUNDS, STEER_BOUNDS);

      ship.rotation.z = -input.steerX * 0.45;
      ship.rotation.x = input.steerY * 0.25;

      const engine = ship.getObjectByName('engineGlow') as THREE.Mesh | undefined;
      if (engine) {
        const scale = boostTimer > 0 ? 1.35 + Math.sin(now * 0.02) * 0.15 : 1;
        engine.scale.setScalar(scale);
        (engine.material as THREE.MeshBasicMaterial).opacity = boostTimer > 0 ? 1 : 0.75;
      }

      while (nextRingZ > ship.position.z - 180) {
        spawnRing(nextRingZ);
        nextRingZ -= RING_SPACING;
      }

      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        if (!ring.evaluated && ship.position.z <= ring.z) {
          evaluateRing(ring);
        }
        if (ring.z > ship.position.z + 35) {
          scene.remove(ring.group);
          disposeObject3D(ring.group);
          rings.splice(i, 1);
        }
      }

      trailHistory.unshift(ship.position.clone());
      if (trailHistory.length > 90) trailHistory.pop();
      const attr = trailGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < trailHistory.length; i++) {
        attr.setXYZ(i, trailHistory[i].x, trailHistory[i].y, trailHistory[i].z + 0.6);
      }
      attr.needsUpdate = true;
      trailGeo.setDrawRange(0, trailHistory.length);
      trailMat.opacity = boostTimer > 0 ? 0.9 : 0.55;

      stars.position.z = ship.position.z * 0.04;
    }

    cameraPos.set(ship.position.x * 0.35, ship.position.y * 0.25 + 2.4, ship.position.z + 7.5);
    camera.position.lerp(cameraPos, state === 'playing' ? 0.1 : 0.06);
    lookTarget.set(ship.position.x * 0.4, ship.position.y * 0.3, ship.position.z - 14);
    camera.lookAt(lookTarget);

    shipLight.position.copy(ship.position);

    renderer.render(scene, camera);
  }

  rafId = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('resize', onResize);
    host.removeEventListener('pointerdown', onPointerDown);
    host.removeEventListener('pointermove', onPointerMove);
    host.removeEventListener('pointerup', onPointerUp);
    host.removeEventListener('pointercancel', onPointerUp);

    for (const ring of rings) {
      scene.remove(ring.group);
      disposeObject3D(ring.group);
    }
    rings.length = 0;

    disposeObject3D(ship);
    scene.remove(ship);
    stars.geometry.dispose();
    (stars.material as THREE.Material).dispose();
    scene.remove(stars);
    trailGeo.dispose();
    trailMat.dispose();
    scene.remove(trail);

    renderer.dispose();
    host.replaceChildren();
    host.style.position = prevPosition;
    host.style.overflow = prevOverflow;
    host.style.touchAction = prevTouchAction;
    host.style.background = '';
  };
}
