import Phaser from 'phaser';

const W = 800;
const H = 560;
const BRICK_COLORS = [0xf28b82, 0xf5a623, 0x3dd68c, 0x6ea8fe, 0xc084fc];

type PowerKind = 'multi' | 'wide' | 'slow';

interface BrickData {
  hp: number;
  points: number;
  color: number;
}

function makeTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('ball')) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  g.fillStyle(0xe8eaed, 1);
  g.fillCircle(10, 10, 10);
  g.fillStyle(0x6ea8fe, 0.55);
  g.fillCircle(10, 10, 6);
  g.generateTexture('ball', 20, 20);
  g.clear();

  g.fillStyle(0x6ea8fe, 1);
  g.fillRoundedRect(0, 0, 120, 18, 9);
  g.fillStyle(0xe8eaed, 0.35);
  g.fillRoundedRect(8, 3, 104, 6, 3);
  g.generateTexture('paddle', 120, 18);
  g.clear();

  for (const color of BRICK_COLORS) {
    const key = `brick-${color.toString(16)}`;
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, 72, 28, 6);
    g.fillStyle(0xffffff, 0.18);
    g.fillRoundedRect(4, 3, 64, 8, 3);
    g.lineStyle(2, 0x0f1117, 0.35);
    g.strokeRoundedRect(1, 1, 70, 26, 5);
    g.generateTexture(key, 72, 28);
    g.clear();
  }

  g.fillStyle(0xf5a623, 1);
  g.fillCircle(12, 12, 12);
  g.fillStyle(0x0f1117, 1);
  g.fillCircle(12, 12, 5);
  g.generateTexture('power', 24, 24);
  g.destroy();
}

type HostApi = {
  onGameOver: (score: number) => void;
};

let hostApi: HostApi | null = null;

class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }
  create() {
    makeTextures(this);
    this.scene.start('play');
  }
}

class PlayScene extends Phaser.Scene {
  private paddle!: Phaser.Physics.Arcade.Image;
  private balls!: Phaser.Physics.Arcade.Group;
  private bricks!: Phaser.Physics.Arcade.StaticGroup;
  private powers!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private score = 0;
  private lives = 3;
  private level = 1;
  private bricksLeft = 0;
  private ballLaunched = false;
  private wideUntil = 0;
  private slowUntil = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private pointerDragging = false;
  private ended = false;

  constructor() {
    super('play');
  }

