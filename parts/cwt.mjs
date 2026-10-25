// Counterweight (plan items 93-98): a channel frame with eight filler weights and their retainer bar, the
// 2:1 pulley C on two cheek plates on its top, four guide shoes around its rails and the buffer striker.
// It is built at rest (car at L1, so the counterweight is high) and moves down as the car rises.
import * as G from "../../../.kiro/skills/anatomy/kit/lathe.mjs";
import * as k from "../../../.kiro/skills/anatomy/kit/iso-kit.mjs";
import { faceMarks } from "./machine.mjs";

export function build(H, L) {
  const S = H.scope({ piece: "cwt", group: "cwt", ride: "travel", move: [0, 0, -L.TRAVEL_CM] });
  const { Ln, Dots, at, P } = H;
  const bolt = (p) => Dots([at(p)], { size: 0.42, tone: "mid" });
  const w = L.CWT;
  const x0 = w.x;
  const x1 = w.x + w.w;
  const y0 = w.y;
  const y1 = w.y + w.d;
  const b0 = L.CWT_BOTTOM_REST;
  const b1 = b0 + L.CWT_H;

  // 93. Frame: two uprights and the bottom and top channels.
  for (const [ya, yb] of [[y0, y0 + 3], [y1 - 3, y1]]) S.box("cwt.upright", [x0, ya, b0], [x1, yb, b1], { tone: "mid" }, { r: 0.2, extra: [b0 + 5, b1 - 5].map((z) => bolt([x1, (ya + yb) / 2, z])).join("") });
  S.box("cwt.channel", [x0, y0 + 3, b0], [x1, y1 - 3, b0 + 10], { tone: "mid" }, { r: 0.2 });
  S.box("cwt.channel", [x0, y0 + 3, b1 - 10], [x1, y1 - 3, b1], { tone: "mid" }, { r: 0.2 });

  // 94. Eight filler weights, each its own slab with a lifting hole on top.
  for (let i = 0; i < 8; i++) {
    const za = b0 + 10 + i * 30;
    const plan = { x: x0 + 1, y: y0 + 3, w: w.w - 2, d: w.d - 6, r: 0.3 };
    S.box("cwt.filler", [x0 + 1, y0 + 3, za], [x1 - 1, y1 - 3, za + 30], { tone: "lo" }, { r: 0.3, inner: Ln(k.sideSeam(plan, za + 15, P, 2), { tone: "faint" }) });
  }
  // 95. Retainer bar across the top filler.
  S.box("cwt.retainer", [79, y0 + 3, b0 + 250], [81, y1 - 3, b0 + 253], { tone: "mid" }, { r: 0.2, extra: bolt([80, y0 + 4, b0 + 253]) + bolt([80, y1 - 4, b0 + 253]) });

  // 96. Pulley C on two cheek plates, its outer face turning (data-rot="C").
  const c = L.C.c;
  for (const [xa, xb] of [[x0, 73.5], [86.5, x1]]) S.box("cwt.cheek", [xa, 186, b1], [xb, 196, c[2] + 4], { tone: "mid" }, { r: 0.3, extra: bolt([xb, 188, b1 + 3]) + bolt([xb, 194, b1 + 3]) });
  {
    const F = G.frameOf(c, [1, 0, 0], [0, -1, 0], [0, 0, 1]);
    const seat = L.C.r - L.ROPE.r;
    const body = [[-6.5, 4.5], [-6, 4.5], [-6, 17.2], [-4.5, 17.2], [-4.5, seat], [4.5, seat]];
    const flange = [[4.5, 17.2], [6, 17.2], [6, 4.5], [6.5, 4.5]];
    const grooves = [-2, 0, 2].map((s) => Ln(G.arcOf(F, s, seat, P), { tone: "faint" })).join("");
    const face = H.face([c[0] + 6, c[1], c[2]], [0, -1, 0], [0, 0, -1], faceMarks(H, 5.5, 15.5, 6, { id: "C" }));
    S.turned("cwt.pulley", F, body, { tone: "mid" }, { inner: grooves });
    S.turned("cwt.pulley.flange", F, flange, { tone: "mid" }, { extra: face });
  }

  // 97. Guide shoes, top and bottom, on both rails: a base on the upright, a tip liner and two jaws.
  const [, , q1, q2] = L.RAILS;
  for (const [za, zb] of [[b0 + 2, b0 + 12], [b1 - 12, b1 - 2]]) {
    for (const [rail, n] of [[q1, 1], [q2, -1]]) {
      const tip = L.tipOf(rail);
      const face = n > 0 ? y0 : y1;
      const yl = n > 0 ? [tip, tip + 2] : [tip - 2, tip];
      const yb = n > 0 ? [tip + 2, face] : [face, tip - 2];
      S.box("cwt.shoe.base", [76, yb[0], za], [84, yb[1], zb], { tone: "mid" }, { r: 0.2, extra: bolt([76.8, n > 0 ? yb[0] : yb[1], za + 1]) + bolt([83.2, n > 0 ? yb[0] : yb[1], za + 1]) });
      S.box("cwt.shoe.liner", [79, yl[0], za + 1], [81, yl[1], zb - 1], { tone: "lo" }, { r: 0.1 });
      const jy = n > 0 ? [tip - 3, tip] : [tip, tip + 3];
      const bh = rail.kind.blade / 2;
      S.box("cwt.shoe.jaw", [77.5, jy[0], za + 1], [80 - bh, jy[1], zb - 1], { tone: "mid" }, { r: 0.1 });
      S.box("cwt.shoe.jaw", [80 + bh, jy[0], za + 1], [82.5, jy[1], zb - 1], { tone: "mid" }, { r: 0.1 });
    }
  }

  // 98. Buffer striker plate under the bottom channel.
  S.box("cwt.striker", [74, 184, b0 - 3], [86, 198, b0], { tone: "mid" }, { r: 0.3 });
}
