# Implementation Plan: Anatomy of an MRL traction elevator

Paths used throughout:

- `ROOT` = `c:\Users\k64163939\Develop\mrl-elevator-anatomy` (the figure project; **not** a git repo: do not `git init`, do not commit)
- `SKILL` = `C:\Users\k64163939\.kiro\skills\anatomy` (read-only; never edit)
- From `ROOT`, the skill is the relative path `../../.kiro/skills/anatomy/` (both live under `C:\Users\k64163939`). Use that in static ESM imports, e.g. `import * as k from "../../.kiro/skills/anatomy/kit/iso-kit.mjs";`.

Mandatory reading before writing code: `SKILL\SKILL.md`, `SKILL\references\craft.md`, `kit.md` (sections 1–12), `motion.md`, `verify.md`. The closest working pattern is `SKILL\examples\arcade-cabinet\build.mjs` (helpers `prismPaths`, `board`, `prism`, `box`, `turned`, `disc`, `ball`, `planeMatrix`, `cable`, the recorder wiring, the slots and the page assembly) plus `live.js`. Per-frame depth re-sort and `data-k` / `data-m` / `data-ride` come from `SKILL\examples\raptor-engine\build.mjs` (line ~883) and `live.js` `place()` (line ~144). The parts-list buttons under the card come from the Raptor (`rp-part` buttons, line ~922).

Size: **Hero**, dense, about 3–4 hours. Have a working page in the browser at the end of item 1 (FEAT-001) and deepen from there.

---

## 1. Concept

**What moves and what it means.** A 630 kg, 1.0 m/s machine-room-less elevator in a five-landing concrete hoistway, its two near walls (masonry infill) cut away. The car travels between landings on a jerk-limited S-curve. The counterweight moves the same distance the opposite way. Because the car and counterweight both hang 2:1, from sheaves they carry, the ropes run over the traction sheave at **twice** car speed: at 1.00 m/s the ropes run at 2.00 m/s and the Ø320 sheave turns at 119 rpm. The traction sheave is the one `lit` accent, and its turning index mark is the part to watch. The car (`hi`) is the subject.

Every number the figure shows (readout, displays, status line, aria text, caption figures, part explanations) comes from `model.mjs`.

## 2. Truth: the pure model (`ROOT\model.mjs`)

No imports and no DOM, so the build can import it and the page can inline it with `export ` stripped, the way the arcade inlines `parts.mjs`. Deterministic: no `Date`, no `Math.random`.

```js
export const SPEC = {
  floors: 5, floorHeight: 2.8, pit: 1.2, overhead: 3.6,          // m
  ratedLoad: 630, persons: 8, carMass: 700, balance: 0.5,          // kg; cwtMass = carMass + balance*ratedLoad = 1015
  ratedSpeed: 1.0, accel: 0.6, jerk: 1.0,                          // m/s, m/s², m/s³
  roping: 2, ropes: 4, ropeD: 0.008,                               // 4 × Ø8 mm steel ropes, 2:1
  sheaveD: 0.32, carPulleyD: 0.32, cwtPulleyD: 0.32,               // D/d = 40
  govD: 0.20, govTrip: 1.15, poles: 20,                            // governor trips at 115 % rated
  door: { clear: 0.80, open: 2.0, dwell: 3.0, close: 2.5 },        // centre-opening, s
  levelZone: 0.05,                                                 // last 50 mm of a run is "levelling"
};
export const TRAVEL = (SPEC.floors - 1) * SPEC.floorHeight;       // 11.2 m
```

Functions (all pure):

- `floorPos(f)`: metres above landing 1 for landing `f` (1..5), i.e. `(f-1)*2.8`.
- `plan(from, to, spec)`: a 7-segment S-curve (jerk-in, constant accel, jerk-out, cruise, jerk-in, constant decel, jerk-out). Returns `{ from, to, dir, d, vPeak, tj, ta, tc, total }`. With the SPEC numbers one accel phase lasts `v/a + a/j = 2.267 s` and covers 1.133 m. Every run here (2.8 m or more) reaches 1.0 m/s, but solve `vPeak` for short runs anyway: `d < 2·dAcc(vmax)` ⇒ bisect `vPeak`; triangular accel when `vPeak < a²/j`. Anything else is a bug.
- `sample(plan, t)` ⇒ `{ pos, v, a, j, phase }`, closed-form per segment. `phase` is `accelerating` | `running` | `decelerating` | `levelling` (`|to − pos| < levelZone` while moving) | `stopped`.
- `doorAt(t, phase)`: door fraction 0..1, smoothstep eased over `door.open` / `door.close`.
- `derived(state)` ⇒ every number on the page, from the car position and speed:
  - `carPos` (m above L1), `cwtPos = TRAVEL − carPos` (m above its lowest; equal travel, opposite way, because both hang 2:1)
  - `speed = |v|`, `dir` (−1, 0, 1), `ropeSpeed = 2·|v|`
  - `sheaveRpm = ropeSpeed / (π·sheaveD) · 60` (119.4 at rated), `inverterHz = poles/2 · rpm/60` (19.9 Hz at rated)
  - angles **from position**, so they never drift: `sheaveAngle = 2·carPos/(sheaveD/2)` (rope travel is twice car travel), `carPulleyAngle = carPos/(carPulleyD/2)`, `cwtPulleyAngle = carPos/(cwtPulleyD/2)`, `govAngle = carPos/(govD/2)` (the governor rope moves with the car)
  - `govRpm = |v|/(π·govD)·60` (95.5 at rated) and `govTripSpeed = govTrip·ratedSpeed`
  - `floor` (nearest landing), `atFloor` (levelled, within 5 mm), `loadKg`, `loadPct = loadKg/ratedLoad`, `persons`
  - `door` (fraction) and `doorState` (`closed` | `opening` | `open` | `closing`)
  - `loopPos` (travelling-cable loop: rises at half car speed, `carPos/2`)
