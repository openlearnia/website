# Horror Ward — Level / Scene Flow

**Streaming model:** One Three.js scene with a **data-driven Kenney grid** (`wardMap.ts`, CELL=4). Fast Play loads lobby first; soft act gates + fog/audio swaps stand in for per-scene loads. See `LAYOUT.md`.

**Legend:** `→` required transition · `⇢` optional · `✗` fail / death reload · `★` ending.

---

## 1. Scene list

| Scene ID | Name | Act | Est. play | Primary threats | Notes |
|----------|------|-----|-----------|-----------------|-------|
| `S00_TITLE` | Title / load | — | — | — | Hub handoff from Openlearnia `/games/horror-ward` |
| `S01_BAY` | Ambulance bay overhang | I | 2–3 min | None / atmosphere | Cold open; rain; badge reader |
| `S02_LOBBY` | Ward 7 lobby | I | 4–6 min | Soft Stitcher sighting | Tutorial movement + hide |
| `S03_NURSES` | Nurses’ station + util | I | 5–7 min | Stitcher patrol | Meet Anya; UPS objective |
| `S04_BAY_B` | Ward Bay B | II | 8–12 min | Stitcher ×1–2 | Badges 1–2; document dread |
| `S05_DAYROOM` | Day room | II | 6–9 min | **Warden** | Patrol setpiece; radio mimic intro |
| `S06_PHARM` | Pharmacy annex | II | 5–7 min | Stitcher | Lantern path for Anya; optional lucid patient off-shoot `S06b` |
| `S06b_LUCID` | Side room (optional) | II | 2–3 min | Low | DOC-07 / Ending C flag |
| `S07_STAIR` | Stairwell A | II→III | 3–4 min | Warden pressure | Act gate; descend |
| `S08_SUB` | Sub-level corridor | III | 7–10 min | Echo latent + Stitcher | Fog up; battery pressure |
| `S09_MORGUE` | Morgue antechamber | III | 4–6 min | Echo | Dictaphone; tasteful set dressing |
| `S10_GALLERY` | Observation gallery | III | 6–8 min | Echo | Coop shutter puzzle with Anya |
| `S11_THEATER` | Open Protocol theater | III→IV | 5–8 min | Echo + converge | Wristband reveal; lock assemble |
| `S12_CHOICE` | Theater confession space | IV | 3–5 min | Borrowed pressure | Dialogue gates; ending branch |
| `S13a_TUNNEL` | Service tunnel | IV-A/C | 3–5 min | Short chase | Ending A / C escape |
| `S13b_WARD_LOOP` | Wrong nurses’ station | IV-B | 2–3 min | None (uncanny) | Ending B walk |
| `S13c_STATIC` | Static void | IV-D | 1 min | — | Ending D |
| `S14_EPILOGUE` | Slides + credits | — | — | — | Return CTA to site hub |

---

## 2. Flow diagram

```
S00_TITLE
   → S01_BAY
   → S02_LOBBY
   → S03_NURSES  … UPS restore …
   → S04_BAY_B
   → S05_DAYROOM
   → S06_PHARM
        ⇢ S06b_LUCID (optional)
   → S07_STAIR
   → S08_SUB
   → S09_MORGUE
   → S10_GALLERY
   → S11_THEATER
   → S12_CHOICE
        → Ending A: S13a_TUNNEL → S14_EPILOGUE ★ Discharge
        → Ending B: S13b_WARD_LOOP → S14_EPILOGUE ★ Night Shift
        → Ending C: S11 overload beat → S13a_TUNNEL → S14_EPILOGUE ★ Open Protocol
        → Ending D: S13c_STATIC → S14_EPILOGUE ★ Static

Any scene ✗ grab/Echo fail → last checkpoint in current scene (or prior scene gate)
Anya permanent loss in II–IV → force S13c_STATIC when next act gate hit
```

---

## 3. Transitions (technical + narrative)

| From | To | Trigger | Transition FX | Persist |
|------|----|---------|---------------|---------|
| Site hub | `S00` | Play button | Canvas mount | New/Continue |
| `S00` | `S01` | New Game / Continue Act I | Fade from black + rain | — |
| `S01` | `S02` | Badge reader success / door | Door crossfade | Battery full |
| `S02` | `S03` | Reach station corridor | Soft load | Tutorial flags |
| `S03` | `S04` | UPS online + Bay B unlock | Lights surge then dim | Anya joins party |
| `S04` | `S05` | Badge count ≥1 + dayroom door | Hallway stitch | Docs |
| `S05` | `S06` | Exit dayroom after Warden intro | Flicker | Mimic taught flag |
| `S06` | `S06b` | Side door interact | Push-in | — |
| `S06b` | `S06` | Leave side room | Pop | `lucid_saved` |
| `S06` | `S07` | Pharmacy cleared + Anya ready | Stair door | Badges |
| `S07` | `S08` | Descend interact hold | Black + elevator creak (fake) | Act II complete |
| `S08` | `S09` | Reach morgue doors | Fog thicken | Echo intro done |
| `S09` | `S10` | Dictaphone heard OR skip after timer | Gallery doors | — |
| `S10` | `S11` | Shutter puzzle success | White flash (photosens. safe alt: slow brighten) | Coop complete |
| `S11` | `S12` | Wristband inspect + Anya talk | Dialogue lock | Reveal forced |
| `S12` | `S13*` | Ending choice commit | Unique per ending | Ending id |
| `S13*` | `S14` | Reach exit trigger | Credits | Stats optional |
| `S14` | Site hub | “Back to Games” | Canvas unmount | Save endings unlocked |

