# Horror Ward — Game Design Document

**Stack:** Babylon.js · TypeScript · browser (desktop primary, touch secondary)  
**Perspective:** First-person, grounded (no free-fly)  
**Pillars:** Stealth survival · Ally co-presence · Document mystery · Smart pursuers  
**Out of scope (Phase 1):** Engine code, networking, VR, crafting trees, gun FPS.

> Design argument (recorded): A combat-forward horror FPS would ship faster *feel* but collapse the story’s “role” theme into ammo counting. Stealth + limited light tools + ally AI is the harder, correct fit for browser horror that wants a second playthrough.

---

## 1. High-level fantasy

You are a slow, careful body in a dying hospital. Your flashlight is a resource and a tell. Anya is a second brain you can lose. Enemies do not teleport onto your neck — they **patrol, hear, see, investigate, chase, and search last-known**. Winning a fight is rare; winning a *route* is the game.

---

## 2. Core gameplay loop

```
Explore dark space → Read / listen for objective
        ↓
Manage light, noise, stamina, Anya state
        ↓
Avoid or break line-of-sight with Borrowed
        ↓
Complete local objective (UPS / badge / shutter / door)
        ↓
Short relief → new threat pressure → next space
```

**Micro-loop (30–90s):** Move → pause to listen → commit to a light choice → pass a danger → stash or progress.

**Macro-loop (per act):** Unlock next wing segment → gather story token → survive escort or solo stretch → act gate.

---

## 3. Player abilities

| Ability | Input | Rules |
|---------|-------|-------|
| Walk / sprint | WASD + Shift | Sprint drains stamina; sprint = loud |
| Crouch | Ctrl / C | Quieter footsteps; slower; lower silhouette |
| Look / lean | Mouse · Q/E lean | Lean peeks without full body expose (lean = slightly louder than crouch idle) |
| Flashlight | F / Mouse4 | Cone light; battery drain; enemies can see the beam |
| Interact | E | Doors, docs, UPS, badges, hide spots, Anya talk |
| Aim focus | RMB hold | Narrows FOV slightly; steadies beam; slows move |
| Stun pulse | LMB (flashlight charged) | Short bright pulse; stuns Stitcher/Warden ~2.5s; **aggravates Echo**; costs big battery |
| Drop decoy | G | Throw empty tray/can (limited pickups); noise lure |
| Ally command | 1 Follow · 2 Wait · 3 Hide · 4 Distract | Only when Anya in range / radio linked |
| Pause / journal | Esc · J | Objectives, docs collected, controls |

**No guns.** Optional late tool: **flare stick** (2–3 per run) — bright room fill, draws all nearby AI to flare point, then darkness snap-back.

### 3.1 Resources

| Resource | Max | Replenish |
|----------|-----|-----------|
| Stamina | 100 | Rest / walk |
| Battery | 100 | Wall chargers (scarce), Anya gift once/act |
| Heart (calm) | 100 | Hiding, safe light islands; drops when chased |
| Anya trust | 0–100 | See §6 |
| Decoy items | 0–3 | World pickups |

**Death / fail:** Grabbed hold meter or instant on Echo embrace in full dark (telegraphed). Respawn at last **checkpoint strip** (green floor light node) with soft resource tax (battery −15). Endless deaths → Ending D path if Anya was abandoned mid-escort.

---

## 4. Controls

### 4.1 Keyboard + mouse (primary)

| Action | Binding |
|--------|---------|
| Move | WASD |
| Look | Mouse |
| Sprint | Shift |
| Crouch | Ctrl |
| Lean L/R | Q / E |
| Interact | E |
| Flashlight toggle | F |
| Stun pulse | LMB (beam on) |
| Focus | RMB |
| Decoy | G |
| Ally commands | 1–4 |
| Journal | J |
| Pause | Esc |
| Fullscreen | F11 or site shell button |

Pointer lock on play; Esc releases.

### 4.2 Touch tips (secondary)

- Left virtual stick: move  
- Right drag: look  
- Buttons: Flashlight · Interact · Crouch · Pulse · Ally radial  
- Sprint: stick fully forward past threshold  
- **Tip copy in HUD first run:** “Tap flashlight sparingly — the dark listens, and so do they.”

Touch is supported for completeness; encounter timing tuned on mouse+keyboard.

---

