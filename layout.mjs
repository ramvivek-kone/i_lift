// Every dimension of the figure, in centimetres (1 world unit = 1 cm). x is depth (back wall x0 to the
// landing side), y is width (wall y0 to the counterweight side), z is up. Dependent values are derived
// here by formula, and the clearances that hold them apart are asserted, so a change in one place
// cannot silently break another.
import * as k from "../../.kiro/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.kiro/skills/anatomy/kit/lathe.mjs";
import { SPEC } from "./model.mjs";

export const W = 520;
export const H = 1040;
export const AZIMUTH = 50;
export const ELEVATION = 30;
export const TRAVEL_CM = Math.round((SPEC.floors - 1) * SPEC.floorHeight * 100);

// ---- Hoistway and building ------------------------------------------------------------------
export const SHAFT = { x0: 0, x1: 180, y0: 0, y1: 235 };
export const WALL_T = 20;
export const PIT_TOP = 0;
export const PIT_SLAB = { plan: { x: -20, y: -20, w: 200, d: 255, r: 0 }, z: -25, h: 25 };
export const ROOF = 1600;
export const ROOF_T = 25;
export const TOP = ROOF + ROOF_T;
export const WALL_X0 = { x: -20, y: -20, w: 20, d: 255, r: 0 };
export const WALL_Y0 = { x: 0, y: -20, w: 180, d: 20, r: 0 };
// Slab stubs widened past the 50 / 40 cm minimum so the tall card's width is used (composition check).
export const LOBBY_X = 275;
export const SIDE_Y = 320;
export const SLAB_T = 25;
export const Lf = (f) => 120 + 280 * (f - 1);
export const LANDINGS = [1, 2, 3, 4, 5].map(Lf);
// L-shaped slab ring outside the hole: the lobby stub (x 180..230) and the side stub (y 235..275).
export const SLAB_RING = [
  [SHAFT.x1, -WALL_T], [LOBBY_X, -WALL_T], [LOBBY_X, SIDE_Y], [-WALL_T, SIDE_Y], [-WALL_T, SHAFT.y1], [SHAFT.x1, SHAFT.y1],
];

// Common C160 bracket beam per floor: web on the car side (y 150), flanges opening toward +y.
export const BEAM = { x0: 1.5, x1: 178.5, y0: 150, y1: 157, web: 0.75, flange: 1.05, top: (f) => Lf(f) - 25, bottom: (f) => Lf(f) - 41 };
export const BEAM_PLATE = 1.5;
// Overhead hitch beam (an I-section) under the roof stub.
export const HITCH_BEAM = { x0: 1.5, x1: 178.5, y0: 200, y1: 214, z0: 1580, z1: ROOF, flange: 1.5, web: 1.2 };

// ---- Guide rails (blades point at what they guide) -------------------------------------------
// True section sizes: T89/B is 89 × 62 mm with a 15.9 mm blade, T50/A 50 × 50 × 5 mm.
export const T89 = { foot: 8.9, footT: 1.0, blade: 1.6, height: 6.2 };
export const T50 = { foot: 5.0, footT: 0.8, blade: 0.5, height: 5.0 };
export const RAIL_BASE = 2;
export const RAILS = [
  { id: "car-y0", x: 100, foot: 8, dir: 1, kind: T89, top: 1560 },
  { id: "car-y1", x: 100, foot: 150, dir: -1, kind: T89, top: 1530 },
  { id: "cwt-1", x: 80, foot: 157, dir: 1, kind: T50, top: 1530 },
  { id: "cwt-2", x: 80, foot: 224, dir: -1, kind: T50, top: 1560 },
];
export const tipOf = (rail) => rail.foot + rail.dir * rail.kind.height;
export const RAIL_JOINTS = [500, 1000, 1500];

// ---- Car (outer cab plan, centre) and counterweight ------------------------------------------
export const CAB = { x: 28, y: 22, w: 144, d: 114, r: 1 };
export const CAB_H = 225;
export const CAR_C = [CAB.x + CAB.w / 2, CAB.y + CAB.d / 2];
export const CWT = { x: 72, y: 168, w: 16, d: 46, r: 0.6 };
export const CWT_H = 280;
export const CWT_BOTTOM_REST = 1200;

