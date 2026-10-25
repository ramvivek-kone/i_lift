// 2:1 suspension (plan items 44-56): four ropes per run. The two dead-end hitches (A on wall y0 over the far
// car pulley, B under the overhead beam over the counterweight's out-run) carry a wedge socket, rod, spring
// and nut per rope. Every vertical run whose length changes is one sliding rope clipped at its fixed end;
// the wraps on every sheave and the run under the car are tube routes.
import * as G from "../../../.kiro/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../../.kiro/skills/anatomy/kit/tube.mjs";
import * as A from "../../../.kiro/skills/anatomy/kit/audit.mjs";

const Z = [0, 0, 1];

// One hitch assembly per rope: wedge socket below the plate, rod, spring and nut above it.
function hitch(H, name, [x, y], { socket, plate, spring }) {
  const { Ln, P } = H;
  const owner = name;
  const F = (z) => G.frameOf([x, y, z], Z, [1, 0, 0], [0, 1, 0]);
  const S = H.scope({ piece: "ropes", group: "hitches" });
  S.turned(`${name}.socket`, F(socket), [[0, 0.62], [1.4, 0.72], [6.5, 0.92], [8.6, 0.92], [9.2, 0.7], [10, 0.7]], { tone: "mid" }, { owner, inner: Ln(G.arcOf(F(socket), 6.5, 0.92, P), { tone: "faint" }) });
  S.disc(`${name}.rod`, F(socket + 10), 0, plate[0] - socket - 10, 0.4, { tone: "mid" }, { owner });
  const ribs = G.ribsOf(F(plate[1]), 0.15, spring - 0.15, 0.95, 6, P, { twist: 0.9, fade: [0.05, 0.5] });
  S.disc(`${name}.spring`, F(plate[1]), 0, spring, 0.95, { tone: "mid" }, { owner, inner: H.Faded(ribs, { tone: "lo" }) });
  S.disc(`${name}.nut`, F(plate[1] + spring), 0, 1.2, 0.8, { tone: "mid" }, { owner });
  S.disc(`${name}.end`, F(plate[1] + spring + 1.2), 0, 1.6, 0.4, { tone: "mid" }, { owner, extra: H.Dots([H.at([x, y, plate[1] + spring + 2.8])], { size: 0.35, tone: "mid" }) });
}

// A rope route (wrap or under-car run) as depth-sorted tube chunks, recorded for the audit.
function ropeRoute(H, name, points, { ride, move, touch, ends, breaks = [] }) {
  const radius = 0.55;
  H.route(name, points, radius, { piece: "ropes", group: "ropes", ride, move, touch, bundle: "suspension", ...(ends ? { ends } : {}) });
  tubePieces(points, radius, H.P, { maxLength: 10, spacing: 0.6, breaks }).forEach((piece, index) =>
    H.put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone: "hi" }), [A.tube(piece.points, piece.radii)], { piece: "ropes", group: "ropes", ride, move, route: name, chunk: index, bias: 0.05 }),
  );
}