- Controller (pure state machine): `initial()`, `call(state, floor, kind)` (`kind` is `car` or `up` or `down`), `step(state, dt)`. Full collective: keep going in the current direction while calls lie ahead, otherwise reverse. Run only with doors closed; open only when levelled; dwell, then close. A call to the floor the car is at reopens or extends the dwell. `board(state, n)` changes the passenger count only while the doors are open (75 kg a person, clamped to 0..8).
- `TOUR`: a deterministic list of `{ at, floor, kind, board }` events (for example L1 board 2 ⇒ L3 board +3 ⇒ L5 alight 4 ⇒ L2 ⇒ L1), so the idle tour shows loads going up and down.

`ROOT\model.test.mjs` uses `node:test` and `node:assert/strict`, so there are no dependencies to install. These are property-style checks over many deterministic sampled runs (every from/to pair, t sampled at 1 ms):

1. Each plan ends exactly on its target (|pos − to| < 1e-9), with v = 0 and a = 0 at the end.
2. Limits: |v| ≤ ratedSpeed, |a| ≤ accel, |j| ≤ jerk (+1e-9) everywhere. pos and v are continuous (step < bound·dt).
3. A one-floor run takes 2.8/1.0 + 2.267 = 5.067 s. L1→L5 takes 13.47 s.
4. `carPos + cwtPos === TRAVEL` always. `ropeSpeed === 2·speed`. `sheaveRpm` at 1.0 m/s is 119.37 ± 0.01. `inverterHz` is 19.89 ± 0.01. `govRpm` is 95.49 ± 0.01.
5. Controller: the doors are never > 0 while |v| > 0. Every registered call is served. The car stops only on a landing. The same events give the same trace twice (determinism).

Verify: `node --test model.test.mjs` from `ROOT`, all pass.

## 3. Object, camera and world

### Units and camera

- **1 world unit = 1 cm.** x and y are on the floor, z is up. The audit and kit work in these units, and the screen scale comes out at about 0.57 px per unit.
- Azimuth **50°** (the cut-away y-face, where the mechanism is, leans toward the viewer) and elevation **30°**. In kit terms screen-x = x·sin a − y·cos a, so **+x is screen-right and +y is screen-left**, and the viewer looks toward −x −y.
- viewBox **W 520 × H 1040** (a tall card for a tall machine), `pad 26`.
- `P = k.fitProjection(points, 520, 1040, { pad: 26, azimuth: 50, elevation: 30 })`, with `points` = `k.boxCorners` of the building envelope `{x:-20, y:-20, w:250, d:295, r:0}` from z −25 to 1625, plus the lobby and side slab stub corners.
- Composition check (step 10): the object fills 55–65% of the card, with nothing touching the corner labels. If width use is low, widen the slab stubs (real building floor), never the machine.

### Plan (rounded rects `{x,y,w,d,r}` and circles, cm)