// ---- 2:1 suspension: sheaves from tangents -------------------------------------------------------
export const SHEAVE_R = 16;
export const T = { c: [80, 159, 1556], r: SHEAVE_R, axis: [1, 0, 0] };
export const T_CAR_Y = T.c[1] - T.r;
export const T_CWT_Y = T.c[1] + T.r;
export const C = { c: [80, T_CWT_Y + SHEAVE_R, CWT_BOTTOM_REST + CWT_H + 20], r: SHEAVE_R, axis: [1, 0, 0] };
export const HITCH_B = [80, C.c[1] + SHEAVE_R];
export const RISE_NEAR = [80, T_CAR_Y];
export const RISE_FAR = [120, 14];
const along = G.unit3([RISE_FAR[0] - RISE_NEAR[0], RISE_FAR[1] - RISE_NEAR[1], 0]);
export const D_HAT = [-along[0], -along[1], 0];
export const S_NEAR = { c: [RISE_NEAR[0] + along[0] * SHEAVE_R, RISE_NEAR[1] + along[1] * SHEAVE_R], r: SHEAVE_R, axis: [D_HAT[1], -D_HAT[0], 0] };
export const S_FAR = { c: [RISE_FAR[0] - along[0] * SHEAVE_R, RISE_FAR[1] - along[1] * SHEAVE_R], r: SHEAVE_R, axis: [D_HAT[1], -D_HAT[0], 0] };
export const HITCH_A = { at: RISE_FAR, z: 1560 };
export const MOTOR = { r: 20, z0: 1536, z1: 1576 };
export const BEDPLATE = { z0: 1530, z1: 1534 };

// ---- Safety, travelling cable, landings, controller, pit ------------------------------------------
export const GOVERNOR = { c: [123, 146, 1520], r: 10, runs: [113, 133] };
export const TENSION = { c: [123, 146, 40], r: 10 };
export const TAPE = { x: 145, y: 147, w: 2.5, top: 1500 };
// Travelling cable: the car leg hangs from a hanger 20 below the car floor; its length puts the bottom of
// the loop 50 above the pit floor with the car at L1.
export const CABLE = { x: 14, fixedY: 50, carY: 100, clampZ: 830, loopY: 75, loopR: 25, r: 1.1, hanger: -20, length: 858.5 };
export const loopCentreZ = (carZ0) => (CABLE.clampZ + carZ0 + CABLE.hanger + Math.PI * CABLE.loopR - CABLE.length) / 2;
export const ENTRANCE = { face: [178, 184], open: [39, 119], jambs: [31, 127], header: 230, panels: [175.5, 177.5], slide: 40 };
export const HALL = { x: 184, y: [128, 136], z: [100, 125] };
export const INDICATOR = { x: 184, y: [70, 90], z: [214, 226] };
// Beside the L5 frame's wide jamb (which ends at y 137), its near side cut away like the cab's.
export const LCP = { plan: { x: 180, y: 140, w: 16, d: 34, r: 0 }, z: [1240, 1440], doorDeg: 100 };
// Car buffers sit symmetric about the car centre, clear of the plank-end safety gears and the diagonal
// under-car pulleys and ropes, under two striker blocks on the platform.
export const CAR_BUFFERS = [[60, 40], [140, 118]];
export const BUFFER_R = 7.5;
export const CAR_BUFFER_TOP = 81;
export const CWT_BUFFER = { at: [80, 191], top: 65 };
export const LADDER = { x: [170, 180], y: [145, 180] };

// ---- Ropes: 4 per run, one per groove, at these offsets along each sheave's axis ----------------------
export const ROPE = { r: 0.55, offsets: [-3, -1, 1, 3] };
export const S_AXIS = S_NEAR.axis;
// Along the diagonal from S_near toward S_far (unit, horizontal).
export const S_ALONG = along;
export const PULLEY_Z = (f) => Lf(f) - 42;
// Where the vertical car-side run ends under T and its short lead into T's groove begins.
export const T_LEAD_Z = T.c[2] - 16;
// Car frame (sling), relative to the landing level z0 of the car.
export const SLING = { x0: 94, x1: 106, plank: [-24, -12], up: { x0: 95, x1: 105, y0: [15, 20], y1: [138, 143] }, crosshead: [228, 240] };
// Under-car pulley beam: a box section on the far side (-axis) of the pulley plane, along the diagonal.
export const PULLEY_BEAM = { s: [-11.4, -5.4], z: [-48, -24], half: 56 };
export const DOOR = { car: [173, 174.5], landing: [175.5, 177.5], left: [39.5, 79], right: [79, 118.5], slide: 39.5, height: 212 };

