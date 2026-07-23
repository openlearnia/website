# Horror Ward — Asset Attribution

All third-party assets below are **CC0** unless noted. Credit is appreciated even when not required.

Runtime path root: `website/public/games/horror-ward/assets/`

---

## 3D models

### Kenney — Modular Dungeon Kit 2.0 (CC0)
- **Author:** Kenney ([kenney.nl](https://kenney.nl))
- **Source:** https://opengameart.org/content/modular-dungeon-kit (mirror of https://kenney.nl/assets/modular-dungeon-kit)
- **License:** [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- **Files used:** `models/environment/dungeon/*.glb`, `colormap.png`

### Kenney — Castle Kit (CC0)
- **Author:** Kenney
- **Source:** https://opengameart.org/content/castle-kit · https://kenney.nl/assets/castle-kit
- **License:** CC0 1.0
- **Files used:** `models/props/door.glb`, `metal-gate.glb`, `rocks-*.glb`, `castle-colormap.png`

### Kenney — Furniture Kit (CC0)
- **Author:** Kenney
- **Source:** https://kenney.nl/assets/furniture-kit (`kenney_furniture-kit.zip`)
- **License:** CC0 1.0
- **Files used:** `models/props/furniture/*.glb`, `flashlight-adjacent-lamp.glb`, `wall-lamp.glb`, debris boxes, trashcan

### Kenney — Animated Characters 1 (CC0)
- **Author:** Kenney
- **Source:** https://opengameart.org/content/animated-characters-1
- **License:** CC0 1.0
- **Files used:** `models/player/kenney-animated/*` (FBX + skins; convert to GLB in Phase 2)

### Quaternius — Ultimate Monsters Bundle (CC0)
- **Author:** Quaternius ([quaternius.com](https://quaternius.com))
- **Source:** https://poly.pizza/bundle/Ultimate-Monsters-Bundle-5oyGWAmOB6 · https://quaternius.com/packs/ultimatemonsters.html
- **License:** CC0 1.0
- **Files used:** `models/enemies/{ghost,ghost-skull,demon,blue-demon}.glb`, `models/ally/{tribal,wizard}.glb`, `models/chars/*-proxy-*.glb`

### Quaternius — Ultimate Space Kit (CC0)
- **Author:** Quaternius
- **Source:** https://poly.pizza/bundle/Ultimate-Space-Kit-YWh743lqGX
- **License:** CC0 1.0
- **Files used:** `models/player/astronaut.glb`, `models/ally/astronaut-variant.glb`, `models/chars/warden-proxy-astronaut.glb`, `models/enemies/enemy-*.glb`, `models/props/{key-card,crate,emissive-light,antenna,pickup-thunder}.glb`

### Quaternius — Ultimate RPG Items Bundle (CC0)
- **Author:** Quaternius
- **Source:** https://poly.pizza/bundle/Ultimate-RPG-Items-Bundle-h8mhlZ0dG8
- **License:** CC0 1.0
- **Files used:** `models/props/{key,key-ornate,padlock,skull,chest}.glb`

### KayKit — Furniture Bits 1.0 (CC0)
- **Author:** Kay Lousberg ([kaylousberg.com](https://www.kaylousberg.com))
- **Source:** https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0
- **License:** CC0 1.0
- **Files used:** `models/props/kaykit/*`

---

## Textures & HDR

### Poly Haven (CC0)
- **Author:** Poly Haven contributors
- **Source:** https://polyhaven.com
- **License:** CC0 1.0
- **Files used:**
  - `textures/concrete/*` ← `concrete_floor_painted`
  - `textures/concrete_floor/*` ← `concrete_floor`
  - `textures/metal/*` ← `metal_plate`
  - `textures/rusty_metal/*` ← `rusty_metal_02`
  - `textures/rusty_painted_metal/*` ← `rusty_painted_metal`
  - `textures/peeling_painted_wall/*` ← `peeling_painted_wall`
  - `textures/tiles/*` ← `blue_floor_tiles_01`
  - `textures/tiles_brown/*` ← `brown_floor_tiles`
  - `textures/plaster/*` ← `painted_plaster_wall`
  - `env/studio_small_09_1k.hdr` ← HDRI `studio_small_09`

### Project-authored emissive plates
- **Author:** Openlearnia (procedural)
- **License:** Project / MIT (website)
- **Files used:** `textures/emissive/{exit_strip_emissive,warning_strip_emissive,blood_stain_sparse}.png`

---

## Audio

### rubberduck — 100 CC0 metal and wood SFX (CC0)
- **Source:** https://opengameart.org/content/100-cc0-metal-and-wood-sfx
- **Files used:** `audio/sfx/{door-open,metal-door-*,keys-jingle,lock-open,wood-squeak}.ogg`

### rubberduck — 100 CC0 SFX #2 (CC0)
- **Source:** https://opengameart.org/content/100-cc0-sfx-2
- **Files used:** `audio/sfx/{door-creak-0*,footstep-*,sting-hit-*,ambient-drone-loop-*,chase-cue-thunder}.ogg`

### congusbongus — Footsteps on different surfaces (CC-BY 3.0)
- **Author:** congusbongus (assembled from Freesound; see pack text files for per-clip credits)
- **Source:** https://opengameart.org/content/footsteps-on-different-surfaces
- **License:** [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) — **attribution required**
- **Files used:** `audio/sfx/footstep-metal-*.ogg`, `footstep-cloth-01.ogg`

### qubodup — Door Open / Door Close Set (CC0)
- **Author:** qubodup
- **Source:** https://opengameart.org/content/door-open-door-close-set
- **License:** CC0 1.0 (credit “qubodup” appreciated per pack notes)
- **Files used:** `audio/sfx/door-creak-heavy-*.ogg`

### Neostead — Breathing (CC0)
- **Author:** Neostead
- **Source:** https://opengameart.org/content/breathing
- **License:** CC0 1.0
- **Files used:** `audio/sfx/breath.mp3`

### congusbongus — Ancient caverns (horror ambient loop) (CC0)
- **Source:** https://opengameart.org/content/ancient-caverns-horror-ambient-loop
- **Files used:** `audio/music/ambient-ancient-caverns.ogg`

### Joth — The Surreal Truth / Ambience Pack 1 Sci-Fi Horror (CC0)
- **Source:** https://opengameart.org/content/ambience-pack-1-sci-fi-horror
- **Files used:** `audio/music/ambient-sci-fi-horror.mp3`

---

## Intentional placeholders (documented)

| Slot | Approach |
|------|----------|
| FPS arms (`CHR-PLAYER-ARMS`) | Capsule + camera + SpotLight; see `models/player/FPS_PLACEHOLDER.md` |
| Dedicated flashlight mesh (`PROP-FLASHLIGHT`) | Use `flashlight-adjacent-lamp.glb` + SpotLight; swap dedicated mesh in Phase 2 |
| Story-accurate Anya / Stitcher / Warden / Echo | Proxy GLBs under `models/chars/*`; retarget or replace in Phase 2 |

Hospital corridor kit is **modular dungeon** (horror-capable greybox), not a literal Kenney Hospital pack (none free at gather time).