| Part | Plan | Notes |
|---|---|---|
| Hoistway inside | x 0..180 (depth, back wall → landing side), y 0..235 (width) | 1.80 × 2.35 m |
| Back wall x0 (concrete, 20) | `{x:-20,y:-20,w:20,d:255,r:0}` | full height −25..1625, cut face at its y=235 end |
| Back wall y0 (concrete, 20) | `{x:-20,y:-20,w:200,d:20,r:0}` | full height, cut face at its x=180 end |
| Floor slabs L1..L5, roof | L-shaped ring outside the hole, out to x 230 (lobby stub) and y 275 (side stub); thickness 25, top at landing level | `k.extrude(ring, z, 25, P, { convex:false })`, recorded `A.extruded` |
| Car cab (outer) | `{x:28,y:22,w:144,d:114,r:1}` | inner 1.40 × 1.10 m; car centre (100, 79) |
| Car rails (T89) | y0 rail at x=100 (foot y 8–9, blade tip 15.2); y1 rail at x=100 (foot y 149–150, blade tip 143.8) | blades point at the car |
| Common bracket beam (C160) per floor | `{x:0,y:150,w:180,d:7}` at z Lf−41..Lf−25 | bears in the x0 wall and on the x1 slab edge; carries the y1 car rail (near flange) and CWT rail 1 (far flange) |
| Counterweight | `{x:72,y:168,w:16,d:46}`, height 280 | thin in x; its rails face each other along y |
| CWT rail 1 / 2 (T50) | x=80, foot 157–158, tip 164.2 / foot 223–224, tip 217.8 | rail 2 bracketed to the y1 slab edge (y 235) at each floor |
| Traction sheave T | centre (80, 159, z_T), plane y-z (axis x), R 16 | car-side tangent y 143, CWT-side tangent y 175 |
| CWT pulley C | centre (80, 191, CWT top + 20), plane y-z, R 16 | in-run y 175, out-run y 207 |
| Under-car pulleys (diagonal) | S_near centre (84.7, 127.7), S_far centre (115.3, 29.3), R 16, plane along d̂ = (−0.296, 0.955) (axis (0.955, 0.296, 0)) | rising runs at (80, 143) and (120, 14). The midpoint (100, 78.5) is the car centre, so the car hangs true |
| Hitch A (car dead end) | over (120, 14), wall bracket on y0 at z≈1560 | rope-tension load-weighing sensor on its plate |
| Hitch B (CWT dead end) | over (80, 207), under the overhead hitch beam `{x:0,y:200,w:180,d:14}` z 1580..1600 | beam bears in the x0 wall and on the x1 roof stub |
| Governor | sheave centre (123, 146, 1520), plane x-z (axis y), R 10, on a bracket clamped to the y1 car rail | rope runs at x 113 and 133, y 146 |
| Tension pulley | (123, 146, 40), weighted arm on a bracket clamped to the y1 car rail foot | |
| Positioning tape | steel tape at (145, 147), 2.5 wide, top clamp ≈1500, spring tensioner in the pit | reader head on a 10 cm bracket off the car-roof corner |
| Travelling cable | fixed leg x=14, y=50 from a wall clamp at z 830; car leg x=14, y=100 from a hanger under the car back; loop plane x=14, R 25, centre y 75 | `L = 958.5`, so the loop clears the pit floor by 25 at L1 |
| Landing entrance (each floor) | frame face x 178..184, opening y 39..119 (0.80 m clear), jambs to y 31/127, header to Lf+230 | panels on the shaft side (x 175.5..177.5), slide ±y up to 40 |
| Hall station | jamb face x=184, y 128..136, z Lf+100..125 | ▲/▼ buttons (L1 ▲ only, L5 ▼ only) |
| Position indicator | header face x=184, y 70..90, z Lf+214..226 | floor digit and arrow, text fitted to its window |
| Landing control panel (LCP) | lobby side beside the L5 frame, `{x:180,y:128,w:16,d:34}`, z 1240..1440, door open ≈100° | VVVF, contactors, main switch, brake release, ARD battery |
| Car buffers (PU) | (100, 24) and (100, 132), r 7.5, top 81 (runby 15 below the plank ends at L1) | on pedestals 0..59 |
| CWT buffer (PU) | (80, 191), top 65 | CWT bottom at 80 when the car is at L5 |
| Pit ladder | x 170..180, y 145..180 | anchored to the pit floor and the L1 slab edge |

### Vertical stack (cm; Lf = 120 + 280·(f−1) ⇒ 120, 400, 680, 960, 1240)

- Pit floor top 0 (slab −25..0). Roof stub 1600..1625 (overhead 360).
- Car (at landing f): platform Lf−12..Lf; plank Lf−24..Lf−12; under-car pulley centres Lf−42 (bottom Lf−58); apron down to Lf−75; cab Lf..Lf+225; crosshead Lf+228..Lf+240; door operator Lf+225..Lf+250; balustrade (y1 roof edge) to Lf+295. The highest car-top part at L5 is 1535.
- CWT: frame 280 tall, C centre at its top + 20. Car at L5 ⇒ CWT bottom 80. Car at L1 ⇒ bottom 1200, top 1480, C top 1516.
- T centre z_T = 1556. Motor Ø40 (1536..1576), bedplate 1530..1534 on the y1 car-rail top and CWT-rail-1 top (both stop at 1530), with a 30 cm tie bracket to the x0 wall.
- **Travel share** `s = carPos / 11.2`. Car items move `[0,0,1120]·s`, CWT items `[0,0,-1120]·s`, the travelling-cable loop `[0,0,560]·s`.

These are starting values that satisfy the clearances worked out above: the car-side rope sits 7 cm from the cab and from the beam, the CWT 50 cm below the bedplate, the motor 3 cm off the car's plan. **The audit has the last word.** Put every number in `ROOT\layout.mjs` and derive the dependent ones by formula (sheave centres from tangents, d̂ from the two rising points) with `console.assert`s on the clearances, so a change in one place can't silently break another.

Decisions made here (with the reason):

- **Concrete back walls plus cut-away masonry near walls, with floor slabs and C160 common bracket beams kept.** Car rails need brackets on both sides of the car, and one side is the cut face. In masonry shafts, rails really are fixed to slab edges or steel bracket beams, so nothing floats and the audit's support graph reaches the pit through real parts.
- **Side counterweight on the near (y1) side, machine on top of the rails above it.** This MonoSpace-style layout puts the traction machine, the CWT, its pulley and three of the four rope runs in front of the car, where the reader can see the 2:1 path.
- **Diagonal underslung car pulleys.** The two rising runs straddle the car centre, so the car hangs true while both runs clear the rails.
- **Ropes, not belts.** The prompt asks for tube routes, and round ropes are what `tube.mjs` and `A.slide` model. They are drawn at r 0.55 (about 1.25 px) so they read at 1×. That is wider than Ø8 mm, an exaggeration stated in the caption ("4 × Ø8 mm ropes, drawn wider to read"). The readout and model use the true size.
- **No compensation chain.** At 11.2 m of travel the rope weight imbalance is about 4 × 0.24 kg/m × 11.2 m ≈ 11 kg, negligible, and compensation is normally used only above about 30 m. The caption says so.
- **Governor on the y1 car rail at the overhead, tension pulley in the pit on the same rail.** It is visible, keeps the rope beside the lever it trips, and stays consistent in every part.
- **PU (energy-accumulating) buffers.** These are allowed at 1.0 m/s. **Progressive safety gear**, required above 0.63 m/s.
- **Controller in a landing control panel beside the L5 frame (lobby side), drawn open.** The MRL has no machine room, so the inverter, brake release and ARD live at the top landing.