// Highest car-top part at L5, plank bottom, and the CWT at both ends of travel.
export const CAR_TOP_AT_L5 = Lf(5) + 295;
export const CWT_BOTTOM_AT_L5 = CWT_BOTTOM_REST - TRAVEL_CM;
export const C_TOP_REST = C.c[2] + SHEAVE_R;

// ---- Camera ------------------------------------------------------------------------------------
const ENVELOPE = { x: -20, y: -20, w: LOBBY_X + 20, d: SIDE_Y + 20, r: 0 };
export const P = k.fitProjection([...k.boxCorners(ENVELOPE, -25, TOP)], W, H, { pad: 26, azimuth: AZIMUTH, elevation: ELEVATION });
export const V = G.viewOf(P);
export const KS = G.scaleOf(P);

// ---- Clearances ------------------------------------------------------------------------------
const near = (a, b, at) => console.assert(a >= b, `layout: ${at} (${a.toFixed(2)} < ${b})`);
const [yRailTip0, yRailTip1, yCwtTip1, yCwtTip2] = RAILS.map(tipOf);
near(CAB.y - yRailTip0, 5, "cab clears car rail y0");
near(yRailTip1 - (CAB.y + CAB.d), 5, "cab clears car rail y1");
near(CWT.y - yCwtTip1, 3, "CWT clears CWT rail 1");
near(yCwtTip2 - (CWT.y + CWT.d), 3, "CWT clears CWT rail 2");
near(RISE_NEAR[1] - (CAB.y + CAB.d), 7, "car-side rope clears the cab");
near(BEAM.y0 - RISE_NEAR[1], 7, "car-side rope clears the bracket beams");
near(CAB.y - RISE_FAR[1], 7, "far rising rope clears the cab");
near(BEDPLATE.z0 - C_TOP_REST, 10, "CWT pulley clears the bedplate at L1");
near(CWT_BOTTOM_AT_L5 - CWT_BUFFER.top, 15, "CWT clears its buffer at L5");
near(HITCH_BEAM.z0 - CAR_TOP_AT_L5, 40, "car top clears the hitch beam at L5");
near(ROOF - CAR_TOP_AT_L5, 60, "overhead clearance above the car at L5");
near(Lf(1) - 24 - CAR_BUFFER_TOP, 15, "car buffer runby");
near(RAILS[1].top - (Lf(5) + CAB_H), 0, "car rail y1 reaches above the cab at L5");
near(HITCH_BEAM.z0 - (CWT_BOTTOM_REST + CWT_H), 60, "hitch beam clears the CWT frame at L1");
near(loopCentreZ(Lf(1)) - CABLE.loopR - PIT_TOP, 25, "travelling-cable loop clears the pit floor at L1");
near(Lf(1) + CABLE.hanger - loopCentreZ(Lf(1)), 10, "car leg has length at L1");
// The car leg is recorded as a slide from the loop's rest tangent up to the hanger, a superset of where it
// really is; that holds only if nothing else uses its column (x = 14, y = 100) below the car.
near(CAB.x - CABLE.x - CABLE.r, 10, "car leg column clears the car back");
near(CABLE.carY - CABLE.fixedY - 2 * CABLE.r, 40, "the two legs of the travelling cable stay apart");
near(Math.min(...CAR_BUFFERS.map(([x, y]) => Math.hypot(x - CABLE.x, y - CABLE.carY))) - BUFFER_R - 9, 10, "car leg column clears the car buffers");
console.assert(Math.abs((S_NEAR.c[0] + S_FAR.c[0]) / 2 - CAR_C[0]) < 0.5 && Math.abs((S_NEAR.c[1] + S_FAR.c[1]) / 2 - CAR_C[1]) < 1, "layout: pulley midpoint is the car centre");
console.assert(T.c[1] - T.r === RISE_NEAR[1] && C.c[1] - C.r === T_CWT_Y, "layout: sheave tangents meet the rope runs");