  create() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.ballLaunched = false;
    this.wideUntil = 0;
    this.slowUntil = 0;
    this.ended = false;

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x0b1220).setOrigin(0);
    this.add.circle(width * 0.15, 120, 160, 0x6ea8fe, 0.07);
    this.add.circle(width * 0.9, 200, 180, 0xc084fc, 0.06);
    this.add.circle(width * 0.5, height * 0.85, 200, 0x3dd68c, 0.04);

    for (let i = 0; i < 60; i++) {
      this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.FloatBetween(0.5, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.1, 0.45),
      );
    }

    this.physics.world.setBounds(0, 0, width, height, true, true, true, false);

    this.paddle = this.physics.add.image(width / 2, height - 48, 'paddle');
    this.paddle.setImmovable(true);
    this.paddle.body!.allowGravity = false;
    this.paddle.setCollideWorldBounds(true);

    this.balls = this.physics.add.group({
      bounceX: 1,
      bounceY: 1,
      maxVelocityX: 520,
      maxVelocityY: 520,
    });
    this.bricks = this.physics.add.staticGroup();
    this.powers = this.physics.add.group();

    this.particles = this.add.particles(0, 0, 'ball', {
      speed: { min: 50, max: 180 },
      scale: { start: 0.5, end: 0 },
      lifespan: 480,
      tint: [0x6ea8fe, 0x3dd68c, 0xc084fc, 0xf5a623],
      emitting: false,
      blendMode: 'ADD',
    });

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyA = this.input.keyboard!.addKey('A');
    this.keyD = this.input.keyboard!.addKey('D');

    this.scoreText = this.add
      .text(16, 12, 'Score 0', {
        fontFamily: 'Sora, Segoe UI, sans-serif',
        fontSize: '18px',
        color: '#e8eaed',
      })
      .setDepth(10);
    this.livesText = this.add
      .text(width - 16, 12, 'Lives 3', {
        fontFamily: 'Sora, Segoe UI, sans-serif',
        fontSize: '18px',
        color: '#e8eaed',
      })
      .setOrigin(1, 0)
      .setDepth(10);
    this.hintText = this.add
      .text(width / 2, height - 86, 'Space / tap to launch', {
        fontFamily: 'Source Sans 3, Segoe UI, sans-serif',
        fontSize: '16px',
        color: '#9aa0a6',
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.spawnBall(true);
    this.buildLevel();

    this.physics.add.collider(this.balls, this.paddle, this.onBallPaddle, undefined, this);
    this.physics.add.collider(this.balls, this.bricks, this.onBallBrick, undefined, this);
    this.physics.add.overlap(this.paddle, this.powers, this.onPowerCatch, undefined, this);

    this.input.keyboard!.on('keydown-SPACE', this.tryLaunch, this);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.pointerDragging = true;
      this.movePaddleTo(p.x);
      this.tryLaunch();
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.pointerDragging || p.isDown) this.movePaddleTo(p.x);
    });
    this.input.on('pointerup', () => {
      this.pointerDragging = false;
    });
  }

  private spawnBall(attach: boolean) {
    const ball = this.balls.create(this.paddle.x, this.paddle.y - 22, 'ball') as Phaser.Physics.Arcade.Image;
    ball.setCircle(10);
    ball.setBounce(1);
    ball.setCollideWorldBounds(true);
    ball.setData('attached', attach);
    if (attach) {
      ball.setVelocity(0, 0);
      this.ballLaunched = false;
      this.hintText?.setVisible(true);
    }
    return ball;
  }

  private buildLevel() {
    this.bricks.clear(true, true);
    const cols = 9;
    const rows = Math.min(3 + this.level, 7);
    const gap = 8;
    const brickW = 72;
    const brickH = 28;
    const totalW = cols * brickW + (cols - 1) * gap;
    const startX = (this.scale.width - totalW) / 2 + brickW / 2;
    const startY = 72;

    this.bricksLeft = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = BRICK_COLORS[(r + c) % BRICK_COLORS.length];
        const key = `brick-${color.toString(16)}`;
        const x = startX + c * (brickW + gap);
        const y = startY + r * (brickH + gap);
        const brick = this.bricks.create(x, y, key) as Phaser.Physics.Arcade.Image;
        const hp = r < 2 && this.level > 1 ? 2 : 1;
        brick.setData('meta', { hp, points: 10 * hp + this.level * 2, color } satisfies BrickData);
        brick.refreshBody();
        this.bricksLeft += 1;
      }
    }
  }

  private movePaddleTo(x: number) {
    const half = (this.paddle.displayWidth || 120) / 2;
    this.paddle.x = Phaser.Math.Clamp(x, half, this.scale.width - half);
  }

  private tryLaunch() {
    if (this.ballLaunched || this.ended) return;
    const attached = this.balls.getChildren().find((b) => (b as Phaser.Physics.Arcade.Image).getData('attached'));
    if (!attached) return;
    const ball = attached as Phaser.Physics.Arcade.Image;
    ball.setData('attached', false);
    const speed = this.time.now < this.slowUntil ? 260 : 340;
    const angle = Phaser.Math.DegToRad(Phaser.Math.Between(-55, -125));
    ball.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.ballLaunched = true;
    this.hintText.setVisible(false);
  }

  private onBallPaddle(
    ballObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    paddleObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ) {
    const ball = ballObj as Phaser.Physics.Arcade.Image;
    const paddle = paddleObj as Phaser.Physics.Arcade.Image;
    const rel = (ball.x - paddle.x) / (paddle.displayWidth / 2);
    const angle = Phaser.Math.DegToRad(-90 + rel * 55);
    const speed = Math.max(300, Math.hypot(ball.body!.velocity.x, ball.body!.velocity.y));
    const mul = this.time.now < this.slowUntil ? 0.85 : 1;
    ball.setVelocity(Math.cos(angle) * speed * mul, Math.sin(angle) * speed * mul);
  }

  private onBallBrick(
    _ballObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    brickObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ) {
    const brick = brickObj as Phaser.Physics.Arcade.Image;
    const meta = brick.getData('meta') as BrickData;
    meta.hp -= 1;
    this.particles.emitParticleAt(brick.x, brick.y, 12);

    if (meta.hp <= 0) {
      this.score += meta.points;
      this.scoreText.setText(`Score ${this.score}`);
      if (Math.random() < 0.2) this.dropPower(brick.x, brick.y);
      brick.destroy();
      this.bricksLeft -= 1;
      if (this.bricksLeft <= 0) this.nextLevel();
    } else {
      brick.setTint(0xffffff);
      this.time.delayedCall(80, () => brick.clearTint());
      brick.setData('meta', meta);
    }
  }

  private dropPower(x: number, y: number) {
    const kinds: PowerKind[] = ['multi', 'wide', 'slow'];
    const kind = Phaser.Utils.Array.GetRandom(kinds);
    const p = this.powers.create(x, y, 'power') as Phaser.Physics.Arcade.Image;
    p.setData('kind', kind);
    p.setVelocity(0, 130);
    p.setTint(kind === 'multi' ? 0xc084fc : kind === 'wide' ? 0x6ea8fe : 0x3dd68c);
  }

  private onPowerCatch(
    _paddle: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    powerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ) {
    const power = powerObj as Phaser.Physics.Arcade.Image;
    const kind = power.getData('kind') as PowerKind;
    power.destroy();
    if (kind === 'multi') {
      const base = this.balls.getChildren()[0] as Phaser.Physics.Arcade.Image | undefined;
      if (!base) return;
      for (let i = 0; i < 2; i++) {
        const b = this.spawnBall(false);
        b.setPosition(base.x, base.y);
        b.setVelocity(Phaser.Math.Between(-220, 220), -Phaser.Math.Between(260, 360));
        this.ballLaunched = true;
      }
    } else if (kind === 'wide') {
      this.wideUntil = this.time.now + 8000;
      this.paddle.setScale(1.55, 1);
      this.paddle.body!.updateFromGameObject();
    } else {
      this.slowUntil = this.time.now + 7000;
      this.balls.getChildren().forEach((obj) => {
        const b = obj as Phaser.Physics.Arcade.Image;
        b.setVelocity(b.body!.velocity.x * 0.7, b.body!.velocity.y * 0.7);
      });
    }
  }

  private nextLevel() {
    this.level += 1;
    this.balls.clear(true, true);
    this.powers.clear(true, true);
    this.spawnBall(true);
    this.buildLevel();
    const banner = this.add
      .text(this.scale.width / 2, this.scale.height / 2, `Level ${this.level}`, {
        fontFamily: 'Sora, Segoe UI, sans-serif',
        fontSize: '36px',
        color: '#6ea8fe',
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.tweens.add({
      targets: banner,
      alpha: 0,
      y: banner.y - 40,
      duration: 900,
      onComplete: () => banner.destroy(),
    });
  }

  private loseLife() {
    if (this.ended) return;
    this.lives -= 1;
    this.livesText.setText(`Lives ${this.lives}`);
    this.balls.clear(true, true);
    this.powers.clear(true, true);
    if (this.lives <= 0) {
      this.ended = true;
      hostApi?.onGameOver(this.score);
      return;
    }
    this.spawnBall(true);
  }

  update() {
    if (this.ended) return;

    if (this.time.now > this.wideUntil && this.paddle.scaleX !== 1) {
      this.paddle.setScale(1, 1);
      this.paddle.body!.updateFromGameObject();
    }

    let dir = 0;
    if (this.cursors.left?.isDown || this.keyA.isDown) dir -= 1;
    if (this.cursors.right?.isDown || this.keyD.isDown) dir += 1;
    if (dir !== 0) this.movePaddleTo(this.paddle.x + dir * 9);

    this.balls.getChildren().forEach((obj) => {
      const ball = obj as Phaser.Physics.Arcade.Image;
      if (ball.getData('attached')) {
        ball.x = this.paddle.x;
        ball.y = this.paddle.y - 22;
        return;
      }
      if (ball.y > this.scale.height + 20) ball.destroy();
    });

    if (this.ballLaunched && this.balls.countActive(true) === 0) this.loseLife();

    this.powers.getChildren().forEach((obj) => {
      const p = obj as Phaser.Physics.Arcade.Image;
      if (p.y > this.scale.height + 30) p.destroy();
    });
  }
}

function panelStyle(): string {
  return [
    'background:rgba(15,17,23,0.92)',
    'border:1px solid #2a2f3a',
    'border-radius:14px',
    'padding:28px 32px',
    'text-align:center',
    'max-width:min(92%,420px)',
    'box-shadow:0 18px 48px rgba(0,0,0,0.45)',
  ].join(';');
}

function buttonEl(label: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = label;
  btn.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'justify-content:center',
    'min-height:44px',
    'padding:0 28px',
    'margin-top:18px',
    'border:none',
    'border-radius:10px',
    'background:#6ea8fe',
    'color:#0f1117',
    'font:600 16px/1.2 inherit',
    'cursor:pointer',
  ].join(';');
  return btn;
}