## 4. Parts list (≈125 named parts, about 300+ solids). [S] = stretch, after the must-haves are in

Every part sits on another part (support chain → rails or walls → pit slab, ground = `stand.*`).

**Hoistway and building** (piece `shaft`, tone `lo`/`mid`)
1. Pit floor slab (sectioned) 2. Back wall x0 (formwork joints running edge to edge, tie-hole dots) 3. Back wall y0 4. Wall cut faces 5–9. Floor slabs L1–L5 (L-shaped stubs, floor finish line, section edge) 10. Roof stub 11. Overhead hitch beam 12–16. Common bracket beams ×5 with end bearing plates 17. Sill support angles ×5 18. Shaft lights ×5 on y0 wall [S: conduit between them]

**Guide rails** (piece `rails`, `mid`)
19. Car rail y0 (T89) 20. Car rail y1 21. CWT rail 1 (T50) 22. CWT rail 2 23. Fishplates at the 500 cm rail joints 24. Rail base plates ×4 in the pit 25. Car-rail wall brackets (y0) ×5 26. Rail clips on the beams ×10 27. CWT rail 2 brackets on the slab edges ×5 28. Clip bolts (dots with rings)

**Traction machine** (piece `machine`)
29. Bedplate (two channels + cross plates) 30. Isolation pads ×4 31. Wall tie bracket 32. Gearless PMSM housing (flat disc stator, `G.solidOf` with smooth knots) 33. Cooling ribs (`G.ribsOf(…, { seams: true, fade })`) 34. Traction sheave, 4 grooves (`G.lathe` profile with groove steps) **lit** 35. Sheave face: spokes and index mark (rotating, face-plane group) 36. Outboard bearing bracket 37. Brake unit A 38. Brake unit B (dual circuit) 39. Brake disc 40. Encoder and its cap 41. Motor terminal box 42. Rope retainer bar across the sheave 43. Nameplate (the one engraved label allowed: `faceTextSvg` "PMSM") [S]

**Suspension 2:1** (piece `ropes`)
44. Hitch A plate and wall bracket 45. Hitch B plate 46. Hitch rods ×8 47. Compression springs ×8 (`G.ribsOf` helix, `twist`) 48. Nuts and split pins ×8 49. Wedge sockets ×8 50. Load-weighing sensor on hitch A plus its cable 51. Ropes hitch A → S_far ×4 52. Ropes S_near → T ×4 53. Ropes T → C ×4 54. Ropes C → hitch B ×4 55. Rope wraps on T, S_near, S_far, C (tube arcs ×16) 56. Under-car diagonal run ×4

**Car** (piece `car`, cab `hi`, sling `mid`)
57. Sling uprights ×2 58. Crosshead 59. Plank 60. Platform 61. Diagonal pulley beam under the car 62. S_far pulley (rotating marks) 63. S_near pulley (rotating marks) 64. Pulley guards [S] 65–68. Roller guides ×4 (base plate + 3 rollers each) 69–70. Progressive safety gear ×2 (wedge housings on the blades) 71. Safety linkage and synchronising rod 72. Governor-rope lever and rope clamp 73. Cab back wall with handrail 74. Cab far side wall (y0) with panel seams 75. COP on the far side wall (5 buttons, display, door-open/close, alarm) 76. Cab corner posts (the near y1 side panel is cut away, the posts stay) 77. Ceiling with light panel 78. Car floor finish 79–80. Car door panels ×2 81. Car door header, track, hangers 82. Door operator (motor, belt, pulleys, controller box) 83. Door coupler vane 84. Light curtain strips ×2 85. Car sill 86. Apron / toe guard 87. Car-top inspection station (stop, up, common, down) 88. Car-top balustrade (posts, rails, toe board) 89. Car-top junction box and travelling-cable hanger 90. Limit-switch cam on the y1 upright 91. Positioning reader head and bracket 92. Car-top light [S]

**Counterweight** (piece `cwt`)
93. CWT frame (uprights, top and bottom channels) 94. Filler weights ×8 (separate slabs, each with a seam) 95. Filler retainer bar 96. CWT pulley C (rotating marks) 97. CWT guide shoes ×4 98. Buffer striker plate

**Safety and positioning** (piece `safety`)
99. Overspeed governor (sheave, flyweight housing, tripping switch) on its rail bracket 100. Governor rope (two static runs and the wraps) 101. Tension pulley, weighted arm, bracket 102. Final limit switch, top 103. Final limit switch, bottom 104. Positioning tape, top clamp, pit tensioner 105. Door-zone magnets on the tape [S]

