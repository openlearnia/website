# Horror Ward — Story Bible

**Working title:** Horror Ward  
**In-fiction setting:** Ashford Memorial Hospital — Night Teaching Wing, Ward 7  
**Engine target:** Babylon.js (browser, WebGL)  
**Tone:** Clinical dread, intimate dread, identity horror — not gore-porn. Think *PT* quiet + *Outlast* institutional + *SOMA* “what am I?”  
**Session length target:** 45–75 minutes for a first clear (Act 1–4).

---

## 1. Elevator pitch

A blackout swallows Ashford Memorial’s Night Teaching Wing. You are **Ellis Kane**, a night orderly pulled in on short notice. Your only ally is **Nurse Anya Rhee**, still answering the radios. Together you walk the dark wards while something that learned how humans *think* walks them too. The twist is not “the monster was in the basement.” The twist is that **you were never the orderly** — and Anya has been keeping you moving so the thing that wears certainty cannot finish wearing *you*.

---

## 2. Premise (player-facing, Act 1 briefing)

Storm night. Primary grid down. Backup generators flicker on Ward 7 only. Ellis arrives with a laminated shift card, a failing flashlight, and a radio channel that mostly carries Anya’s voice. Patients are “unaccounted for.” Doors that should be locked are not. The teaching theater below has been sealed since a research suspension nobody will explain on the radio.

**Player promise:** Survive the night, restore enough power to open the wing exits, get Anya out, learn what the Open Protocol left behind.

**Story promise (writer-facing):** Survive the night *as someone* — then decide whether that someone is worth keeping.

---

## 3. Tone & reference palette

| Pillar | Do | Don’t |
|--------|----|-------|
| Sound | Distant carts, HVAC, radio hiss, footsteps that stop when you stop | Constant orchestral stings |
| Image | Sickly green emergency strips, cold white fluorescents dying, warm desk lamp islands | Purple neon, jump-scare flashbangs every 30s |
| Violence | Implication, silhouettes, aftermath props | Explicit surgical gore as spectacle |
| Humor | Dry clinical paperwork jokes; one bad pun on a whiteboard (“Open ward — mind the gap”) | Quippy action-hero banter |
| Pacing | Long quiet → short panic → longer quiet that feels *wrong* | Arena combat loops |

**Tone refs (feel, not clone):** *PT* (corridor anxiety), *Alien: Isolation* (smart pursuer), *Visage* (domestic wrongness), *SOMA* (identity), *Signalis* (documents as story).

**Openlearnia site chrome:** Game canvas is dark; surrounding site keeps Openlearnia brand chrome *outside* the canvas. In-world, never name Openlearnia. The research project is the **Open Protocol** (teaching-hospital therapy trial) — thematic rhyme only.

---

## 4. Cast

### 4.1 Ellis Kane (player)

- **Presented role:** Night orderly, float pool, covering Ward 7.  
- **True role (revealed Act 4):** Ward 7 patient — voluntary admission for dissociative episodes after a workplace accident. Night of the storm, Anya found Ellis calm and functional, rewrote a blank badge into “orderly,” and used Ellis as a mobile pair of hands.  
- **Voice:** Sparse inner monologue via UI notes / radio replies; never chatty.  
- **Arc:** Competence → doubt (wrong memories on clipboards) → confrontation → choice.

### 4.2 Nurse Anya Rhee (ally — required AI)

- Mid-30s, night charge nurse, last staff with a working radio and master-key fob (partial).  
- **Helpful behaviors:** Guides to objectives, unlocks selected doors, creates noise distractions, points out hide spots, shares lore via radio.  
- **Scared behaviors:** Freezes, refuses dark rooms, flees to marked hide points, drops items, radio voice breaks into short panicked bursts.  
- **Secret:** Knows Ellis’s real chart. Protects Ellis from full recall until the Protocol forces the truth. Not a villain — a traumatized protector making a bad call that kept both alive.  
- **Arc:** Professional calm → brittle humor → confession → either sacrifice, escape together, or rejection depending on ending.

### 4.3 Dr. Harlan Voss (absent antagonist / document ghost)

