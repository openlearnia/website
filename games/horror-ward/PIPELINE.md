# Horror Ward — Pipeline & Play (Three.js)

**Route:** `/games/horror-ward`  
**Code:** `website/src/games/horror-ward/`  
**Assets:** `website/public/games/horror-ward/assets/`  
**Primary map:** Blender `assets/maps/ward7.glb` — see `BLENDER_PIPELINE.md`  
**Fallback layout:** `LAYOUT.md` + `wardMap.ts` (CELL=4 Kenney grid, only if GLB missing)

## Engine

**Three.js only** (Babylon.js removed). PointerLock FPS, FogExp2, SpotLight flashlight. Blender ward loads as one GLB; Kenney progressive tiles are fallback only.

## How to play

```bash
cd website
npm install
npm run dev
# open http://localhost:4321/games/horror-ward
```

| Input | Action |
|-------|--------|
| Click canvas | Pointer lock |
| WASD | Walk |
| Shift | Sprint (stamina) |
| Ctrl / C | Crouch (quieter) |
| Mouse | Look |
| F (locked) | Flashlight (battery drains) |
| E | Interact / hold on UPS |
| LMB | Stun pulse (costs battery) |
| 1–4 | Anya Follow / Wait / Hide / Distract |
| Esc | Pause |
| Shell F / button | Fullscreen (`attachFullscreen`) |

Screenshot helpers: `?autostart=1&safe=1&at=lobby|nurses|dayroom|sub|theater`

```bash
npm run build
```

## Fast Play

1. Title shows immediately.
2. `buildWardLevel({ fastPlay: true })` loads **lobby** phase (gz≤3: lobby + nurses + utility) first.
3. Play starts; **bay → mid → deep** stream in the background with a progress bar.
4. Collision uses authored `buildWalkable()` grid — not mesh soup.

## Layout system

Data-driven floor plan in `wardMap.ts` → `buildWardLevel()` in `level.ts`.  
Kenney `room-small` is **12×12** — centers sit **2 cells** off the corridor spine.

## Modules

| File | Role |
|------|------|
| `wardMap.ts` | Authored tile/prop/light/spawn map + load phases |
| `level.ts` | Progressive Three.js grid builder |
| `engine.ts` | WebGLRenderer + scene + camera |
| `assets.ts` | GLTFLoader + clone cache |
| `game.ts` | Story loop / endings |
| `player.ts` / `enemy.ts` / `anya.ts` | FPS + AI |
| `audio.ts` / `hud.ts` | Beds + UI |
| `lighting.ts` | Horror mood + flashlight |

## Known gaps

- Character meshes are Quaternius proxies  
- Gallery coop simplified (stair → sub → theater)  
- Touch controls deferred  
- No persistent save slot yet