**Pit** (piece `pit`)
106. Car buffers ×2 and pedestals 107. CWT buffer and pedestal 108. Pit ladder (stiles, rungs, brackets) 109. Pit stop switch box 110. Pit light and socket [S] 111. Travelling cable: wall clamp, fixed leg, loop, car leg, car hanger 112. CWT screen in the pit [S]

**Landings ×5** (piece `landings`, one group per floor)
113. Landing frame (jambs + header) 114. Landing door panels ×2 115. Hanger track and hangers (shaft side) 116. Interlock (lock box, hook, contacts) 117. Door closer (weight on cord or spring) 118. Landing sill (with groove) 119. Fascia and toe guard (shaft side) 120. Hall station (plate, ▲/▼ buttons) 121. Position indicator (display window, digit, arrow)

**Controller** (piece `controller`)
122. LCP cabinet with open door 123. VVVF inverter (heatsink fins, Hz display) 124. Contactors ×3 125. Main switch 126. Manual brake release lever 127. ARD battery pack 128. Terminal strip 129. Cable duct LCP → machine (tube), brake-release Bowden cable (tube), encoder cable (tube)

**Must-have core (FEAT-001):** 1–28 plus placeholder car and CWT boxes. **Mechanism (FEAT-002):** 29–98. **Systems (FEAT-003):** 99–129. Items marked [S] are added only after the audit and line checks are at zero.

## 5. Kit helpers per part

Wrappers live in `ROOT\lib\helpers.mjs`, adapted from `arcade-cabinet\build.mjs` lines 41–170. `makeHelpers(R, P)` returns `{ put, record, box, slab, prism, turned, disc, ball, cable, route, ropeSlide, face, at, S, Ln, Dots }`. Each one records its shape as it puts its item, so nothing escapes the audit.

| Kit helper | Parts |
|---|---|
| `k.slabOf` + `A.slab` (`box`) | walls, beams (C160 as web + 2 flange slabs), plates, brackets, cab panels, platform, plank, crosshead, CWT channels, filler weights, door panels, frames, sills, LCP, contactors, inverter, battery, switch boxes, buffer pedestals, ladder stiles and rungs |
| `k.extrude` (`convex:false`) + `A.extruded` | L-shaped slabs, rail T-profiles (extruded along z from the T polygon: foot + web), safety-gear housings, inspection-station box |
| `prismPaths` / `G.prismOf` + `A.prism` | diagonal pulley beam (axis d̂), brackets at angles, the open LCP door (rotated 100°) |
| `k.cylinder` + `A.cylinder` | PU buffers (with `k.knurl`-style vertical lines for the cellular texture, or `ribsOf` with seams), rail base studs, hall buttons |
| `G.lathe` / `G.solidOf` + `A.solid` / `A.lathe` | traction sheave with 4 groove steps, car and CWT pulleys, governor and tension pulleys, motor housing (smooth knots for the rounded rim, analytic `smooth: { slope }` if larger than a fitting), brake disc, encoder, guide rollers, wedge sockets, hitch rods |
| `G.disc` / `G.ringBand` | flanges, bearing caps, hub rings, nuts, roller tyres |
| `G.sphereOf` + `A.ball` | ball terminations, knobs, the brake-release lever knob |
| `G.ribsOf(…, { seams: true, fade })` + `k.fadedSvg` | motor cooling ribs, hitch spring helices (`twist`), PU buffer cells |
| `G.arcOf` / `G.circleOf` / `G.dotsOf(…, { fade })` | seams, bolt circles on the motor and sheave faces |
| `tube.mjs` `tubePieces` + `tubeSvg`, `R.route` | rope wraps (`G.arcPoints` on each sheave), the under-car diagonal run, governor rope runs, travelling-cable loop and its legs, LCP → machine duct, brake-release Bowden cable, encoder and load-sensor cables |
| `G.rodOut`-style clip + `A.slide` (`ropeSlide`) | **every vertical rope run whose length changes** (hitch A → S_far, S_near → T, T → C, C → hitch B, and the travelling-cable fixed leg): drawn once with `tubePieces` at full length (rest length plus stroke) as one chunk, wrapped in a `clipPath` whose path carries `data-hold`, moved with its ride's translate, and held still with `k.holdStill(el, [dx, dy])` so it stays cut at the fixed end (gland = hitch socket or sheave tangent), exactly the craft.md "Rod out of a gland" pattern. Record `A.slide(F, 0, restLength, r)` with `F.a` pointing down from the fixed end |
| `k.topTicks` / `k.sideTicks` | a ruler strip on the positioning tape's top clamp plate (ticks rooted on the strip's edge, never on a bare face) |
| `k.coil` | not usable for vertical springs (x/y axes only): use the `ribsOf` helix |
| `k.planOutline`, `k.sideSeam`, `k.ringSeam` | grooves, panel seams on the cab and LCP, weld lines on the bedplate (as `inner`) |
| `k.dotsSvg` / `k.ring` | screws and rivets (0.4–0.55), bolts on brackets and clips |
| `planeMatrix(o, ex, ey)` (from the arcade) | face-plane groups: rotating sheave faces, position indicators, COP and inverter displays, hall buttons, text |
| `k.faceTextSvg` | displayed digits (machine text, fitted to the window), the one engraved "PMSM" label |
| `A.recorder`, `A.settle`, `A.auditOrExit` | everything. See section 7 |