function buildStartPanel(playBtn: HTMLButtonElement): HTMLDivElement {
  const startPanel = document.createElement('div');
  startPanel.style.cssText = panelStyle();

  const swatches = document.createElement('div');
  swatches.style.cssText = 'display:flex;justify-content:center;gap:8px;margin-bottom:16px;';
  for (const c of BRICK_COLORS) {
    const s = document.createElement('span');
    s.style.cssText = `width:36px;height:14px;border-radius:4px;background:#${c.toString(16).padStart(6, '0')};display:inline-block;`;
    swatches.appendChild(s);
  }

  const title = document.createElement('h1');
  title.textContent = 'Cosmic Breaker';
  title.style.cssText =
    'margin:0 0 8px;font-size:clamp(28px,5vw,40px);font-weight:700;color:#e8eaed;letter-spacing:0.02em;';

  const sub = document.createElement('p');
  sub.textContent = 'Smash neon crystals · catch power-ups · survive';
  sub.style.cssText = 'margin:0;color:#9aa0a6;font-size:15px;line-height:1.5;';

  const hint = document.createElement('p');
  hint.textContent = '← → / A D or drag · Space / tap to launch';
  hint.style.cssText = 'margin:14px 0 0;color:#9aa0a6;font-size:13px;';

  startPanel.append(swatches, title, sub, hint, playBtn);
  return startPanel;
}