## 5. Enemy AI specifications

Shared senses unless noted:

| Sense | Model |
|-------|-------|
| Vision | Cone + distance; flashlight beam increases player detectability; crouch reduces profile |
| Hearing | Footstep loudness by gait; decoys; door slams; Anya distract |
| Memory | **Last-known position (LKP)** + timestamp; search radius grows then decays |
| Suspicion | 0–100 meter; thresholds gate state transitions |

### 5.1 Shared state machine (Stitcher & Warden)

```
IDLE ⇄ PATROL
   ↓ suspicion ≥ 25 or hear soft noise
INVESTIGATE (move to noise / glance point)
   ↓ see player clearly OR suspicion ≥ 70
ALERT (short turn + vocalize)
   ↓
CHASE (direct pursuit; sprint allowed for Warden)
   ↓ lose LOS > T_lose
SEARCH_LKP (grid search around last-known)
   ↓ search timer expire / suspicion → 0
RETURN → PATROL
```

**Grab (fail state):** On touch + facing player in CHASE → hold struggle (mash / stamina) ~1.8s; fail = death. Anya distract can break grab once per encounter cooldown.

### 5.2 Stitcher (P0)

| Param | Value (tunable) |
|-------|-----------------|
| Patrol speed | 1.1 m/s |
| Chase speed | 1.35 m/s |
| Vision range | 12 m (dark) / 8 m if player lit poorly behind them |
| Hearing | Excellent — investigates tray drops from 18 m |
| Stun | Pulse works full 2.5s |
| Behavior spice | Stops moving when player stands still in darkness within 6 m (listening pose) |

**Tell:** Wet cloth drag SFX; head-tilt silhouette.

### 5.3 Warden (P0)

| Param | Value |
|-------|-------|
| Patrol speed | 1.3 m/s |
| Chase speed | 2.1 m/s |
| Vision | Own flashlight cone 16 m; outside cone weak |
| Hearing | Medium |
| Mimic | 15% chance on INVESTIGATE to play fake Anya radio bark |
| Stun | Pulse works but shorter (1.6s); after 2 stuns in 60s becomes enraged (ignores 1 pulse) |

**Tell:** Hard soles; radio squelch; white cone.

### 5.4 Echo (P0 Act III+)

Special machine:

```
LATENT (invisible / particle only) 
  ↓ player in darkness ≥ 2s OR battery < 10 in Echo zone
MANIFEST (materializes at off-camera dark cell near player)
  ↓
PRESSURE (orbits darkness; blocks path; telegraphs grab with rising static)
  ↓ flashlight beam sustained ≥ 1.2s on body
DISPERSE → LATENT (cooldown 8–14s)
  ↓ if beam off during PRESSURE too long
EMBRACE → fail
```

- Ignores normal PATROL.  
- Stun pulse **forces immediate MANIFEST + PRESSURE** (punishes spam).  
- Cannot open doors; waits on other side of light thresholds.  
- SEARCH_LKP: Echo cheats — relocates to a dark cell near LKP rather than pathing like humans.

### 5.5 Detection cheats (fairness)

- No spawning inside player’s current room unless scripted setpiece.  
- Max concurrent active hunters: 2 (plus Echo latent).  
- Suspicion decays in hide spots tagged `safe`.

---

## 6. Ally AI — Nurse Anya Rhee

### 6.1 Presence modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **FOLLOW** | Cmd 1 / default | Paths behind player at 1.6 m; waits at doors |
| **WAIT** | Cmd 2 | Holds position; whispers if player > 25 m |
| **HIDE** | Cmd 3 / scared auto | Seeks nearest `hide_ally` node |
| **LEAD** | Scripted | Paths to objective marker; player must keep up |
| **DISTRACT** | Cmd 4 | Moves to noise point, slams tray, then HIDE |
| **FLEE** | Fear ≥ 80 | Ignores commands briefly; runs to hide |

### 6.2 Anya state machine

```
CALM → UNEASY (saw body / heard chase) → SCARED (LOS to enemy) → PANIC (chased / grabbed near)
PANIC → SCARED when safe ≥ 12s → UNEASY → CALM (slow)
```