The car-leg travelling cable is a special case. Its top moves with the car while its bottom moves at half speed, which no single translation describes. Record it as `A.slide` from the loop's **rest** tangent (fixed) up to the car hanger, with `ride: "travel"` and `move = [0,0,1120]`. That is a conservative superset (its bottom never rises), valid because nothing else is allowed in that column: assert it in `layout.mjs`. Draw it exactly: the rod is a child of the car group, clipped below by a clip that the live code shifts by `(loopOffset − carOffset)`. Give the leg and its loop one `owner` so they don't fail against each other.

## 6. Painter's order and moving parts

- One recorder: `const R = A.recorder(P, { order: ["travel"], spring: {} })`. `shareOf` reads `ride`, so every moving item gets `ride: "travel"` and its own `move`, and its `piece` is its highlight group (`car`, `cwt`, `ropes`, …). Static items keep `move` [0,0,0]. Because there is one ride, `prefixStates` adds nothing and a numeric state means "the car at share s".
- Travel states: `const TRAVEL_STATES = A.uniformStates(56)` (every 20 cm of car travel). `A.settle(R, P, { states: TRAVEL_STATES })`, then `R.items.sort((a, b) => a.key - b.key)`, then `A.auditOrExit(R, P, { frames: A.uniformStates(112), apart: true, crowd: CROWD_OK })`. `apart: true` makes the audit check state 1 (car at L5) for clearance, crowding and loose ends.
- The page **re-sorts every frame** by `key + lift·share` (`lift = move·V`), re-appending DOM nodes only when the order changes, exactly as the Raptor's `place()` does. Each item is emitted as `<g class="it" data-name data-group data-k data-m data-ride>`. Without the re-sort, the page would draw the s = 0 order, which differs from what the audit proved.
- Split anything that wraps: roller guides (near roller, blade, far roller and tip roller are separate items around the rail), the CWT shoes around their rails, the hitch springs around their rods (front helix drawn after the rod), and the balustrade's near and far rails around the inspection station.
- Door panels are two motions: car travel on the outer group and slide on an inner `<g data-door>`. The audit records them closed. `node build.mjs --audit --open` rebuilds with the car at L1 and car + L1 landing panels open (shapes moved by the open slide) and must also print `audit passed`.
- Live content (rotating faces, displays, lit call buttons) lives inside its item's svg, so it is drawn in the settled order. Nothing is drawn outside the sorted layer except the halo.

## 7. Frame it

`k.plateHtml({ fig: "Fig 1", title: "Anatomy of an MRL traction elevator", hint: "1–5 or a call button · hover a part", readout, keys, caption, body })`.

- **Readout** (bottom right, live, at most about 40 characters): `L3 ▲ 1.00 m/s · rope 2.00 m/s · 119 rpm`. Every figure comes from `derived()`.
- **Status / part line** (a `<p class="mrl-info" aria-live="off">` directly under the stage, inside the plate): at rest it shows the live state, e.g. `Car 5.60 m above L1 · counterweight 5.60 m · load 38 % (240 kg) · doors open · governor 0 rpm (trips at 1.15 m/s)`. While a part is hovered or focused it shows that part's name and one true sentence from `ROOT\info.mjs`, whose strings are built from `SPEC` so they cannot disagree with the model.
- **Legend keys:** `lit` = traction sheave (turns at twice car speed in rope terms); `raised` = the car, the subject; `edge` = the 2:1 suspension ropes.
- **Parts buttons:** about 14 numbered `<button class="mrl-part" data-group>` (01 Traction machine … 14 Pit). Hover or focus highlights the group (`.it[data-on]` steps tones up, `[data-focus]` steps the rest down, as in the Raptor CSS) and fills the part line.
- **Caption** (true numbers): 630 kg / 8 persons, 1.0 m/s, 5 landings at 2.8 m (11.2 m travel), 1.2 m pit, 3.6 m overhead, 2:1 with 4 × Ø8 mm ropes drawn wider to read, Ø320 sheave (D/d 40), 119 rpm and 19.9 Hz at rated speed, CWT 1015 kg (car + 50 % of load), progressive safety gear, governor tripping at 1.15 m/s, PU buffers, no compensation chain at this rise, controller and ARD in the top-landing panel.
- **SVG `label`:** describes the object and what it shows.

## 8. Make it live (`ROOT\live.js`, `__DATA__` replaced by the build)