export function mountCosmicBreaker(host: HTMLElement): () => void {
  host.replaceChildren();
  host.style.position = 'relative';
  host.style.overflow = 'hidden';
  host.style.background = '#0b1220';
  host.style.touchAction = 'none';

  const canvasWrap = document.createElement('div');
  canvasWrap.style.cssText = 'position:absolute;inset:0;';
  host.appendChild(canvasWrap);

  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:5;pointer-events:auto;background:radial-gradient(ellipse at center,rgba(11,18,32,0.55),rgba(11,18,32,0.82));';
  host.appendChild(overlay);

  const playBtn = buttonEl('Play');
  const startPanel = buildStartPanel(playBtn);
  overlay.appendChild(startPanel);

  const overPanel = document.createElement('div');
  overPanel.style.cssText = panelStyle();
  overPanel.style.display = 'none';
  const overTitle = document.createElement('h2');
  overTitle.textContent = 'Game Over';
  overTitle.style.cssText = 'margin:0 0 8px;font-size:32px;color:#f28b82;font-weight:700;';
  const overScore = document.createElement('p');
  overScore.style.cssText = 'margin:0;font-size:20px;color:#e8eaed;';
  const restartBtn = buttonEl('Play Again');
  overPanel.append(overTitle, overScore, restartBtn);

  let game: Phaser.Game | null = null;
  let showingOver = false;

  const startGame = () => {
    showingOver = false;
    overlay.style.display = 'none';
    overPanel.style.display = 'none';
    if (game) {
      game.destroy(true);
      game = null;
      canvasWrap.replaceChildren();
    }
    hostApi = {
      onGameOver: (score) => {
        showingOver = true;
        overScore.textContent = `Score ${score}`;
        overlay.replaceChildren(overPanel);
        overPanel.style.display = 'block';
        overlay.style.display = 'flex';
      },
    };
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: canvasWrap,
      width: W,
      height: H,
      backgroundColor: '#0b1220',
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: W,
        height: H,
      },
      scene: [BootScene, PlayScene],
      audio: { noAudio: true },
    });
  };

  playBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', () => {
    overlay.replaceChildren(startPanel);
    startGame();
  });

  const onKey = (e: KeyboardEvent) => {
    if (overlay.style.display === 'none') return;
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      if (showingOver) {
        overlay.replaceChildren(startPanel);
        startGame();
      } else {
        startGame();
      }
    }
  };
  const refreshScale = () => {
    game?.scale.refresh();
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', refreshScale);
  host.addEventListener('game:resize', refreshScale);

  return () => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', refreshScale);
    host.removeEventListener('game:resize', refreshScale);
    hostApi = null;
    game?.destroy(true);
    host.replaceChildren();
  };
}
