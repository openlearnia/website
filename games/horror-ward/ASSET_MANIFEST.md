# Horror Ward — Asset Manifest

**Purpose:** Spec slots for the parallel asset-gathering agent. Prefer **CC0 / clearly free-for-commercial** sources. Do **not** block on perfect art — greybox proxies OK for Phase 3 boot.

**Drop path (when acquired):** `website/public/games/horror-ward/assets/`  
**Attribution log:** append to `website/public/games/ATTRIBUTION.md` (or `horror-ward/ATTRIBUTION.md` if split).

**Preferred source sites:** [Kenney.nl](https://kenney.nl) · [OpenGameArt](https://opengameart.org) · [Poly Pizza](https://poly.pizza) · [Quaternius](https://quaternius.com) · [Sketchfab](https://sketchfab.com) (filter CC0) · [Freesound](https://freesound.org) (CC0) · [Poly Haven](https://polyhaven.com) (HDR/textures CC0)

**Formats:** glTF/GLB preferred for meshes · PNG/WebP textures · WAV/OGG SFX · HDR/EXR or RGBE for env if used.

**Priority:** **P0** = ship blockers · **P1** = polish / Ending C / Act III+ richness.

> Filename column: leave blank until sibling drops files; then fill exact names.

---

## 1. Environment meshes

| id | description | preferred sources | pri | filename |
|----|-------------|-------------------|-----|----------|
| ENV-WARD-MOD | Modular hospital corridor kit: wall, floor, ceiling, corner, T-junction, doorframe (clinic/industrial) | Kenney, Quaternius, Poly Pizza | P0 | `assets/models/environment/dungeon/{corridor,corridor-corner,corridor-junction,template-wall,template-floor,gate-door}.glb` (Kenney Modular Dungeon — horror greybox, not literal hospital) |
| ENV-ROOM-NURSE | Nurses’ station desk + half-wall module | Kenney, Poly Pizza | P0 | `assets/models/props/furniture/desk.glb` (+ wall half from dungeon templates) |
| ENV-ROOM-WARD | Patient bay: bed frame, curtain rail, side table | Quaternius, Poly Pizza, Sketchfab CC0 | P0 | `assets/models/props/furniture/bedSingle.glb`, `cabinetBedDrawer.glb` (curtain rail still open) |
| ENV-ROOM-DAY | Day room: chairs, low tables, TV prop shell | Kenney, Poly Pizza | P0 | `assets/models/props/furniture/{chair,table}.glb` (+ KayKit `kaykit/couch.gltf`) |
| ENV-PHARM | Pharmacy shelves / counter module | Kenney, Poly Pizza | P0 | `assets/models/props/furniture/bookcaseClosedDoors.glb`, `kaykit/shelf_A_small.gltf` |
| ENV-STAIR | Stairwell flight + landing + rail | Kenney, Quaternius | P0 | `assets/models/environment/dungeon/stairs.glb` |
| ENV-UTIL | Utility / UPS closet: pipes, boxy machines | Kenney industrial, Poly Pizza | P0 | `assets/models/props/{crate,antenna}.glb` (UPS box still open — greybox OK) |
| ENV-MORGUE | Cold room feel: drawers or gurneys (tasteful, non-gore) | Poly Pizza, Sketchfab CC0 | P1 | |
| ENV-THEATER | Teaching theater / OR-lite: gallery rail, center chair, lights boom | Sketchfab CC0, Poly Pizza | P0 | Partial: `wall-lamp.glb`, `emissive-light.glb`, `chair.glb` — gallery still greybox |
| ENV-TUNNEL | Service tunnel / pipes corridor for Ending A | Kenney industrial | P1 | |
| ENV-EXT-BAY | Simple exterior ambulance bay overhang (Act I cold open) | Kenney, Quaternius | P1 | |
| ENV-DOOR-HOSP | Swing / sliding hospital door mesh + frame | Kenney | P0 | `assets/models/props/door.glb`, `dungeon/gate-door.glb` |
| ENV-HIDE | Closet / cabinet hide volumes (openable door) | Kenney | P0 | `assets/models/props/furniture/{cabinetBedDrawer,bookcaseClosedDoors}.glb` |
| ENV-WINDOW | Window panel + blinds for gallery shutter puzzle | Kenney, Poly Pizza | P0 | OPEN — engine glass material + greybox panel |

---

## 2. Characters / creatures

| id | description | preferred sources | pri | filename |
|----|-------------|-------------------|-----|----------|
| CHR-PLAYER-ARMS | FPS arms + orderly scrub sleeves (or generic arms) | Quaternius, Mixamo-adjacent CC0 arms on OGA/Poly | P0 | PLACEHOLDER: capsule + camera — `assets/models/player/FPS_PLACEHOLDER.md`; body `astronaut.glb` |
| CHR-ANYA | Full-body nurse NPC, mid-poly, idle/walk/run/crouch-capable rig | Quaternius humans, Poly Pizza, Sketchfab CC0 | P0 | PROXY: `assets/models/chars/anya-proxy-wizard.glb` (swap Quaternius Adventurer/Animated Woman in Phase 2) |
| CHR-STITCHER | Emaciated/restrained-patient horror humanoid; slow gait readable silhouette | Sketchfab CC0, Quaternius (retexture), OGA | P0 | PROXY: `assets/models/chars/stitcher-proxy-demon.glb` (+ `enemies/ghost*.glb`) |
| CHR-WARDEN | Security/guard humanoid + flashlight prop socket | Quaternius, Poly Pizza | P0 | PROXY: `assets/models/chars/warden-proxy-astronaut.glb` |
| CHR-ECHO | Abstract/faceless humanoid or mannequin-like; reads in silhouette | Sketchfab CC0, procedural fallback OK | P0 | PROXY: `assets/models/chars/echo-proxy-ghost.glb` |
| CHR-PATIENT-LUCID | Optional lucid patient (sitting/bed) for Ending C flag — non-horror pose | Quaternius, Poly Pizza | P1 | PROXY: `assets/models/chars/patient-lucid-proxy-tribal.glb` |
| ANI-HUMAN-LOCOMOTION | Shared walk/run/crouch/turn anims if not packed with CHR | Quaternius packs, OGA | P0 | `assets/models/player/kenney-animated/{idle,run,jump}.fbx` (+ characterMedium.fbx) |
| ANI-STITCHER-LISTEN | Head-tilt / listen pose | Custom or retarget | P1 | |
| ANI-GRAB | Grab / struggle clip for fail state | OGA / custom | P1 | |

---

## 3. Props

| id | description | preferred sources | pri | filename |
|----|-------------|-------------------|-----|----------|
| PROP-FLASHLIGHT | Handheld flashlight mesh | Kenney, Poly Pizza | P0 | PROXY: `assets/models/props/flashlight-adjacent-lamp.glb` (+ SpotLight) — dedicated flashlight still open |
| PROP-RADIO | Walkie / radio for Anya & world | Kenney | P0 | PROXY: `assets/models/props/antenna.glb` |
| PROP-BADGE | ID badge ×3 color variants (patient/staff/visitor) | Kenney, procedural card OK | P0 | `assets/models/props/key-card.glb` (tint variants in Phase 2) |
| PROP-CLIPBOARD | Clipboard + papers | Kenney | P0 | OPEN — procedural / paper texture |
| PROP-TRAY | Metal tray / can decoy throwable | Kenney | P0 | PROXY: `assets/models/props/crate.glb` / debris boxes |
| PROP-LANTERN | Emergency lantern / battery lamp placeable | Kenney | P0 | `assets/models/props/wall-lamp.glb`, `furniture/lamp*.glb` |
| PROP-UPS | Wall UPS / breaker box interactable | Kenney industrial | P0 | OPEN — greybox box + `crate.glb` |
| PROP-DICTAPHONE | Tape recorder for Voss logs | Poly Pizza, Kenney | P1 | |
| PROP-WRISTBAND | Hospital wristband (story beat) | Procedural / small mesh | P0 | OPEN — procedural torus |
| PROP-FLARE | Flare stick | Kenney | P1 | |
| PROP-GURNEY | Gurney / stretcher | Poly Pizza | P1 | |
| PROP-IV-STAND | IV stand (set dressing) | Poly Pizza | P1 | |
| PROP-WHEELCHAIR | Wheelchair (set dressing) | Poly Pizza, Kenney | P1 | |
| PROP-EXIT-SIGN | Lit exit / ward signage | Kenney | P0 | `assets/textures/emissive/exit_strip_emissive.png` (+ plane mesh) |
| PROP-KEYFOB | Anya key fob | Tiny mesh / Kenney keys | P1 | `assets/models/props/key.glb` |
| PROP-SHELF-DEBRIS | Knockable shelf clutter for scripted noise | Kenney | P1 | `assets/models/props/{skull,debris-box-*}.glb` |

---

## 4. Textures & materials

| id | description | preferred sources | pri | filename |
|----|-------------|-------------------|-----|----------|
| TEX-FLOOR-LINO | Worn linoleum / hospital floor albedo+rough+norm | Poly Haven, Kenney | P0 | `assets/textures/tiles/*` (blue_floor_tiles_01) + `tiles_brown/*` |
| TEX-WALL-TILE | Ceramic / painted ward wall | Poly Haven | P0 | `assets/textures/plaster/*`, `peeling_painted_wall/*` |
| TEX-CEILING | Acoustic tile / stained ceiling | Poly Haven | P0 | `assets/textures/concrete/*` (proxy) |
| TEX-METAL-RUST | Utility metal | Poly Haven | P0 | `assets/textures/{metal,rusty_metal,rusty_painted_metal}/*` |
| TEX-FABRIC-CURTAIN | Privacy curtain | Poly Haven | P1 | |
| TEX-BLOOD-SPARSE | Sparse stain decals (optional, restrained) | Poly Haven / hand-made | P1 | `assets/textures/emissive/blood_stain_sparse.png` |
| TEX-PAPER-DOCS | Paper atlas for DOC inspect UI | Handmade / CC0 paper | P0 | OPEN |
| TEX-EMISSIVE-EXIT | Green emergency strip emissive | Handmade | P0 | `assets/textures/emissive/exit_strip_emissive.png` |
| TEX-FLICKER-LUT | Optional color LUT for Act III desat | Handmade | P1 | |
| MAT-GLASS | Window glass (transparent + dirt) | Engine material + Poly Haven | P0 | Engine material (no asset file) |

---

## 5. HDR / sky / env

| id | description | preferred sources | pri | filename |
|----|-------------|-------------------|-----|----------|
| HDR-NIGHT-OVERCAST | Dim overcast night for exterior bay / roof ending | Poly Haven HDRIs | P1 | |
| HDR-INTERIOR-DIM | Very dim interior reflection probe source (or skip HDR, use local lights only) | Poly Haven | P1 | `assets/env/studio_small_09_1k.hdr` |
| SKY-SIMPLE | Optional solid/gradient sky for exterior only | Procedural OK | P1 | |

**Note:** Interior scenes can ship **without** HDR if local lights + lightmaps carry mood (preferred for perf).

---

## 6. SFX (Freesound CC0 / OGA)

| id | description | preferred sources | pri | filename |
|----|-------------|-------------------|-----|----------|
| SFX-FOOT-PLAYER | Footsteps linoleum walk/sprint/crouch layers | Freesound CC0 | P0 | `assets/audio/sfx/footstep-{01,02,wood-01}.ogg` |
| SFX-FOOT-STITCHER | Soft/wet drag steps | Freesound CC0 | P0 | `assets/audio/sfx/footstep-cloth-01.ogg` (CC-BY pack) |
| SFX-FOOT-WARDEN | Boot steps | Freesound CC0 | P0 | `assets/audio/sfx/footstep-metal-0{1,2}.ogg` (CC-BY pack) |
| SFX-DOOR | Open/close/locked buzz | Freesound, Kenney UI | P0 | `assets/audio/sfx/door-*.ogg`, `metal-door-*.ogg`, `lock-open.ogg` |
| SFX-FLASH-ONOFF | Flashlight click | Freesound | P0 | OPEN — synth / Kenney UI |
| SFX-FLASH-PULSE | Stun pulse whoosh + buzz | Freesound | P0 | OPEN |
| SFX-BATTERY-LOW | Soft warn tick | Freesound / synth | P0 | OPEN |
| SFX-HIDE-ENTER | Closet enter | Freesound | P0 | PROXY: `wood-squeak.ogg` |
| SFX-DECOY | Tray clatter | Freesound | P0 | PROXY: `keys-jingle.ogg` / metal hits TBD |
| SFX-RADIO-SQUELCH | Radio open/close | Freesound | P0 | OPEN |
| SFX-RADIO-MIMIC | Distorted fake-Anya blip bed | Freesound | P0 | OPEN |
| SFX-HVAC-BED | Looping air/hum | Freesound | P0 | `assets/audio/sfx/ambient-drone-loop-0{1,2}.ogg` |
| SFX-GENERATOR | Distant generator irregular | Freesound | P0 | OPEN |
| SFX-RAIN | Exterior rain loop Act I | Freesound | P1 | |
| SFX-THUNDER | Distant thunder | Freesound | P1 | `assets/audio/sfx/chase-cue-thunder.ogg` |
| SFX-FLICKER | Light buzz/flicker | Freesound | P0 | OPEN |
| SFX-ECHO-STATIC | Narrowband static / clicks | Freesound / synth | P0 | OPEN |
| SFX-ECHO-MANIFEST | Appear stinger (short, rare) | Freesound | P0 | `assets/audio/sfx/sting-hit-0{1,2}.ogg` |
| SFX-CHASE-START | Alert vocal/hit | Freesound | P0 | `assets/audio/sfx/chase-cue-thunder.ogg` / sting-hit |
| SFX-GRAB | Struggle / fail | Freesound | P0 | OPEN |
| SFX-UPS-ON | Breaker success | Freesound | P0 | PROXY: `lock-open.ogg` |
| SFX-HEART | Optional calm/chase heart bed | Freesound | P1 | `assets/audio/sfx/breath.mp3` |
| SFX-UI | Journal open, pickup chime (subtle) | Kenney UI, Freesound | P0 | OPEN |

---

## 7. Music / ambience beds

| id | description | preferred sources | pri | filename |
|----|-------------|-------------------|-----|----------|
| MUS-TITLE | Sparse title motif (30–60s loopable) | OGA CC0, Freesound CC0 music | P0 | OPEN — use explore bed temporarily |
| MUS-EXPLORE | Very low drone/pad for explore | OGA, Freesound | P0 | `assets/audio/music/ambient-ancient-caverns.ogg` |
| MUS-TENSION | Suspicion rise layer (stems ideal) | OGA, Freesound | P0 | PROXY: drone loops + sting-hit |
| MUS-CHASE | Short chase pulse (not permanent) | OGA | P1 | |
| MUS-ECHO | Hollow Act III bed | OGA / custom | P0 | `assets/audio/music/ambient-sci-fi-horror.mp3` |
| MUS-ENDING-A | Bittersweet resolve | OGA | P1 | |
| MUS-ENDING-B | Unsettling “calm” loop | OGA | P1 | |
| MUS-ENDING-C | Costly hope | OGA | P1 | |
| AMB-WARD | Room tone variants (lobby / bay / sublevel) | Freesound | P0 | `assets/audio/sfx/ambient-drone-loop-0{1,2}.ogg` |

---

## 8. VO / dialogue (optional Phase 3)

| id | description | notes | pri | filename |
|----|-------------|-------|-----|----------|
| VO-ANYA-RADIO | 40–80 short radio lines | Temp: TTS OK labeled; final human later | P1 | |
| VO-VOSS-TAPE | 4–6 dictaphone clips | Processed/lo-fi | P1 | |
| VO-WARDEN-MIMIC | 6–10 wrong-Anya lines | Clearly “off” | P1 | |

If VO slips, **subtitles-only** ships; do not block vertical slice on VO.

---

## 9. UI / 2D

| id | description | preferred sources | pri | filename |
|----|-------------|-------------------|-----|----------|
| UI-CROSS-DOT | Minimal center dot | Handmade | P0 | |
| UI-GLYPH-ALLY | Follow/Wait/Hide/Panic icons | Handmade / Kenney UI | P0 | |
| UI-DOC-FRAME | Document inspect frame | Handmade | P0 | |
| UI-TITLE-LOGO | “Horror Ward” / Ashford wordmark | Handmade typography | P0 | |
| UI-THUMB | Hub thumbnail for `/games` card (dark ward corridor) | Handmade SVG/PNG | P1 | |

---

## 10. Bundles / kit recommendations (start here)

| Kit idea | Why | Pri |
|----------|-----|-----|
| Kenney Hospital / Interior / Furniture | Modular speed | P0 |
| Quaternius Human / Animated Human | Anya + enemy base | P0 |
| Poly Haven “hospital” adjacent materials (tiles, linoleum, concrete) | Mood flooring/walls | P0 |
| Freesound packs: footsteps, horror drones, radio static | Audio bed | P0 |
| Poly Pizza “flashlight”, “hospital bed”, “gurney” singles | Fill prop gaps | P0 |

---

## 11. Matching checklist for asset agent

For each P0 row: license verified → dropped under `public/games/horror-ward/assets/{env|chars|props|textures|audio|ui}/` → filename written back into this table → ATTRIBUTION line added.

**Do not** download multi-GB Megascans. Cap individual GLBs roughly **< 15 MB** when possible; atlas textures **≤ 2K** for wards, **1K** for small props.

---

## 12. Greybox fallbacks (if hunt stalls)

| Slot | Fallback |
|------|----------|
| ENV-* | Babylon box/plane modular kit coded in Phase 3 |
| CHR-ANYA | Capsule + nurse hat emissive |
| CHR-enemies | Distinct capsules (tall/wide/thin) + unique SFX |
| HDR | None — local lights only |

Story and AI ship on greybox; beauty is a skin.