- **One loop** (`requestAnimationFrame`, dt clamped to 1/30 s). It calls `model.step(state, dt)`, then `derived()`, then `place()`: translate every moving node (car, CWT, loop), `holdStill` on rope clips, shift the car-leg clip, re-sort, rotate faces (`rotate(θ)` inside each face-plane group, sign per sheave from the rope direction), slide door panels, write the displays (COP, the 5 position indicators, inverter Hz), light the registered call buttons (`data-lit`), and write the readout and status line. The loop stops when the car is idle and nothing is pending, and offscreen (`IntersectionObserver`, `rootMargin: "120px 0px"`, read the last entry).
- **Pointer:** delegate clicks on the svg. `[data-call="3"][data-dir="up"]` hall buttons and `[data-car-call="3"]` COP buttons call `model.call`. Hovering any `.it` with `data-group` highlights the group and fills the part line. Clicks and hovers set `touch-action: pan-y` on the stage.
- **Keyboard** on the focusable stage (`tabindex="0" role="group"`, with an aria-label that explains the keys): `1`–`5` car call to that landing, `↑`/`↓` one landing up or down from the current or target landing, `O` reopen the doors at a stop, `+`/`−` board or alight one person while the doors are open, `Escape` stop the tour. The parts buttons are native buttons, so the explanation is keyboard-reachable.
- **Accessibility:** the svg has `role="img"` and an `aria-label`. A visually hidden `aria-live="polite"` region gets phase changes only (`departing L1`, `arriving L3`, `doors opening`), never per-frame numbers. `aria-valuetext`-style state goes into the stage's `aria-description` when a run ends. Focus ring: `outline: 1px solid var(--anatomy-muted); outline-offset: 6px`.
- **Reduced motion:** no tour, and the car jumps to the called landing (state set straight to arrived). Doors show open for the dwell, then closed, with no slide. The readout and displays update, and input still works.
- **Idle tour:** starts 1.4 s after the figure comes into view, plays `model.TOUR`, pauses on hover, focus or press, and resumes 3.6 s after the last input once the car is idle. A key pressed during the tour acts from the state the reader sees (don't reset to the tour's target).

## 9. Build and output

- `node build.mjs` writes `ROOT\mrl-elevator.html` (dark). `node build.mjs --light` writes `ROOT\mrl-elevator-light.html`. **Light is the primary design target:** judge every screenshot on the light page first.
- Script: `k.pageHtml({ title, theme, body, script: kitScript() + modelScript + LIVE, width: 650 })`, where `kitScript` comes from `../../.kiro/skills/anatomy/scripts/inline-kit.mjs`, `modelScript` = `model.mjs` with `^export ` stripped, and `LIVE` = `live.js` with `__DATA__` replaced. The page needs no lathe at runtime, because rotations are face-plane transforms and the rest are translations.
- CSS in `ROOT\mrl.css` (inlined): selection tones, display windows, lit buttons, focus ring, the part line, parts buttons, and the cut-face token (concrete section). Every colour is a token with a light value and a dark override.
- Build log line: `wrote <file> <KB> KB · <items> items · <solids> solids · scale <k>`.
- `--audit` runs the audit after writing. `--open` is the doors-open pose for the audit.

Files:

```
ROOT\build.mjs           orchestrates: flags, recorder, parts, settle, emit, page, audit
ROOT\layout.mjs          every dimension, the camera P, derived positions, clearance asserts
ROOT\model.mjs           pure model (inlined into the page)
ROOT\model.test.mjs      node:test checks
ROOT\info.mjs            part groups: id → { name, text } (built from SPEC)
ROOT\lib\helpers.mjs     makeHelpers(R, P): recorder-bound drawing helpers (from the arcade)
ROOT\parts\shaft.mjs  rails.mjs  machine.mjs  ropes.mjs  car.mjs  cwt.mjs
ROOT\parts\landings.mjs  controller.mjs  safety.mjs  pit.mjs     each: export function build(H, L)
ROOT\live.js             page behaviour
ROOT\mrl.css             page styles
ROOT\.agents\drive\*.json  drive.mjs action files
ROOT\shots\              screenshots (output only)
```

## 10. Verification (exact commands; PowerShell, cwd = ROOT, chain with `;`)

Browser prefix from `ROOT\.agents\ENV.md` (always set it first in the same command):

```powershell
$env:CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'; node C:\Users\k64163939\.kiro\skills\anatomy\scripts\<capture|drive|lines>.mjs ...
```

| Check | Command | Must print |
|---|---|---|
| Model | `node --test model.test.mjs` | all tests pass |
| Build both themes | `node build.mjs; node build.mjs --light` | two `wrote …` lines, no exceptions |
| Audit (light) | `node build.mjs --light --audit` | last line `audit passed` (every failing line 0) |
| Audit (doors open) | `node build.mjs --light --audit --open` | `audit passed` |
| Line ends (light, rest) | `$env:CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'; node C:\Users\k64163939\.kiro\skills\anatomy\scripts\lines.mjs mrl-elevator-light.html --out shots\lines-light.png` | `line ends: 0` |
| Line ends (dark) | same with `mrl-elevator.html --out shots\lines-dark.png` | `line ends: 0` |
| Line ends (poses) | `…\drive.mjs mrl-elevator-light.html --actions .agents\drive\poses.json --height 1500` where poses.json sends `["key","3"]`, waits `until` the readout or status says doors open, then `["lines","shots/lines-l3-open.png"]`, then `["key","5"]` … `until` arriving, `["lines","shots/lines-l5.png"]` | each `line ends: 0` |
| Desktop | `…\capture.mjs mrl-elevator-light.html --out shots\desk-light.png --height 1500` (and dark) | no console errors, no sideways scroll |
| Phone | `…\capture.mjs mrl-elevator-light.html --out shots\phone-light.png --width 390 --height 1200` | reads at 390 |
| Hover | `…\capture.mjs mrl-elevator-light.html --out shots\hover-machine.png --height 1500 --hover 0.30,0.10` | machine group highlighted, part line filled |
| Motion | `…\capture.mjs mrl-elevator-light.html --out shots\run.png --height 1500 --key 5 --times 1500,4000,8000,12000,15000` | car climbing, CWT descending, readout speed and rpm changing |
| Slow sheet | `…\drive.mjs mrl-elevator-light.html --actions .agents\drive\sheet.json --height 1500` (`["key","Escape"]`, `["key","2"]`, `["slow",0.25]`, `["sheet","shots/sheet.png",150,16]`, `["slow",1]`) | smooth eased start and stop, sheaves turning the right way |
| Reduced | `…\capture.mjs mrl-elevator-light.html --out shots\still.png --height 1500 --reduced --key 4` | car at L4, no tour |
| 4× close-ups | `…\capture.mjs mrl-elevator-light.html --out shots\z-machine-light.png --height 1500 --zoom x,y,w,h` (card px from the desktop shot) for: machine and brake, hitch A and B sockets and springs, T wraps, C on the CWT, under-car pulleys, roller guides and safety gear, governor and tension pulley, a landing entrance (lock, hanger, sill, hall station, indicator), LCP internals, pit (buffers, ladder, stop switch, cable loop). Both themes | read every PNG |

