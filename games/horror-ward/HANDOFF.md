# Horror Ward — Handoff (Kenney → Blender ward)

**Date:** 2026-07-23  
**Audience:** Blender MCP sibling agent + whoever wires the GLB into Three.js  
**Status:** Gameplay/collision/quest gating shipped on Kenney grid. **Do not extend Kenney visual identity** — custom hospital GLB replaces dungeon look.

---

## Keep (logic contracts)

These APIs must survive the map swap:

### Spawns (`WARD7_MAP.spawns` / `level.spawns`)

| id | World (x,z) approx | Notes |
|----|--------------------|-------|
| `player` | `(0, 2)` | Lobby south; eye `EYE_HEIGHT=1.55` |
| `anya` | `(-8, 12)` | Nurses’ station |
| `stitcher` | `(0, 20)` | Bay approach |
| `warden` | `(8, 36)` | Day room |

Zones also: `lobby`, `nurses`, `ups`, `dayroom`, `pharmacy`, `lucid`, `sub`, `theater`, `tunnel` in `level.zones`.

### UPS interact

- Interact id: `ups`, kind: `ups`
- Position (Kenney interim): **`(6.5, 12)`** — pulled west of corridor-end curb so player can approach
- Hold **E** for **2.5s** (`game.ts` `upsHold`) → `state.flags.upsRestored = true` → calls `openBayB()`
- Reach radius: `nearestInteractable` uses **≥2.8** for `ups` (others 2.2)
- Visual crate prop `ups_crate` at `(6.35, 12)` scale `0.85`

**Blender:** Empty/origin named `ups` or marker at interact center; keep approach clear ≥1m on the walk path. Engine can keep the translucent box or hide it when GLB has a UPS mesh.

### Gate lock flags

| Interact id | kind | `blocks` | Unlock |
|-------------|------|----------|--------|
| `bay_b_gate` | `gate` | **true** until UPS | `level.setBlocker('bay_b_gate', false)` inside `openBayB()` |
| `stair_gate` | `door` | **true** until badges≥2 + lantern | `setBlocker('stair_gate', false)` on successful descend |

Flags in `state.flags`:

- `upsRestored` — UPS hold complete
- `bayBOpen` — set with UPS; opens Bay B
- Badges/docs/lantern/lucid use `requires: 'upsRestored'` — **disabled + hidden until UPS**

`openBayB()` also enables any interact with `requires === 'upsRestored' | 'bayBOpen'`.

### Collision (keep for custom map)

- `buildWallColliders()` / `Aabb2` slabs + `PLAYER_RADIUS=0.32`
- Dynamic `blockers` Map for locked gates
- `canStand(x,z)` = walk channel ∧ ¬wall ∧ ¬blocker
- `resolveMove` for slide + optional camera look-ahead back-off in `game.ts`

**Blender:** Prefer exporting collision empties or a `colliders` JSON (AABB min/max XZ) named to match rooms; or keep authored AABBs in `wardMap` until auto-bake exists.

### Quest order (LEVEL_FLOW)

`Meet Anya → Restore UPS → Bay B unlock → badges ×3 → … → stair`

Cannot collect badges / place lantern / lucid before UPS (soft + hard gate).

---

## Deferred / discard when Blender map lands

- Kenney Modular Dungeon tile placement (`TILE_FILE`, `placeTile`)
- `clinicalSkin()`, linoleum overlay plane, `WARD_SIGNS` canvas plates — **temporary hospital paint**; Blender GLB owns look
- Cool-tint lighting tweaks in `lighting.ts` — re-tune against Blender materials
- Extra hospital props on Kenney footprint (beds/cabinets) — ok to keep as pickups until Blender includes them

---

## Suggested GLB integration path

1. Drop ward GLB under `public/games/horror-ward/assets/models/environment/ward/` (e.g. `ward7.glb`)
2. In `level.ts`: load single root instead of `runPhase` Kenney tiles; keep `interacts` / blockers / spawns from map data
3. Align Blender +Y up, meters, origin so lobby ≈ `(0,0,0…4)` spine +Z
4. Name empties: `spawn_player`, `spawn_anya`, `interact_ups`, `gate_bay_b`, `gate_stair`, `sign_*` optional
5. Re-run `wardMap.check.ts` (update asserts for new coords) + `?autostart=1&at=ups&light=1&safe=1&probe=walk`

Debug: `window.__horrorWardDebug()`, `window.__horrorWalkProbe` when `?probe=walk`.

---

## Files touched this checkpoint

- `src/games/horror-ward/wardMap.ts` — UPS move, `requires`/`blocks`, openings, wall AABB builders, props
- `src/games/horror-ward/level.ts` — colliders, blockers, gated interacts, (temp) clinical skin
- `src/games/horror-ward/game.ts` — `openBayB` enables badges + clears gate; UPS/flag guards; probe
- `src/games/horror-ward/player.ts` — `resolveMove` slide
- `src/games/horror-ward/wardMap.check.ts` — UPS/gate/badge/wall asserts
- `games/horror-ward/LAYOUT.md` — collision + hospital-skin note

Proof screenshots: `.audit-screenshots/games/horror-ups-*.png`  
Walk probe: `wallClip:false`, `gatePass:false`, `canStandUps:true`, badges `enabled:false` pre-UPS.
