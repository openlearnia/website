# Horror Ward — Layout Convention

**Engine:** Three.js  
**Cell:** `CELL = 4` (Kenney corridor footprint)  
**Lift:** `DUNGEON_Y = 1` (kit floor at local y=-1)

## Skills applied

- **game-engine** — tilemap/logic grid, data-driven levels, Three.js scene/camera/renderer, progressive startup  
- **building-ui** — DOM HUD (loading, title, objectives) only; no in-canvas UI chrome

## Floor plan (spine +Z)

| Phase | gz | Rooms |
|-------|----|-------|
| lobby | 0–3 | Lobby corridor, nurses room (−2,3), utility east |
| bay | 4–8 | Bay B + patient alcoves |
| mid | 9–14 | Dayroom, pharmacy, lucid, stairs |
| deep | 15+ | Sub, gallery, theater, tunnel |

`room-small` is **12×12** — center at `gx=±2` so edges kiss the junction (do **not** place like a 4×4 tile).

## Walkable grid

`buildWalkable()` expands each tile into `"gx,gz"` cells. Player/enemy movement rejects non-walkable world positions.

## No scatter

All props/lights/spawns/interacts are authored meters in `WARD7_MAP` — never `Math.random`.