| State | Follow gap | Will enter dark? | Dialogue |
|-------|------------|------------------|----------|
| CALM | 1.6 m | Yes with lantern | Objective tips |
| UNEASY | 1.2 m | Only if player lit path | Short warnings |
| SCARED | Tries HIDE | No | Fragmented |
| PANIC | FLEE | No | Radio static bursts |

### 6.3 Helpful actions (CALM / UNEASY)

- Auto-ping next objective every 90s if player idle.  
- Unlock doors tagged `anya_key` (limited count per act).  
- Place / toggle emergency lantern once per designated socket.  
- Break enemy grab once / 120s if within 8 m.  
- Share battery gift once per act at trust ≥ 40.

### 6.4 Trust meter (0–100)

| Event | Δ |
|-------|---|
| Follow commands obeyed / protect her in chase | +5 |
| Complete optional lucid patient save | +15 |
| Leave her WAIT in danger room > 40s | −10 |
| Shine stun pulse into her face (accident) | −5 |
| Choose “doubt Anya” at Act II gate | −10 |
| Choose “protect Anya” at Act IV | +10 |
| Anya downed (fail escort) | lock Ending D |

**Ending gates:**  
- Ending A: trust ≥ 35, accept patient truth  
- Ending B: reject truth / insist orderly (trust ignored)  
- Ending C: trust ≥ 70 + lucid save + destroy core  
- Ending D: Anya lost

### 6.5 Ally pathing & performance

- Navmesh same as player; avoid enemy personal space.  
- If stuck > 5s: teleport to last player checkpoint (fade) — `ponytail:` acceptable browser ceiling; upgrade = local detour planner.  
- Soft collision with player; never body-block doorways > 1s.

---

## 7. Stealth & combat model

**Stealth is the combat.**  
Light is both tool and liability. Noise is currency.

| Action | Noise | Light tell |
|--------|-------|------------|
| Crouch walk | Low | None |
| Walk | Med | None |
| Sprint | High | None |
| Door open | Med–High | None |
| Flashlight on | — | High (beam visible to AI) |
| Stun pulse | High | Extreme |
| Decoy | High at impact | — |

**“Combat” options:** Pulse stun → reposition; decoy; Anya distract; flare; environmental (knock shelf — scripted rooms only).

No health bar DPS fights.

---

## 8. Objectives per act

### Act I — Night Call
1. Enter Ward 7 lobby under green strip lights.  
2. Reach Nurses’ station; meet Anya.  
3. Restore UPS in utility closet (interact hold 2.5s; noise event).  
4. Survive first soft chase / hide teach.  
5. Open Bay B (act gate).

### Act II — The Circuit
1. Collect Protocol badges ×3 (patient, staff, visitor).  
2. Cross Day room under Warden patrol.  
3. Optional: Free lucid patient (DOC-07).  
4. Light Pharmacy path for Anya.  
5. Rendezvous Stairwell A; descend.

### Act III — Teaching Dark
1. Traverse sub-level; manage Echo darkness rules.  
2. Observation gallery shutter coop (Anya booth / player floor).  
3. Assemble theater lock (badges + fob).  
4. Discover wristband beat (story forced inspect).

### Act IV — Open / Close
1. Dialogue confession gate.  
2. Choice: Accept truth / Deny / Overload core.  
3. Short gauntlet to exit route matching ending.  
4. Epilogue slide + return to site hub.

---

## 9. Win / lose

| Condition | Result |
|-----------|--------|
| Reach an ending trigger cleanly | Win — ending cinematic + credits |
| Grab fail / Echo embrace | Soft lose — respawn checkpoint |
| Anya permanent loss | Ending D (or immediate if mid-final) |
| Quit to hub | Save slot keeps act checkpoint |

**Win is narrative completion, not high score.** Optional: time + detection count for hub bragging later (P1).

---

## 10. UI / HUD

**Diegetic-first.** Minimal chrome.

| Element | Presentation |
|---------|--------------|
| Battery | Thin bar on flashlight body / corner glyph |
| Stamina | Only when sprinting / recovering |
| Suspicion | Edge vignette pulse (not a meter number) |
| Objective | Single line bottom-left, fades after 4s |
| Ally status | Small icon: Follow / Wait / Hide / Panic |
| Trust | Hidden; journal shows qualitative (“Anya trusts you” / “Anya is wary”) |
| Docs | Journal list with transcripts |
| Damage / grab | Red peripheral + struggle prompt |
| Radio | Subtitle line + optional waveform tick |

