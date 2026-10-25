// The car (plan items 57-92), built at L1 and moved with the travel share: the sling (plank, uprights,
// crosshead), platform, the diagonal pulley beam with the two underslung pulleys, four roller guides and two
// progressive safety gears around the rail blades, the safety linkage, the cab with its near (y1) panel cut
// away, the COP, the centre-opening car doors with their header, operator, coupler and light curtain, the
// sill and apron, and the car-top fittings.
import * as G from "../../../.kiro/skills/anatomy/kit/lathe.mjs";
import * as k from "../../../.kiro/skills/anatomy/kit/iso-kit.mjs";
import { circle, faceMarks } from "./machine.mjs";

export function build(H, L, { open = false } = {}) {
  const travel = { ride: "travel", move: [0, 0, L.TRAVEL_CM] };
  const scope = (group) => H.scope({ piece: "car", group, ...travel });
  const sling = scope("sling");
  const guides = scope("guides");
  const safety = scope("safety");
  const cab = scope("cab");
  const doors = scope("doors");
  const top = scope("cartop");
  const { Ln, Dots, at, P } = H;
  const z0 = L.Lf(1);
  const bolt = (p) => Dots([at(p)], { size: 0.42, tone: "mid" });
  const seamX = (x, y, za, zb) => Ln(k.segment([x, y, za], [x, y, zb], P), { tone: "faint" });
  const seamY = (x, y, za, zb) => Ln(k.segment([x, y, za], [x, y, zb], P), { tone: "faint" });
  const Sg = L.SLING;
  const [p0, p1] = Sg.plank;
  const [c0, c1] = Sg.crosshead;

  // 57-59. Sling: plank, two uprights and the crosshead.
  sling.box("car.plank", [Sg.x0, 15, z0 + p0], [Sg.x1, 143, z0 + p1], { tone: "mid" }, { r: 0.2, extra: [20, 70, 88, 138].map((y) => bolt([Sg.x1, y, z0 + p0 + 6])).join("") });
  for (const [y0, y1] of [Sg.up.y0, Sg.up.y1]) {
    sling.box("car.upright", [Sg.up.x0, y0, z0 + p1], [Sg.up.x1, y1, z0 + c0], { tone: "mid" }, { r: 0.2, extra: [z0 + 8, z0 + 110, z0 + 212].map((z) => bolt([Sg.up.x1, (y0 + y1) / 2, z])).join("") });
  }
  sling.box("car.crosshead", [Sg.x0, 15, z0 + c0], [Sg.x1, 143, z0 + c1], { tone: "mid" }, { r: 0.2, extra: [20, 70, 88, 138].map((y) => bolt([Sg.x1, y, z0 + c0 + 6])).join("") });

  // 60. Platform, and the two buffer striker blocks under it.
  sling.box("car.platform", [L.CAB.x, L.CAB.y, z0 - 12], [L.CAB.x + L.CAB.w, L.CAB.y + L.CAB.d, z0], { tone: "mid" }, { r: 0.4, inner: Ln(k.sideSeam({ x: L.CAB.x, y: L.CAB.y, w: L.CAB.w, d: L.CAB.d, r: 0.4 }, z0 - 6, P, 2), { tone: "faint" }) });
  for (const [x, y] of L.CAR_BUFFERS) sling.box("car.striker", [x - 6, y - 6, z0 + p0], [x + 6, y + 6, z0 - 12], { tone: "mid" }, { r: 0.3 });

  // 61-63. The diagonal pulley beam (behind the pulleys) and the two underslung pulleys.
  {
    const mid = [(L.S_NEAR.c[0] + L.S_FAR.c[0]) / 2, (L.S_NEAR.c[1] + L.S_FAR.c[1]) / 2, z0];
    const F = G.frameOf(mid, L.S_ALONG, L.S_AXIS, [0, 0, 1]);
    const [s0, s1] = L.PULLEY_BEAM.s;
    const [b0, b1] = L.PULLEY_BEAM.z;
    sling.prism("car.pulleybeam", F, [[s0, b0], [s1, b0], [s1, b1], [s0, b1]], -L.PULLEY_BEAM.half, L.PULLEY_BEAM.half, { tone: "mid" });
    const seat = L.S_NEAR.r - L.ROPE.r;
    const body = [[-5.4, 17.2], [-4.6, 17.2], [-4.6, seat], [4.6, seat]];
    // The near flange's lip stands just proud of the ropes, so it never overlaps a rope leaving the pulley.
    const flange = [[4.6, 16.6], [5.4, 16.6], [5.4, 4.5], [6.4, 4.5]];
    for (const [id, S] of [["far", L.S_FAR], ["near", L.S_NEAR]]) {
      const c = [S.c[0], S.c[1], L.PULLEY_Z(1)];
      const Fp = G.frameOf(c, L.S_AXIS, L.S_ALONG, [0, 0, 1]);
      const face = H.face(G.add3(c, G.mul3(L.S_AXIS, 5.4)), L.S_ALONG, [0, 0, -1], faceMarks(H, 5.5, 15.5, 6, { id: id === "far" ? "Sfar" : "Snear" }));
      const grooves = [-2, 0, 2].map((s) => Ln(G.arcOf(Fp, s, seat, P), { tone: "faint" })).join("");
      sling.turned(`car.pulley.${id}`, Fp, body, { tone: "mid" }, { inner: grooves });
      sling.turned(`car.pulley.${id}.flange`, Fp, flange, { tone: "mid" }, { extra: face });
    }
  }

  // 65-71. Roller guides, safety gears and the linkage, one set per rail (n points from the rail to the car).
  for (const [t, n] of [[L.tipOf(L.RAILS[0]), 1], [L.tipOf(L.RAILS[1]), -1]]) {
    const y = (a, b) => [Math.min(t + n * a, t + n * b), Math.max(t + n * a, t + n * b)];
    const guide = (zb, up) => {
      const s = up ? 1 : -1;
      const zp = up ? [zb, zb + 1.5] : [zb - 1.5, zb];
      const za = up ? zb + 1.5 : zb - 1.5;
      const [ya, yb] = y(0.4, 5.8);
      guides.box("car.guide.base", [Sg.x0, ya, zp[0]], [Sg.x1, yb, zp[1]], { tone: "mid" }, { r: 0.2, extra: bolt([Sg.x0 + 1, (ya + yb) / 2, up ? zp[1] : zp[0]]) + bolt([Sg.x1 - 1, (ya + yb) / 2, up ? zp[1] : zp[0]]) });
      const zr = za + s * 4.5;
      for (const xr of [96.7, 103.3]) {
        const [y0, y1] = y(0.4, 1.8);
        const zs = up ? [za, za + 7.5] : [za - 7.5, za];
        guides.box("car.guide.fork", [xr - 1.2, y0, zs[0]], [xr + 1.2, y1, zs[1]], { tone: "mid" }, { r: 0.15 });
        const Fa = G.frameOf([xr, t - n * 1.7, zr], [0, n, 0], [1, 0, 0], [0, 0, 1]);
        guides.disc("car.guide.axle", Fa, 0, 2.1, 0.6, { tone: "mid" });
        const Fr = G.frameOf([xr, t - n * 3.7, zr], [0, n, 0], [1, 0, 0], [0, 0, 1]);
        guides.disc("car.guide.roller", Fr, 0, 2, 2.5, { tone: "lo" }, { inner: Ln(G.arcOf(Fr, n > 0 ? 2 : 0, 1.4, P, { least: -1 }), { tone: "faint" }) });
      }
      const zt = zr + s * 6;
      for (const [x0, x1] of [[98, 99], [101, 102]]) {
        const [y0, y1] = y(1, 4);
        const zs = up ? [za, zt + 1] : [zt - 1, za];
        guides.box("car.guide.cheek", [x0, y0, zs[0]], [x1, y1, zs[1]], { tone: "mid" }, { r: 0.1 });
      }
      const Ft = G.frameOf([99, t + n * 2.5, zt], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
      guides.disc("car.guide.tip", Ft, 0, 2, 2.5, { tone: "lo" }, { inner: Ln(G.arcOf(Ft, 2, 1.4, P, { least: -1 }), { tone: "faint" }) });
    };
    guide(z0 + c1, true);

    // Progressive safety gear: a yoke under the plank end and two wedge housings either side of the blade.
    const [ya, yb] = y(0.4, 5.8);
    safety.box("car.safety.yoke", [Sg.x0, ya, z0 - 44], [Sg.x1, yb, z0 + p0], { tone: "mid" }, { r: 0.3, extra: bolt([Sg.x0 + 1.5, n > 0 ? yb : ya, z0 - 28]) + bolt([Sg.x1 - 1.5, n > 0 ? yb : ya, z0 - 28]) });
    const [ja, jb] = y(-4.6, 0.4);
    for (const [x0, x1] of [[95, 98.8], [101.2, 105]]) {
      const plan = { x: x0, y: ja, w: x1 - x0, d: jb - ja, r: 0.2 };
      safety.box("car.safety.wedge", [x0, ja, z0 - 42], [x1, jb, z0 - 26], { tone: "mid" }, { r: 0.2, inner: Ln(k.sideSeam(plan, z0 - 34, P, 2), { tone: "faint" }) });
    }
    guide(z0 - 44, false);

    // 71. Linkage: a lug on the yoke, a pull rod up the upright and a lever on the crosshead.
    const [la, lb] = n > 0 ? [16, 18.5] : [139.5, 142];
    safety.box("car.safety.lug", [Sg.x1, la, z0 - 30], [110, lb, z0 - 26], { tone: "mid" }, { r: 0.2 });
    safety.disc("car.safety.pullrod", G.frameOf([108.8, (la + lb) / 2, z0 - 26], [0, 0, 1], [1, 0, 0], [0, 1, 0]), 0, 258, 0.6, { tone: "mid" });
    safety.box("car.safety.lever", [Sg.x1, la, z0 + 232], [110, lb, z0 + 236], { tone: "mid" }, { r: 0.2 });
  }
  // The synchronising rod between the two levers, carried in two bearings on the crosshead.
  safety.disc("car.safety.syncrod", G.frameOf([108.8, 18.5, z0 + 234], [0, 1, 0], [1, 0, 0], [0, 0, 1]), 0, 121, 0.6, { tone: "mid" });
  for (const yb of [40, 118]) safety.box("car.safety.bearing", [Sg.x1, yb - 2, z0 + 232.5], [108.2, yb + 2, z0 + 235.5], { tone: "mid" }, { r: 0.1 });
  // 72. Governor-rope lever and the clamp on the x = 113 run.
  safety.box("car.safety.govlever", [Sg.x1, 142, z0 - 36], [111.5, 145, z0 - 33], { tone: "mid" }, { r: 0.2 });
  safety.box("car.safety.govclamp", [111.5, 144.5, z0 - 38], [114.5, 147.5, z0 - 31], { tone: "mid" }, { r: 0.3, extra: bolt([114.5, 145.5, z0 - 34.5]) + bolt([114.5, 146.5, z0 - 34.5]) });

  // 73-78. The cab: back wall with handrail, far side wall with the COP, front returns, posts, ceiling.
  const W = { x0: L.CAB.x, x1: L.CAB.x + L.CAB.w, y0: L.CAB.y, y1: L.CAB.y + L.CAB.d };
  const h = L.CAB_H;
  cab.box("car.floor", [W.x0 + 2, W.y0 + 2, z0], [W.x1 - 2, W.y1, z0 + 0.6], { tone: "lo", flat: true }, { r: 0, steps: 1 });
  cab.box("car.wall.back", [W.x0, W.y0, z0], [W.x0 + 2, W.y1, z0 + h], { tone: "hi" }, { r: 0, steps: 1, inner: seamX(W.x0 + 2, 60, z0, z0 + h) + seamX(W.x0 + 2, 98, z0, z0 + h) });
  cab.box("car.wall.side", [W.x0 + 2, W.y0, z0], [W.x1 - 2, W.y0 + 2, z0 + h], { tone: "hi" }, { r: 0, steps: 1, inner: seamY(76, W.y0 + 2, z0, z0 + h) + seamY(123, W.y0 + 2, z0, z0 + h) });
  cab.box("car.wall.return", [W.x1 - 2, W.y0, z0], [W.x1, L.ENTRANCE.open[0], z0 + h], { tone: "hi" }, { r: 0, steps: 1 });
  cab.box("car.wall.return", [W.x1 - 2, L.ENTRANCE.open[1], z0], [W.x1, W.y1, z0 + h], { tone: "hi" }, { r: 0, steps: 1 });
  cab.box("car.wall.transom", [W.x1 - 2, L.ENTRANCE.open[0], z0 + L.DOOR.height], [W.x1, L.ENTRANCE.open[1], z0 + h], { tone: "hi" }, { r: 0, steps: 1 });
  for (const [x0, x1] of [[W.x0 + 2, W.x0 + 5], [W.x1 - 5, W.x1 - 2]]) cab.box("car.post", [x0, W.y1 - 3, z0 + 0.6], [x1, W.y1, z0 + h], { tone: "hi" }, { r: 0.2 });
  cab.box("car.ceiling", [W.x0, W.y0, z0 + h], [W.x1, W.y1, z0 + c0], { tone: "hi" }, { r: 0.3 });
  cab.box("car.ceiling.light", [60, 50, z0 + h - 2.5], [140, 108, z0 + h], { tone: "hi" }, { r: 0.6 });
  for (const yb of [44, 112]) cab.box("car.handrail.bracket", [W.x0 + 2, yb, z0 + 90], [W.x0 + 4, yb + 2, z0 + 92], { tone: "mid" }, { r: 0.2 });
  cab.box("car.handrail", [W.x0 + 4, 40, z0 + 89.5], [W.x0 + 6, 118, z0 + 92.5], { tone: "mid" }, { r: 0.8, steps: 3 });

  // 75. COP on the far side wall: display window, five floor buttons, door open / close and alarm.
  {
    const plate = { x0: 140, x1: 160, y: W.y0 + 2, z0: z0 + 80, z1: z0 + 150 };
    const d = 0.8;
    const btn = (cx, cy, attrs, label) => `<g ${attrs}><circle class="mrl-btn" cx="${cx}" cy="${cy}" r="1.7"/><text class="mrl-btn-text" x="${cx}" y="${cy + 0.75}" font-size="2.1" text-anchor="middle">${label}</text></g>`;
    let inner = `<rect class="mrl-window" x="4" y="3.5" width="12" height="7" rx="0.6"/><text class="mrl-display" data-car-display x="10" y="9" font-size="5" text-anchor="middle" textLength="9" lengthAdjust="spacingAndGlyphs">1</text>`;
    for (let f = 1; f <= 5; f++) inner += btn(10, 16 + (5 - f) * 7.5, `data-car-call="${f}" role="button" aria-label="Car call to landing ${f}"`, f);
    inner += btn(6, 56, `data-door-open role="button" aria-label="Open doors"`, "◂▸") + btn(14, 56, `data-door-close role="button" aria-label="Close doors"`, "▸◂") + btn(10, 64, `data-alarm role="button" aria-label="Alarm"`, "!");
    const face = H.face([plate.x0, plate.y + d, plate.z1], [1, 0, 0], [0, 0, -1], inner);
    cab.box("car.cop", [plate.x0, plate.y, plate.z0], [plate.x1, plate.y + d, plate.z1], { tone: "mid" }, { r: 0.3, extra: face });
  }

  // 79-84. Car doors (two panels in slide groups), header, hangers, coupler vane and light curtain.
  {
    const [x0, x1] = L.DOOR.car;
    const panel = (id, [ya, yb], dy) => {
      const shift = open ? dy * L.DOOR.slide : 0;
      const wrap = (svg) => `<g data-door="${id}">${svg}</g>`;
      const plan = { x: x0, y: ya + shift, w: x1 - x0, d: yb - ya, r: 0 };
      const shapes = doors.box(`car.door.${id}`, [x0, ya + shift, z0], [x1, yb + shift, z0 + L.DOOR.height], { tone: "hi" }, { r: 0, steps: 1, inner: Ln(k.sideSeam(plan, z0 + 100, P, 1), { tone: "faint" }), wrap });
      void shapes;
      const yh = dy < 0 ? ya + 4 : yb - 12;
      doors.box(`car.door.${id}.hanger`, [x1, yh + shift, z0 + L.DOOR.height - 7], [175.2, yh + 8 + shift, z0 + L.DOOR.height], { tone: "mid" }, { r: 0.1, wrap, extra: bolt([175.2, yh + 4 + shift, z0 + L.DOOR.height - 3.5]) });
      if (dy < 0) doors.box("car.door.vane", [x1, yb - 9 + shift, z0 + 80], [175.2, yb - 5 + shift, z0 + 170], { tone: "mid" }, { r: 0.1, wrap });
    };
    panel("car-l", L.DOOR.left, -1);
    panel("car-r", L.DOOR.right, 1);
    doors.box("car.door.header", [W.x1, 30, z0 + L.DOOR.height], [175.3, 128, z0 + 226], { tone: "mid" }, { r: 0.2, extra: [33, 79, 125].map((y) => bolt([175.3, y, z0 + 222])).join("") });
    for (const [ya, yb] of [[36, 39], [119, 122]]) doors.box("car.curtain", [W.x1, ya, z0 + 2], [172.8, yb, z0 + 200], { tone: "mid" }, { r: 0.2 });
    // 85-86. Car sill with its groove, and the apron below it.
    doors.box("car.sill", [W.x1, 37, z0 - 3], [175.3, 121, z0], { tone: "mid" }, { r: 0.1, extra: Ln(k.planOutline({ x: 173.4, y: 38, w: 0.9, d: 82, r: 0.4 }, z0, P), { tone: "faint" }) });
    doors.box("car.apron", [W.x1, 37, z0 - 75], [173.5, 121, z0 - 3], { tone: "mid" }, { r: 0.1 });
  }

  // 82. Door operator on the car top: base, motor, belt pulleys on brackets, the belt and its controller.
  {
    const zb = z0 + c0;
    top.box("car.operator.base", [148, 40, zb], [170, 118, zb + 1.5], { tone: "mid" }, { r: 0.3 });
    top.disc("car.operator.motor", G.frameOf([159, 100, zb + 6], [0, 1, 0], [1, 0, 0], [0, 0, 1]), 0, 8, 4.5, { tone: "mid" });
    for (const yp of [46, 112]) {
      top.box("car.operator.bracket", [164, yp - 3, zb + 1.5], [166, yp + 3, zb + 5], { tone: "mid" }, { r: 0.1 });
      top.disc("car.operator.pulley", G.frameOf([164, yp, zb + 8], [1, 0, 0], [0, 1, 0], [0, 0, 1]), 0, 2, 3, { tone: "mid" });
    }
    top.box("car.operator.belt", [164.4, 46, zb + 11], [165.6, 112, zb + 11.6], { tone: "lo" }, { r: 0, steps: 1 });
    top.box("car.operator.controller", [150, 60, zb + 1.5], [158, 90, zb + 9], { tone: "mid" }, { r: 0.5, steps: 3, extra: bolt([150.8, 60, zb + 8]) + bolt([157.2, 60, zb + 8]) });
  }

  // 87-91. Car-top inspection station, junction box, balustrade, limit-switch cam, positioning reader.
  {
    const zb = z0 + c0;
    const station = `<circle class="mrl-btn" cx="0" cy="0" r="1.3"/>`;
    const face = H.face([130, 102, zb + 8], [0, -1, 0], [0, 0, -1], [-3.5, -1.2, 1.2, 3.5].map((dx) => `<g transform="translate(${dx} 0)">${station}</g>`).join(""));
    top.box("car.top.station", [118, 96, zb - 12 + 12], [130, 108, zb + 12], { tone: "mid" }, { r: 0.5, steps: 3, extra: face });
    top.box("car.top.junction", [36, 28, zb], [50, 40, zb + 8], { tone: "mid" }, { r: 0.5, steps: 3, extra: bolt([37, 28, zb + 7]) + bolt([49, 28, zb + 7]) });
    const by = [W.y1 - 3, W.y1];
    const posts = [[32, 34], [90, 92], [112, 114], [136, 138]];
    for (const [x0, x1] of posts) top.box("car.top.post", [x0, by[0], zb], [x1, by[1], zb + 67], { tone: "mid" }, { r: 0.2 });
    for (const [x0, x1] of [[34, 90], [114, 136]]) {
      top.box("car.top.toeboard", [x0, by[0], zb], [x1, by[1], zb + 10], { tone: "mid" }, { r: 0.1 });
      top.box("car.top.midrail", [x0, by[0] + 0.5, zb + 32], [x1, by[1] - 0.5, zb + 34], { tone: "mid" }, { r: 0.3 });
      top.box("car.top.rail", [x0, by[0] + 0.5, zb + 62], [x1, by[1] - 0.5, zb + 65], { tone: "mid" }, { r: 0.5 });
    }
    top.box("car.cam", [91, 139, z0 + 100], [Sg.up.x0, 142, z0 + 140], { tone: "mid" }, { r: 0.3, group: "limits" });
    top.box("car.reader.arm", [142, 128, zb], [148, 144, zb + 3], { tone: "mid" }, { r: 0.2, group: "tape" });
    top.box("car.reader.back", [141.5, 144, zb - 3], [148.5, 145.5, zb + 5], { tone: "mid" }, { r: 0.2, group: "tape" });
    for (const [x0, x1] of [[141.5, 143.4], [146.6, 148.5]]) top.box("car.reader.cheek", [x0, 145.5, zb - 3], [x1, 148.6, zb + 5], { tone: "mid" }, { r: 0.2, group: "tape" });
  }

  void circle;
}
