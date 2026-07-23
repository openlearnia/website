# Horror Ward — Layout Convention

**Engine:** Three.js  
**Cell:** `CELL = 4` (Kenney corridor footprint)  
**Lift:** `DUNGEON_Y = 0` (kit floor top at world y≈0; eye `EYE_HEIGHT = 1.55`)

## Kenney corridor axis (do not regress)

Raycast-verified openings:

| Piece | rot 0 | rot 90 |
|-------|-------|--------|
| `corridor` | open ±X (EW) | open ±Z (NS) ← **spine** |
| `corridor-end` | open +X | open −Z; **270** opens +Z |
| `corridor-junction` | T (blocked +Z) | T (blocked +X); **270** blocked −X |
| `corridor-intersection` | 4-way | 4-way |

Spine tiles (`gx === 0`, non-room) must use NS-open rotations. EW spurs use rot 0 / end 0|180. Wrong rot lays wall slabs **across** the walk path.

`WALK_RADIUS = 1.25` keeps the capsule inside wall faces (~1.4 from cell center). **Also:** `buildWallColliders()` emits AABB slabs on closed Kenney edges (`WALL_INSET = 1.32`, `PLAYER_RADIUS = 0.32`). Locked `blocks: true` interacts (Bay B gate, stair) add temporary blockers cleared on unlock.

## Hospital skin (stuck with dungeon kit)

Kenney Modular Dungeon meshes stay for structure (no hospital modular pack yet). `clinicalSkin()` in `level.ts` recolors floors → linoleum grey-green and walls → cool plaster; corridor strips use `cool` fluorescent lights; `WARD_SIGNS` labels lobby / nurses / utility UPS / Bay B / day room / pharmacy / stairwell. Props prefer beds, desks, cabinets, sinks, plants over crates/skulls.

## Skills applied

- **game-engine** — tilemap/logic grid, data-driven levels, Three.js scene/camera/renderer, progressive startup  
- **threejs-fundamentals** — Y-up, Object3D yaw for tile facing  
- **building-ui** — DOM HUD only; no in-canvas UI chrome

## Floor plan (spine +Z)

| Phase | gz | Rooms |
|-------|----|-------|
| lobby | 0–3 | Lobby corridor, nurses room (−2,3), utility east |
| bay | 4–8 | Bay B + patient alcoves |
| mid | 9–14 | Dayroom, pharmacy, lucid, stairs |
| deep | 15+ | Sub, gallery, theater, tunnel |

`room-small` is **12×12** — center at `gx=±2` so edges kiss the junction (do **not** place like a 4×4 tile).

## Walkable grid

`buildWalkable()` expands each tile into `"gx,gz"` cells. `canStand` requires a walk channel **and** no wall/blocker AABB hit so you cannot clip through corridor walls or locked gates.

## No scatter

All props/lights/spawns/interacts are authored meters in `WARD7_MAP` — never `Math.random`.
