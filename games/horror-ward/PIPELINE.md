# Horror Ward — Rendering Pipeline (Phase 2)

**Route:** `/games/horror-ward`  
**Code:** `website/src/games/horror-ward/`  
**Assets:** `website/public/games/horror-ward/assets/` (`ASSET_INDEX.json`)

This phase makes the Babylon.js **engine + lighting + loader + smoke walk** solid so Phase 3 can implement story/AI without fighting bootstrap.

---

## How to run

```bash
cd website
npm install
npm run dev
# open http://localhost:4321/games/horror-ward
```

Smoke controls (after **Enter Ward 7**):

| Input | Action |
|-------|--------|
| Click canvas | Pointer lock |
| WASD / arrows | Walk |
| Shift | Sprint |
| Mouse | Look |
| **F** (while locked) | Toggle flashlight |
| Esc | Release pointer |
| Shell **F** / button | Fullscreen (`src/games/fullscreen.ts`) |

```bash
npm run build   # must pass
```

---

## What’s ready

| Piece | Path | Notes |
|-------|------|-------|
| Engine + scene factory | `engine.ts` | `preserveDrawingBuffer` for screenshots |
| Horror lighting | `lighting.ts` | Exp fog Act I, green strip + warm safe PointLights, SpotLight flashlight helper, GlowLayer |
| Shadows | `lighting.ts` | **Flashlight-only** `ShadowGenerator` @ 512 + blur — web-safe; not full cascades |
| Post mood | `postprocess.ts` | ACES, underexposure, vignette, light bloom, grain |
| Asset loader | `assets.ts` | Reads `ASSET_INDEX.json`, `SceneLoader` GLB/GLTF, placeholders on miss/FBX |
| FPS capsule | `player.ts` | Collisions + camera + flashlight mount |
| Greybox smoke | `smokeScene.ts` | Modular dungeon pieces + Stitcher proxy + lamp + walk |
| Astro mount | `[slug].astro` + `main.ts` | Fullscreen shell reused |
| Attribution | `public/games/horror-ward/assets/ATTRIBUTION.md` | Free/CC0 (+ CC-BY footsteps) |

### Lighting argument (recorded)

Hard directional cascades would read “premium horror,” but they tax integrated GPUs and fight our limited-light design. Opponent claim: “no shadows = flat void.” Compromise: **one flashlight shadow map (512)** so silhouettes pop when you aim the beam, without a cascade farm. Quality presets can raise map size in Phase 3.

---

## Kenney FBX → GLB

**Runtime loads GLB/GLTF only.** Kenney animated FBX under `assets/models/player/kenney-animated/` is **source reference** for Phase 3 locomotion retarget — not imported by the browser loader.

Conversion options (when needed):

```bash
# If Blender is installed:
blender --background --python-expr "
import bpy
bpy.ops.wm.fbx_import(filepath='idle.fbx')
bpy.ops.export_scene.gltf(filepath='idle.glb', export_format='GLB')
"

# Or gltf-pipeline / gltf-transform after an FBX→glTF step:
npx @gltf-transform/cli copy idle.gltf idle.glb
```

Smoke test uses capsule + Quaternius GLB proxies — **no FBX conversion required for Phase 2**.

---

## Deferred to Phase 3

- Story acts / LEVEL_FLOW scenes (S02+)
- Ally Anya AI (FOLLOW/WAIT/HIDE/LEAD/DISTRACT) + trust
- Enemy AI (Stitcher / Warden / Echo) senses & chase
- Inventory, badges, UPS, journal UI
- Battery drain, stun pulse, decoys
- Dedicated FPS arms mesh, true flashlight mesh
- FBX→GLB anim packs + retarget
- Audio bed wiring (files exist; not hooked in smoke)
- Endings A–D

---

## Screenshot proof

After visual iteration, store under repo root:

`.audit-screenshots/games/horror-pipeline-*.png`

Expected mood: underexposed greens/cyan accents, readable flashlight cone, **not** bright default Babylon grey.