export function build(H, L) {
  const { Dots, at } = H;
  const bolt = (p) => Dots([at(p)], { size: 0.45, tone: "mid" });
  const S = H.scope({ piece: "ropes", group: "hitches" });
  const car = { ride: "travel", move: [0, 0, L.TRAVEL_CM] };
  const cwt = { ride: "travel", move: [0, 0, -L.TRAVEL_CM] };
  const { offsets, r } = L.ROPE;
  const z0 = L.PULLEY_Z(1);
  const ax = L.S_AXIS;
  const atS = (p, o) => [p[0] + ax[0] * o, p[1] + ax[1] * o];

  // 44. Hitch A: a wall plate on wall y0 and a shelf over the far rising run, with the load-weighing sensor.
  const HA = { socket: 1538, plate: [1555, 1558], spring: 6 };
  S.box("ropes.hitchA.wall", [108, 0, 1540], [132, 1.5, 1575], { tone: "mid" }, { r: 0.2, extra: [[109.5, 1542], [130.5, 1542], [109.5, 1573], [130.5, 1573]].map(([x, z]) => bolt([x, 1.5, z])).join("") });
  S.box("ropes.hitchA.shelf", [110, 1.5, HA.plate[0]], [130, 22, HA.plate[1]], { tone: "mid" }, { r: 0.3 });
  S.box("ropes.hitchA.sensor", [125, 15, HA.plate[1]], [128.5, 21, HA.plate[1] + 3], { tone: "mid" }, { r: 0.4, steps: 3, group: "hitches" });
  H.cable("ropes.hitchA.sensor.cable", [[128.5, 18, HA.plate[1] + 1.5], [131, 18, HA.plate[1] + 1.5], [131, 1.5, HA.plate[1] + 1.5]], 0.35, { piece: "ropes", group: "hitches", bend: 1.2, ends: [true, false], shells: [false, true] });

  // 45. Hitch B: a plate on the top of counterweight rail 2 (as on MonoSpace-style machines), reaching
  // over the out-run; an overhead beam here would hide the traction sheave.
  const HB = { socket: 1538, plate: [L.RAILS[3].top, L.RAILS[3].top + 3], spring: 6 };
  S.box("ropes.hitchB.plate", [72, 201, HB.plate[0]], [88, 225, HB.plate[1]], { tone: "mid" }, { r: 0.3, extra: bolt([73, 222, HB.plate[1]]) + bolt([87, 222, HB.plate[1]]) });

  offsets.forEach((o, i) => {
    const pA = atS(L.RISE_FAR, o);
    const pB = [L.HITCH_B[0] + o, L.HITCH_B[1]];
    // 46-49. Rods, springs, nuts and wedge sockets.
    hitch(H, `ropes.hitchA.${i}`, pA, HA);
    hitch(H, `ropes.hitchB.${i}`, pB, HB);

    // 51-54. The four vertical runs, each one sliding rope.
    const near = atS(L.RISE_NEAR, o);
    H.ropeSlide(`ropes.A.${i}`, [pA[0], pA[1], HA.socket], [pA[0], pA[1], z0], r, { ...car, piece: "ropes", group: "ropes" });
    // The car-side run rises exactly vertically from its pulley groove (offset along the pulley axis) to just
    // under T, where a short lead in the wrap meets T's groove (offset along x).
    H.ropeSlide(`ropes.car.${i}`, [near[0], near[1], L.T_LEAD_Z], [near[0], near[1], z0], r, { ...car, piece: "ropes", group: "ropes" });
    H.ropeSlide(`ropes.cwt.${i}`, [80 + o, L.T_CWT_Y, L.T.c[2]], [80 + o, L.T_CWT_Y, L.C.c[2]], r, { ...cwt, piece: "ropes", group: "ropes" });
    H.ropeSlide(`ropes.B.${i}`, [pB[0], pB[1], HB.socket], [pB[0], pB[1], L.C.c[2]], r, { ...cwt, piece: "ropes", group: "ropes" });

    // 55-56. Wraps on T (static), on C (with the counterweight) and the run under the car round both pulleys.
    const FT = G.frameOf(L.T.c, [1, 0, 0], [0, -1, 0], [0, 0, 1]);
    // The T wrap's two ends are joints with the sliding runs (they merge into them), so they carry no tips.
    ropeRoute(H, `ropes.wrapT.${i}`, [[near[0], near[1], L.T_LEAD_Z], ...G.arcPoints(FT, o, L.T.r, 0, Math.PI, 28)], { touch: ["machine.sheave", `ropes.car.${i}`, `ropes.cwt.${i}`], ends: [false, false] });
    const FC = G.frameOf(L.C.c, [1, 0, 0], [0, -1, 0], [0, 0, -1]);
    ropeRoute(H, `ropes.wrapC.${i}`, G.arcPoints(FC, o, L.C.r, 0, Math.PI, 28), { ...cwt, touch: ["cwt.pulley"] });
    const far = G.frameOf([L.S_FAR.c[0], L.S_FAR.c[1], z0], ax, L.S_ALONG, [0, 0, -1]);
    const nearF = G.frameOf([L.S_NEAR.c[0], L.S_NEAR.c[1], z0], ax, L.S_ALONG, [0, 0, -1]);
    const under = [...G.arcPoints(far, o, L.S_FAR.r, 0, Math.PI / 2, 12), ...G.arcPoints(nearF, o, L.S_NEAR.r, Math.PI / 2, Math.PI, 12)];
    // Chunks end at both pulley bottoms: the wrap and the diagonal lie on opposite sides of each pulley in depth.
    const wrapLength = (L.S_FAR.r * Math.PI) / 2;
    const span = Math.hypot(L.S_FAR.c[0] - L.S_NEAR.c[0], L.S_FAR.c[1] - L.S_NEAR.c[1]);
    ropeRoute(H, `ropes.under.${i}`, under, { ...car, touch: ["car.pulley.far", "car.pulley.near"], breaks: [wrapLength, wrapLength + span] });
  });
}