- Head of the Open Protocol teaching trial. Voice on archived dictaphone tapes.  
- Believed “opening” rigid cognitive pathways would heal trauma. The Protocol did open something — not healing.  
- Dead or worse by Act 1; presence is audio + notes + one late hallucination.

### 4.4 The Borrowed (threat ecology)

Not demons. **People and systems rewritten by the Protocol into roles that hunt certainty.**

| Codename | Was | Horror hook |
|----------|-----|-------------|
| **Stitcher** | Patient in restraints therapy | Slow, listens, stitches “correct” behavior into others (grabs = instant fail if held) |
| **Warden** | Night security | Flashlight cone, radio mimicry of Anya’s cadence (wrong words) |
| **Echo** | Protocol remnant / failed subject | Only fully present in darkness; retreats from sustained light; messes with last-known positions |

---

## 5. Themes

1. **Roles as cages** — badges, uniforms, charts tell you who you are until they don’t.  
2. **Care vs control** — Anya’s lie is love with a clipboard.  
3. **Openness without safety** — “opening the mind” without a door that closes.  
4. **Quiet competence as courage** — survival is listening, not spraying ammo.

---

## 6. Structure — four acts

### Act I — “Night Call” (tutorial + lockdown)

**Locations:** Ambulance bay overhang → Ward 7 lobby → Nurses’ station → Bay A corridor.  

**Beats:**
1. Cold open: Ellis in rain, badge reader green once, then red.  
2. Anya on radio: “If you can hear this, stay on the green strips. Don’t follow voices that aren’t me.”  
3. First power flicker; learn crouch, lean, hide in supply closet.  
4. First **Stitcher** sighting at end of Bay A — no chase yet; it *turns its head toward a dropped tray*.  
5. Meet Anya in person at Nurses’ station (ally join). She gives flashlight charge pack + partial key.  
6. Objective: Restore local UPS in the utility closet to unlock Bay B.  
7. Soft fail teach: If spotted, hide; Anya yells a distraction once.  

**Act I end:** UPS online; Bay B door opens; distant Warden flashlight sweeps the glass; Anya: “That used to be Theo.”  

**Mood:** Unease, orientation, trust in Anya.

---

### Act II — “The Circuit” (stealth maze + ally stress)

**Locations:** Bay B wards → Day room → Pharmacy annex → Stairwell A.  

**Beats:**
1. Gather three **Protocol badges** (patient / staff / visitor) needed for later theater lock.  
2. Documents appear that *should* be Ellis’s shift logs — handwriting matches, but dates predate “hire.”  
3. Warden introduced: patrols Day room; radio mimic (“Anya” says go left when Anya on real channel says stay”). Teach channel distrust.  
4. Ally stress spike: Anya refuses Pharmacy dark aisle until player clears light path (place emergency lantern prop).  
5. Optional: Save a still-lucid patient (NPC prop + short VO) — affects Ending C availability.  
6. Mid-act chase: Warden + Stitcher overlap; Anya splits off to draw one away; rendezvous at Stairwell A.  

**Act II end:** Stairwell open; elevator dead; must descend on foot. Anya almost confesses: “When this is over, don’t look at your chart first. Look at me.”  

**Mood:** Paranoia, document dread, ally dependence.

---

### Act III — “Teaching Dark” (descent + Echo)

**Locations:** Sub-level corridor → Morgue antechamber → Observation gallery → Open Protocol theater.  

**Beats:**
1. Temperature drop; fog denser; lights refuse to stay on.  
2. **Echo** debut: appears behind player only when flashlight is off/low; vanishes in beam; leaves wet footprints that fade.  
3. Dictaphone of Voss: “If the subject believes the role, the Protocol stabilizes. If the subject doubts, the opening widens.”  
4. Setpiece: Observation gallery — player must cross while Anya operates light shutters from booth (coop puzzle). Echo hunts the dark segments.  
5. Theater doors need the three badges + Anya’s fob.  

**Act III end:** Theater opens; center chair restraints empty but warm; Ellis’s *patient* wristband on the armrest. Anya will not enter until spoken to.  

**Mood:** Identity crack, supernatural institutional.

---

### Act IV — “Open / Close” (revelation + endings)

**Locations:** Protocol theater → Flooded service tunnel → Roof helipad / Locked exit bay (ending-dependent).  