**Menus:** Title (Ward lights flicker logo) · Continue · New · Settings (mouse sens, brightness floor, subtitles, reduce flashes) · Credits.

**Accessibility:** Subtitles on by default; fullbright *not* allowed (breaks Echo); offer “high contrast interact prompts”; colorblind-safe objective markers (shape + color); reduce-camera-shake toggle; photosensitive: disable strobe pulse option (stun becomes cone widen without flicker).

**Openlearnia shell:** Outside canvas — site header/footer dark brand. Inside canvas — no Openlearnia wordmark; in-world Ashford Memorial only.

---

## 11. Horror lighting & mood targets

Babylon.js lighting direction for art/engineering (numbers are targets, not law).

### 11.1 Global

| Param | Target |
|-------|--------|
| Clearcoat / shine | Low — damp clinical, not glossy gamey |
| Ambient | Very low; rely on locals |
| Fog mode | Exp. fog |
| Fog density Act I | 0.012–0.018 |
| Fog density Act III | 0.028–0.040 |
| Fog color | `#0a1210` → `#070b0e` (green-black → blue-black) |
| Exposure | Underexposed; player light carries read |

### 11.2 Color temperature

| Source | Temp / tint |
|--------|-------------|
| Emergency strips | Cold green `#6e9b7a` low lux |
| Dying fluorescents | Cool white 5000K with flicker |
| Desk lamps / safe islands | Warm 2800–3200K `#e6c089` |
| Warden flashlight | Hard white-blue |
| Player flashlight | Soft warm-white; battery low → dim + yellow |
| Echo zones | Desaturate midtones; crush blacks |

### 11.3 Flicker & contrast

- Fluorescent flicker: irregular (not sine); 3–8% duty “dead” frames.  
- UPS restore: lights stabilize 40% then brown out again (false comfort).  
- Contrast: deep blacks; readable silhouettes at mid-distance; never muddy grey fog wall.  
- Bloom: subtle on emergency strips only; no cyberpunk glow stack.  
- Lightning (Act I bay): rare; flash + thunder delay 0.6–1.2s.

### 11.4 Per-act mood card

| Act | Fog | Dominant light | Contrast |
|-----|-----|----------------|----------|
| I | Light green fog | Warm station + green strips | Medium |
| II | Medium | Mixed warm/cold conflict | High |
| III | Heavy | Player beam vs void | Extreme |
| IV | Clearing or crushing (ending) | Dawn grey OR dead fluorescents | Story-driven |

---

## 12. Audio design targets (for asset sibling)

| Layer | Mood |
|-------|------|
| Bed | HVAC hum, distant generator, rain on glass |
| Tension | Low drone, rises with suspicion vignette |
| Stitcher | Cloth, wet drag, breath through teeth |
| Warden | Boots, radio squelch, keys |
| Echo | Narrowband static, bone-dry clicks |
| Anya | Close-mic radio; breath when scared |
| Stingers | Rare; doors, grab, Echo manifest |

Music: sparse piano/strings pads; silence is a feature. See `ASSET_MANIFEST.md`.

---

## 13. Difficulty

Single narrative difficulty at ship (“Night Shift”).  
Modifiers in settings (P1): enemy hearing ±15%, battery drain ±20%, Anya fear build rate.

---

## 14. Save system

- Autosave on act gate + checkpoint strips.  
- One slot + New Game.  
- Docs & ending flags persist for Ending C awareness on replay.

---

## 15. Tech constraints (implementation notes for Phase 3)

- Target mid-tier integrated GPU @ 1080p ≥ 30 FPS.  
- Bake lightmaps where possible; dynamic lights: player beam, Warden cone, ≤3 lanterns.  
- Navmesh per scene; AI LOD: far enemies freeze suspicion.  
- Scene streaming between acts (see `LEVEL_FLOW.md`).  
- No download of huge photogrammetry; prefer modular kits (Kenney / Quaternius / CC0).

---

## 16. Success criteria (design)

1. Player can explain Anya’s lie in one sentence after Ending A/C.  
2. At least one “I thought I lost them, then LKP search found me” story per playtest.  
3. Echo teaches light discipline without rage-quits (≤3 deaths average Act III first clear).  
4. Ally feels useful, not escort-mission hate (trust ≥ 50 on >60% clears).