Read every PNG. Fix faults in the order `verify.md` "Close-ups" step 4 lists them. Last comes the detail pass: a 4× grid over the whole drawing (this is a Hero), adding real parts wherever a face or corner is bare.

---

# Implementation steps

- [ ] 1. **FEAT-001: scaffold, truth and the hoistway (working page early).** Write `model.mjs` and `model.test.mjs` (section 2), `layout.mjs` (section 3 tables, camera, asserts), `lib/helpers.mjs` (arcade helpers bound to the recorder, plus `ropeSlide` and `face`), `info.mjs` (stub), `parts/shaft.mjs` (items 1–18) and `parts/rails.mjs` (19–28), placeholder car and CWT boxes riding `travel`, `build.mjs` (flags, recorder with `order:["travel"]`, settle on travel states, emit `data-k/m/ride/group`, plate card, both themes, audit hook), `mrl.css`, and a minimal `live.js`: model-driven car and CWT translation with per-frame re-sort and keys 1–5.
      Files: `model.mjs`, `model.test.mjs`, `layout.mjs`, `lib/helpers.mjs`, `info.mjs`, `parts/shaft.mjs`, `parts/rails.mjs`, `build.mjs`, `live.js`, `mrl.css`
      Verify: `node --test model.test.mjs` passes; `node build.mjs; node build.mjs --light` writes both pages; `node build.mjs --light --audit` ends `audit passed`; capture `shots\desk-light.png` and `--key 5 --times 2000,8000` shows the car and CWT moving opposite ways; lines check `line ends: 0`.

- [ ] 2. **FEAT-002: the mechanism.** Replace the placeholders. `parts/machine.mjs` (29–43), `parts/ropes.mjs` (44–56, ropes as `ropeSlide` runs plus tube wraps and the diagonal run, hitch sockets, springs, load sensor), `parts/car.mjs` (57–92), `parts/cwt.mjs` (93–98). Rotating face groups for T, S_near, S_far and C. In `live.js`: rotation from `derived()` angles, rope clips held still, car-door inner groups. Depends on 1.
      Files: `parts/machine.mjs`, `parts/ropes.mjs`, `parts/car.mjs`, `parts/cwt.mjs`, `build.mjs`, `live.js`, `mrl.css`, `info.mjs`, `layout.mjs`
      Verify: `node build.mjs --light --audit` → `audit passed`; lines (light and dark) `line ends: 0`; the 4× close-ups of machine, hitches, T and C wraps, under-car pulleys and roller guides read cleanly; a motion capture shows the sheave index mark turning.

- [ ] 3. **FEAT-003: landings and safety systems.** `parts/landings.mjs` (113–121, ×5 floors, hall buttons with `data-call`/`data-dir`, indicator windows), `parts/controller.mjs` (122–129, open LCP with Hz display), `parts/safety.mjs` (99–105), `parts/pit.mjs` (106–112, travelling cable with the car-leg special case), cables via `cable()`. The `--open` pose. Depends on 2.
      Files: `parts/landings.mjs`, `parts/controller.mjs`, `parts/safety.mjs`, `parts/pit.mjs`, `build.mjs`, `layout.mjs`, `info.mjs`, `live.js`, `mrl.css`
      Verify: `node build.mjs --light --audit` and `node build.mjs --light --audit --open` both → `audit passed`; lines `line ends: 0` in both themes; 4× close-ups of a landing entrance, the LCP, the governor and the pit.

- [ ] 4. **FEAT-004: live behaviour, accessibility, card and full verification.** The full controller loop (dispatcher, coupled car and landing doors, dwell), displays, lit calls, hall and COP clicks, keys, parts buttons, hover info, the status line, aria, reduced motion, idle tour, offscreen stop, final caption and legend. Then the whole section 10 verification set in both themes, poses included, with the 4× detail pass. Depends on 3.
      Files: `live.js`, `build.mjs`, `info.mjs`, `mrl.css`, `.agents\drive\poses.json`, `.agents\drive\sheet.json`, `shots\*.png`
      Verify: every row of the section 10 table passes; screenshots read as a real, highly detailed elevator at 1× and 4×.
