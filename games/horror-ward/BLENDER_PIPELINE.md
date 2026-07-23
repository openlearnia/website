# Horror Ward — Blender → Three.js pipeline

**Primary map:** `website/public/games/horror-ward/assets/maps/ward7.glb`  
**Loader:** `website/src/games/horror-ward/blenderWard.ts` → `level.ts`  
**Authoring:** Blender MCP (`user-blender` / `execute_blender_code`)

Kenney Modular Dungeon remains a **fallback only** if the GLB fails to load.

## Units & axes

| Concern | Convention |
|--------|------------|
| Units | **Meters** (1 Blender unit = 1 m = 1 Three.js unit) |
| Up | **Y-up** in Three.js / glTF (`export_yup=True`) |
| Forward | Ward spine runs **+Z** (lobby south → tunnel north) |
| Floor | Walkable plane at **Y ≈ 0** |
| Eye | `EYE_HEIGHT = 1.55` (`wardMap.ts`) |

### Blender placement helper

Blender is Z-up. When scripting geometry for this game, convert Three coords:

```python
# Three (x, y, z) → Blender (x, -z, y)
def T(x, y, z):
    return Vector((x, -z, y))
```

Object **scale** when using unit cubes: Blender `(sx, sz, sy)` for Three size `(sx, sy, sz)`.

Apply scale before export (`transform_apply(scale=True)`).

## Object naming (required)

| Prefix | Role | Runtime |
|--------|------|---------|
| `Floor_*` | Visible linoleum / floors | Rendered |
| `Wall_*` | Visible walls | Rendered |
| `Ceil_*` | Optional ceilings | Rendered |
| `Door_*` | Door meshes | Rendered; hidden when gate unlocked |
| `Prop_*` | Beds, desks, UPS, furniture | Rendered |
| `Col_*` | Collision boxes (walls/props/gates) | **Hidden**; AABB → movement |
| `Spawn_*` | Empties: `Spawn_Player`, `Spawn_Anya`, … | Hidden; spawn positions |
| `Interact_*` | Empties: `Interact_UPS`, … | Hidden; snap interact volumes |
| `Checkpoint_*` | Empties: `Checkpoint_CP01`, … | Hidden |

### Collision rules

- Every solid wall / prop that should block the player needs a matching `Col_*` mesh (slightly thicker than visual is fine).
- Gate/door collision that unlocks mid-game:
  - `Col_Door_BayB_Gate` → blocker id `bay_b_gate`
  - `Col_Door_Stair` → blocker id `stair_gate`
- Flat floor slabs are ignored for AABB (height &lt; 0.35 m).
- With Blender map active, movement uses **Col_* AABBs only** (no Kenney walk-channel).

### Interact empty → game id

| Empty | Interact id |
|-------|-------------|
| `Interact_UPS` | `ups` |
| `Interact_AnyaMeet` | `anya_meet` |
| `Interact_BayB_Gate` | `bay_b_gate` |
| `Interact_Badge1` / `2` / `3` | `badge_1` / `2` / `3` |
| `Interact_Doc` | `doc_shift` |
| `Interact_Lantern` | `lantern` |
| `Interact_Lucid` | `lucid` |
| `Interact_Stair` | `stair_gate` |
| `Interact_Wristband` | `wristband` |
| `Interact_Exit` | `exit_tunnel` |

Labels / kinds / quest `requires` still live in `wardMap.ts` `interacts[]`; empties only override **x/z**.

## Materials (clinical / horror-dim)

Keep cool hospital palette — avoid Kenney stone colormap:

- Floors: muted green-gray linoleum (~`#6b7a73`) + optional center stripe (`Prop_FloorStripe_*`)
- Walls: cool plaster white/green (~`#c7d6db`) + baseboards / panels / frosted niches
- Ceilings: **required** (`Ceil_*`) with slight emissive — hemi ground is near-black, so zero-emit ceilings read as void
- Fixtures: recessed troffers (`Prop_Fixture_*_House/Diff/Edge`), not free-floating strips in open air
- Trim / metal: dark teal-gray
- UPS: dark clinical green with slight emission
- Cove / emergency: green emissive along wall–ceiling seam

Horror mood still comes from Three.js `FogExp2` + flashlight (`lighting.ts`). Dress script: `blender/dress_ward7_hospital.py`.

Audit screenshots: scroll `#game-shell` into view (and prefer fullscreen) before capturing — never crop the marketing header over half the canvas.

## Export (Blender MCP)

```python
import bpy
bpy.ops.export_scene.gltf(
    filepath=".../website/public/games/horror-ward/assets/maps/ward7.glb",
    use_selection=True,          # MESH + EMPTY
    export_format="GLB",
    export_yup=True,
    export_apply=True,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
)
```

Include `Col_*` meshes in the selection (unhide before export). Do **not** export scene lights/cameras — game owns lighting.

Optional separate collision file is unused for now; keep Col_* inside the same GLB.

## Three.js load path

1. `buildWardLevel()` calls `loadBlenderWard()`.
2. On success: add GLB under `ward7` root, hide `Col_*` / markers, build wall AABBs, place signs + interact boxes, add map lights.
3. On failure (`Col_*` count too low / 404): log warning and build Kenney modular dungeon (legacy).

Force Kenney for debug: `buildWardLevel(scene, { forceKenney: true })`.

## Edit workflow

1. Open / recreate scene in Blender via MCP `execute_blender_code`.
2. Keep world meters aligned with existing `wardMap` spawn/interact coords when possible.
3. Screenshot with `get_viewport_screenshot`.
4. Re-export `ward7.glb` over the same public path.
5. Hard-refresh `/games/horror-ward` (Vite serves `public/`).

## Self-check

```bash
cd website
node --input-type=module -e "
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { readFileSync } from 'fs';
import { Vector3 } from 'three';
const buf = readFileSync('public/games/horror-ward/assets/maps/ward7.glb');
new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset+buf.byteLength), '', (g) => {
  let cols=0, spawn;
  g.scene.traverse(o => {
    if (o.name.startsWith('Col_')) cols++;
    if (o.name.startsWith('Spawn_Player')) spawn = o.getWorldPosition(new Vector3());
  });
  console.log({ cols, spawn });
});
"
npx --yes tsx src/games/horror-ward/wardMap.check.ts
```

Expected: `cols >= 40`, `Spawn_Player ≈ (0, 0, 2)`.
