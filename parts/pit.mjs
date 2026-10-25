// Pit (plan items 106-111): two PU car buffers and the counterweight buffer on pedestals, the pit ladder
// with its brackets to the floor and the L1 slab edge, the pit stop switch, and the travelling cable from
// its clamp on wall x0 down to a loop that rises at half car speed and up to the hanger under the car.
import * as G from "../../../.kiro/skills/anatomy/kit/lathe.mjs";
import * as k from "../../../.kiro/skills/anatomy/kit/iso-kit.mjs";
import { tubePieces, tubeSvg } from "../../../.kiro/skills/anatomy/kit/tube.mjs";
import * as A from "../../../.kiro/skills/anatomy/kit/audit.mjs";

export function build(H, L) {
  const buf = H.scope({ piece: "pit", group: "buffers" });
  const lad = H.scope({ piece: "pit", group: "ladder" });
  const pit = H.scope({ piece: "pit", group: "pit" });
  const { Ln, Dots, at, P } = H;
  const bolt = (p) => Dots([at(p)], { size: 0.42, tone: "mid" });
  const Z = [0, 0, 1];

  // 106-107. Buffers: a steel pedestal with a base flange, a top plate and the cellular PU body.
  const buffer = (name, [x, y], top, r, plinth) => {
    const zp = top - 20 - 1.5;
    buf.box(`${name}.pedestal`, [x - plinth, y - plinth, 0], [x + plinth, y + plinth, zp], { tone: "mid" }, { r: 0.4, inner: Ln(k.sideSeam({ x: x - plinth, y: y - plinth, w: plinth * 2, d: plinth * 2, r: 0.4 }, 3, P, 2), { tone: "faint" }), extra: bolt([x - plinth + 1.5, y + plinth, 1.5]) + bolt([x + plinth, y - plinth + 1.5, 1.5]) });
    const Fp = G.frameOf([x, y, zp], Z, [1, 0, 0], [0, 1, 0]);
    buf.disc(`${name}.plate`, Fp, 0, 1.5, r + 1.5, { tone: "mid" }, { extra: Dots(G.dotsOf(Fp, 1.5, r + 0.75, 6, P, { all: true }), { size: 0.4, tone: "mid" }) });
    const F = G.frameOf([x, y, zp + 1.5], Z, [1, 0, 0], [0, 1, 0]);
    const h = top - zp - 1.5;
    const ribs = G.ribsOf(F, 0, h - 1.2, r, 28, P, { fade: [0.1, 0.55], seams: "last" });
    buf.turned(name, F, [[0, r], [h - 1.2, r], [h - 0.4, r - 0.5, 1], [h, r - 1.4]], { tone: "lo" }, { inner: H.Faded(ribs, { tone: "faint" }) });
  };
  L.CAR_BUFFERS.forEach((p, i) => buffer(`pit.buffer.car${i}`, p, L.CAR_BUFFER_TOP, L.BUFFER_R, 8.5));
  buffer("pit.buffer.cwt", L.CWT_BUFFER.at, L.CWT_BUFFER.top, 6.5, 8);

  // 108. Pit ladder: two stiles on base plates, rungs between them, and top brackets to the L1 slab edge.
  {
    const [xa, xb] = [176, 178];
    const stiles = [[146, 148], [176, 178]];
    const z1 = L.Lf(1) - 5;
    for (const [ya, yb] of stiles) {
      lad.box("pit.ladder.foot", [xa - 1, ya - 1, 0], [xb + 1, yb + 1, 1], { tone: "mid" }, { r: 0.2 });
      lad.box("pit.ladder.stile", [xa, ya, 1], [xb, yb, z1], { tone: "mid" }, { r: 0.2 });
      lad.box("pit.ladder.bracket", [xb, ya, z1 - 15], [L.SHAFT.x1, yb, z1 - 10], { tone: "mid" }, { r: 0.1, extra: bolt([L.SHAFT.x1, (ya + yb) / 2, z1 - 12.5]) });
    }
    for (const zr of [18, 40, 62, 101]) lad.disc("pit.ladder.rung", G.frameOf([177, 148, zr], [0, 1, 0], [1, 0, 0], [0, 0, 1]), 0, 28, 0.8, { tone: "mid" });
  }

  // 109. Pit stop switch on the slab edge beside the ladder top.
  pit.box("pit.stop", [178, 163, 101], [L.SHAFT.x1, 171, 113], { tone: "mid" }, { r: 0.4, steps: 3, extra: Dots([at([178, 167, 109])], { size: 1.1, tone: "hi" }) + bolt([178, 164, 102]) + bolt([178, 170, 112]) });

  // 111. Travelling cable: wall clamp, fixed leg (slides at half the car's stroke), loop (rises at half car
  // speed) and the car leg (rides with the car, its lower end cut by a clip the page shifts to the loop).
  {
    const C = L.CABLE;
    const r = C.r;
    const owner = "pit.cable";
    const zc = L.loopCentreZ(L.Lf(1));
    const half = { ride: "travel", move: [0, 0, L.TRAVEL_CM / 2] };
    pit.box("pit.cable.bracket", [0, C.fixedY - 3, C.clampZ + 4], [C.x - 1.5, C.fixedY + 3, C.clampZ + 8], { tone: "mid" }, { r: 0.2, group: "cable", extra: bolt([0, C.fixedY - 2, C.clampZ + 6]) });
    pit.box("pit.cable.clamp", [C.x - 1.5, C.fixedY - 2.5, C.clampZ], [C.x + 1.5, C.fixedY + 2.5, C.clampZ + 8], { tone: "mid" }, { r: 0.3, group: "cable", extra: bolt([C.x + 1.5, C.fixedY, C.clampZ + 4]) });
    H.ropeSlide("pit.cable.fixed", [C.x, C.fixedY, C.clampZ], [C.x, C.fixedY, zc], r, { ...half, stroke: L.TRAVEL_CM / 2, piece: "pit", group: "cable", tone: "mid", owner });
    const F = G.frameOf([C.x, C.loopY, zc], [1, 0, 0], [0, -1, 0], [0, 0, -1]);
    const loop = G.arcPoints(F, 0, C.loopR, 0, Math.PI, 28);
    H.route("pit.cable", loop, r, { piece: "pit", group: "cable", ...half, owner, ends: [false, false], touch: ["pit.cable.fixed", "pit.cable.car"] });
    tubePieces(loop, r, P, { maxLength: 12, spacing: 0.8 }).forEach((piece, index) =>
      H.put(`pit.cable:${index}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [A.tube(piece.points, piece.radii, { owner })], { piece: "pit", group: "cable", ...half, route: "pit.cable", chunk: index, bias: 0.05 }),
    );
    // The car leg: drawn from the hanger down past the loop's lowest reach, clipped below at the loop's
    // tangent by a clip (data-half) that the page moves with half the car's offset, so it stays on the loop.
    const top = [C.x, C.carY, L.Lf(1) + C.hanger];
    const tangent = [C.x, C.carY, zc];
    const rest = top[2] - zc;
    const up = G.frameAlong(tangent, Z);
    const [piece] = tubePieces([top, [C.x, C.carY, zc - L.TRAVEL_CM / 2 - 2]], r, P, { maxLength: 2000, spacing: 20, caps: [false, false] });
    // The clip reaches half a stroke above the hanger, so it still covers the hanger after the page has moved
    // it down by half the car's offset.
    const { clip } = G.rodOut(up, 0, rest, r, P, { stroke: L.TRAVEL_CM / 2 });
    const svg = `<clipPath id="clip-pit-cable-car"><path data-half d="${clip}"/></clipPath><g clip-path="url(#clip-pit-cable-car)">${tubeSvg(piece, { tone: "mid" })}</g>`;
    H.put("pit.cable.car", G.add3(tangent, [0, 0, rest / 2]), svg, [H.record(A.slide(up, 0, rest, r, { name: "pit.cable.car", owner }))], { piece: "pit", group: "cable", ride: "travel", move: [0, 0, L.TRAVEL_CM], bias: 0.05 });
  }
}