**Unload policy:** Keep previous scene warm only one deep (memory). Drop AI actors not in current+adjacent.

---

## 4. Checkpoints

| ID | Scene | Strip location | Restores |
|----|-------|----------------|----------|
| CP-01 | `S02` | Lobby closet | Pos, battery soft tax on death |
| CP-02 | `S03` | Nurses’ station rear | After Anya join |
| CP-03 | `S04` | Bay B mid junction | Badges kept |
| CP-04 | `S05` | Dayroom entrance alcove | — |
| CP-05 | `S06` | Pharmacy counter | Lantern state |
| CP-06 | `S07` | Stair landing | Act II clear |
| CP-07 | `S08` | Sub-level niche | — |
| CP-08 | `S10` | Gallery booth side | Before puzzle |
| CP-09 | `S11` | Theater outer ring | Before reveal |
| CP-10 | `S12` | Pre-choice mark | Choice not yet locked |

Death: respawn at last CP; enemies reset to PATROL; suspicion 0; battery −15; Anya if alive warps to CP hide node.

---

## 5. Encounter budgets (per scene)

| Scene | Max simultaneous AI | Scripted events |
|-------|---------------------|-----------------|
| `S02` | 1 Stitcher (sight only) | Tray drop teach |
| `S03` | 1 Stitcher | UPS noise spike |
| `S04` | 2 Stitcher | Doc spawn |
| `S05` | 1 Warden (+ optional distant Stitcher) | Mimic radio |
| `S06` | 1 Stitcher | Anya refuse dark |
| `S08` | 1 Stitcher + Echo latent | First MANIFEST |
| `S09` | Echo | Dictaphone |
| `S10` | Echo | Shutter segments |
| `S11–12` | Echo + up to 1 Warden | Converge |
| `S13a` | 1 pursuer | Escape sprint beats |

---

## 6. Ally presence map

| Scene | Anya default | Notes |
|-------|--------------|-------|
| `S01–S02` | Radio only | Not embodied yet |
| `S03+` | Embodied FOLLOW | Unlockable cmds |
| `S05` | WAIT at alcove optional | Player can bring her (risk) |
| `S06` | Must FOLLOW for lantern teach | Fear high in dark aisle |
| `S10` | Scripted LEAD to booth | Separated coop |
| `S11` | WAIT outside until talk | Confession setup |
| `S12` | Present | Choice reactions |
| `S13b` | Absent | Ending B |
| `S13c` | Absent / static VO | Ending D |

---

## 7. Objective → scene mapping (quick ref)

| Act | Objective | Scene |
|-----|-----------|-------|
| I | Enter wing | `S01→S02` |
| I | Meet Anya | `S03` |
| I | Restore UPS | `S03` |
| I | Open Bay B | `S03→S04` |
| II | Badges ×3 | `S04–S06` |
| II | Dayroom cross | `S05` |
| II | Optional lucid save | `S06b` |
| II | Stair descend | `S07` |
| III | Survive Echo rules | `S08–S10` |
| III | Gallery coop | `S10` |
| III | Theater unlock | `S11` |
| IV | Choose ending | `S12→S13*` |

---

## 8. Vertical slice recommendation (Phase 3 first mile)

Ship order for engineering:

1. `S00` + `S02` + `S03` (tutorial + Anya + Stitcher + UPS)  
2. Add `S05` (Warden + mimic)  
3. Add `S08` + Echo rules  
4. Hook `S11–S12` + Ending A only  
5. Fill remaining scenes + B/C/D  

That slice proves **story + ally + smart enemy** before full campus build-out.

---

## 9. Openlearnia integration hooks

| Hook | Behavior |
|------|----------|
| Route | `/games/horror-ward` (Astro page later) |
| Hub card | Thumbnail `UI-THUMB`; tagline from STORY.md |
| Shell | Site chrome outside canvas; dark brand OK |
| Fullscreen | Reuse `src/games/fullscreen.ts` pattern |
| Exit | `S14` CTA → `/games` |

No engine work in Phase 1 — this file is the map the Phase 3 team walks.