**Beats:**
1. Anya confesses: Ellis is Patient 7-14. The orderly story kept the Protocol from locking onto a single identity.  
2. The Borrowed converge — they want Ellis to *pick a role and stay in it*.  
3. Player choice cluster (see Endings).  
4. Final gauntlet is short and readable — not a boss DPS fight; light, hide, and decision.  

---

## 7. The twist (full spoiler)

**Surface mystery:** What escaped the Open Protocol lab?  

**True mystery:** The Protocol doesn’t create monsters from nothing — it **amplifies and externalizes role-collapse**. Staff who clung to duty became Wardens. Patients who clung to “being fixed” became Stitchers. Echo is what happens when no role sticks.

**Ellis:** Already mid-collapse when admitted. Anya’s fiction (orderly) was a tourniquet. Every clipboard inconsistency is the tourniquet slipping. The entity cannot finish “wearing” Ellis while Ellis is *between* roles; forcing a single truth either frees Ellis or completes the wearing.

**Anya’s moral wound:** She lied to a patient and put them in danger — and she was right that the lie bought hours.

---

## 8. Endings

All endings are reachable in one playthrough based on Act II optional save + Act IV dialogue choices + whether Anya’s trust meter is high (see DESIGN.md).

### Ending A — “Discharge” (bittersweet default)

Ellis accepts the patient truth, rejects the orderly fiction, and leaves with Anya through the service tunnel. Dawn grey. Radio goes quiet. On-screen: a real discharge form with Ellis’s name — signed by Anya, dated that morning.  
**Cost:** Flashlight dies; last walk in near-dark. No combat win — escape.

### Ending B — “Night Shift” (dark)

Ellis doubles down on the orderly role. The Protocol stabilizes *as Ellis*. Anya is locked out / left behind. Credits play over Ellis calmly restocking a nurses’ station that is clearly wrong (patients are silhouettes).  
**Horror punch:** Player “won” by becoming the ward’s new Warden-adjacent caretaker.

### Ending C — “Open Protocol” (secret / hard)

Requires: saved lucid patient in Act II + high Anya trust + destroy theater core (interact sequence under Echo pressure).  
Ellis and Anya overload the UPS into the theater, collapsing the local Protocol field. Wing becomes inert. Epilogue: sunlight, empty beds, one Echo footprint that doesn’t fade — sequel hook, not a cheap jump.  
**Tone:** Costly hope.

### Ending D — “Static” (fail / refuse)

If Anya dies (trust collapse + failed escort) or player AFK-fails critical escort: radio static ending; title glyph glitches to patient number. Short, bleak, unlocks New Game with Anya VO tip.

---

## 9. Key documents & environmental storytelling

Place as readable world props (E to inspect):

| ID | Title | Reveal |
|----|-------|--------|
| DOC-01 | Float pool shift card | Fake hire date (Act I) |
| DOC-02 | Incident — restraints bay | Stitcher origin |
| DOC-03 | Security radio log | Warden “Theo” |
| DOC-04 | Voss dictaphone 03 | Role stabilization theory |
| DOC-05 | Patient chart 7-14 | Ellis’s real name/history (Act IV forced if missed) |
| DOC-06 | Anya sticky note | “Don’t look at chart first” |
| DOC-07 | Lucid patient letter | Enables Ending C flag |

---

## 10. Dialogue principles

- Anya radio lines ≤ 12 words when under threat.  
- No villain monologues. Voss only on tape.  
- Player “dialogue” is mostly binary choices at 4–5 gates (trust / doubt / protect Anya / pursue truth).  
- Warden mimicry always *almost* Anya — wrong medical term or wrong name once.

---

## 11. Content rating guardrails

- No sexual content, no child patients as horror props (ward is adult teaching wing).  
- Violence: PG-13/R-light — grabs, silhouettes, aftermath.  
- Mental health: Dissociation framed with care; avoid mocking illness. The Protocol is the villain, not the patients.

---

## 12. Title treatment & marketing one-liner

**Horror Ward** — *The night shift is a story someone wrote on your badge.*

Alternate subtitle for hub card: *Ashford Memorial · Ward 7 · Lights failing.*
