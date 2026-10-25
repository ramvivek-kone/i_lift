// Traction machine (plan items 29-43): a gearless permanent-magnet machine on a bedplate that stands on the
// tops of the y1 car rail and counterweight rail 1, tied back to wall x0. The traction sheave T is the one lit
// accent; its outer face carries the marks the page turns from the model (data-rot="T").
import * as G from "../../../.kiro/skills/anatomy/kit/lathe.mjs";
import * as k from "../../../.kiro/skills/anatomy/kit/iso-kit.mjs";

// A closed circle in a face plane's local coordinates.
export const circle = (cx, cy, r) => `M${(cx + r).toFixed(3)} ${cy.toFixed(3)}A${r} ${r} 0 1 0 ${(cx - r).toFixed(3)} ${cy.toFixed(3)}A${r} ${r} 0 1 0 ${(cx + r).toFixed(3)} ${cy.toFixed(3)}Z`;
const seg = (a, b) => `M${a[0].toFixed(3)} ${a[1].toFixed(3)}L${b[0].toFixed(3)} ${b[1].toFixed(3)}`;

// Rotating face marks: a hub ring and a rim ring joined by spokes, and one lit index mark.
// Only the traction sheave's mark is the lit accent; the other sheaves' marks are hi.
export function faceMarks(H, hub, rim, spokes, { index = true, id, tone = "hi" }) {
  const lines = [circle(0, 0, hub), circle(0, 0, rim)];
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    lines.push(seg([Math.cos(a) * hub, Math.sin(a) * hub], [Math.cos(a) * rim, Math.sin(a) * rim]));
  }
  const mark = index ? H.Ln(seg([hub + (rim - hub) * 0.2, 0], [rim, 0]), { tone }) : "";
  return `<g data-rot="${id}">${H.Ln(lines.join(""), { tone: "faint" })}${mark}</g>`;
}

export function build(H, L) {
  const M = H.scope({ piece: "machine", group: "machine" });
  const B = H.scope({ piece: "machine", group: "brake" });
  const T = H.scope({ piece: "machine", group: "sheave" });
  const { Ln, Dots, Faded, at, P } = H;
  const bolt = (p) => Dots([at(p)], { size: 0.45, tone: "mid" });
  const zc = L.T.c[2];
  const yc = L.T.c[1];
  const X = [1, 0, 0];
  const seam = (plan, z, steps = 1) => Ln(k.sideSeam(plan, z, P, steps), { tone: "faint" });

  // 30. Isolation pads on the two rail tops.
  M.box("machine.pad", [95, 143.8, L.BEDPLATE.z0], [105, 150.5, L.BEDPLATE.z0 + 1], { tone: "lo" }, { r: 0.3 });
  M.box("machine.pad", [77, 156, L.BEDPLATE.z0], [83, 162.2, L.BEDPLATE.z0 + 1], { tone: "lo" }, { r: 0.3 });

  // 29. Bedplate: two channels along x and two cross plates, with weld seams round them.
  const z0 = L.BEDPLATE.z0 + 1;
  const z1 = z0 + 4;
  for (const [y0, y1] of [[144.5, 150.5], [156, 162]]) {
    const plan = { x: 36, y: y0, w: 70, d: y1 - y0, r: 0 };
    M.box("machine.bedplate", [36, y0, z0], [106, y1, z1], { tone: "mid" }, { r: 0, steps: 1, inner: seam(plan, z0 + 2), extra: bolt([44, (y0 + y1) / 2, z1]) + bolt([98, (y0 + y1) / 2, z1]) });
  }
  for (const [x0, x1] of [[36, 40], [102, 106]]) M.box("machine.bedplate.cross", [x0, 150.5, z0], [x1, 156, z1], { tone: "mid" }, { r: 0, steps: 1 });

  // 31. Tie bracket back to wall x0: a wall plate and an arm to the bedplate's cross plate.
  M.box("machine.tie.plate", [0, 150, z0 - 4], [1.5, 160, z1 + 4], { tone: "mid" }, { r: 0.2, extra: bolt([1.5, 151.5, z0 - 2.5]) + bolt([1.5, 158.5, z0 - 2.5]) + bolt([1.5, 151.5, z1 + 2.5]) + bolt([1.5, 158.5, z1 + 2.5]) });
  M.box("machine.tie.arm", [1.5, 152, z0], [36, 156, z1], { tone: "mid" }, { r: 0.2 });

  // Motor feet on the channels.
  for (const [x0, x1] of [[44, 50], [62, 68]]) M.box("machine.foot", [x0, 150, z1], [x1, 168, L.MOTOR.z0], { tone: "mid" }, { r: 0.3, extra: bolt([x0 + 1.2, 151.2, L.MOTOR.z0 - 0.4]) + bolt([x1 - 1.2, 166.8, L.MOTOR.z0 - 0.4]) });

  // 32-33. Motor housing, coaxial with T, with rounded rims and cooling ribs that end on two seams.
  {
    const F = G.frameOf([56, yc, zc], X, [0, -1, 0], [0, 0, 1]);
    const R = L.MOTOR.r;
    const profile = [[-16, 15], [-15.7, 17.6, 1], [-15, 19.1, 1], [-14, 19.8, 1], [-12.5, R], [12.5, R], [14, 19.8, 1], [15, 19.1, 1], [15.7, 17.6, 1], [16, 15]];
    const ribs = G.ribsOf(F, -11, 11, R, 40, P, { fade: [0.1, 0.55], seams: true });
    M.turned("machine.motor", F, profile, { tone: "mid" }, { inner: Faded(ribs, { tone: "lo" }) });
  }

  // 34-35. Traction sheave: hub, two flanges and the rope seat with its groove lines; the outer face turns.
  {
    const F = G.frameOf(L.T.c, X, [0, -1, 0], [0, 0, 1]);
    const seat = L.T.r - L.ROPE.r;
    // The near flange is its own item, so the ropes in the seat are drawn behind it and in front of the rest.
    const body = [[-8, 5], [-6, 5], [-6, 17.2], [-4.5, 17.2], [-4.5, seat], [4.5, seat]];
    const flange = [[4.5, 17.2], [6, 17.2], [6, 4], [7, 4]];
    const grooves = [-2, 0, 2].map((s) => Ln(G.arcOf(F, s, seat, P), { tone: "faint" })).join("");
    const face = H.face([80 + 6, yc, zc], [0, -1, 0], [0, 0, -1], faceMarks(H, 5.5, 15.5, 6, { id: "T", tone: "lit" }) + H.Ln(circle(0, 0, 9), { tone: "faint" }));
    T.turned("machine.sheave", F, body, { tone: "hi", lit: true }, { inner: grooves });
    T.turned("machine.sheave.flange", F, flange, { tone: "hi", lit: true }, { extra: face });
  }

  // 36. Outboard bearing: a housing on a pedestal.
  M.box("machine.bearing.pedestal", [87, 153, z1], [91, 165, zc - 5.5], { tone: "mid" }, { r: 0.3, extra: bolt([88, 154, z1 + 0.4]) + bolt([90, 164, z1 + 0.4]) });
  M.disc("machine.bearing", G.frameOf([87, yc, zc], X, [0, -1, 0], [0, 0, 1]), 0, 4, 5.5, { tone: "mid" }, { extra: Dots([at([91, yc, zc])], { size: 0.5, tone: "mid" }) });

  // 42. Rope retainer bar over the sheave, on a post from the bearing housing.
  M.box("machine.retainer.post", [88, 157, zc + 5.5], [90, 161, 1573.6], { tone: "mid" }, { r: 0.2 });
  M.box("machine.retainer", [73, 157, 1573.6], [90, 161, 1575.4], { tone: "mid" }, { r: 0.3, extra: bolt([89, 159, 1575.4]) });

  // 39-40. Brake disc and encoder on the far end of the shaft.
  M.disc("machine.shaft", G.frameOf([33.5, yc, zc], X, [0, -1, 0], [0, 0, 1]), 0, 6.5, 4, { tone: "mid" });
  B.disc("machine.brake.disc", G.frameOf([32, yc, zc], X, [0, -1, 0], [0, 0, 1]), 0, 1.5, 17, { tone: "mid" }, { inner: Ln(G.arcOf(G.frameOf([32, yc, zc], X, [0, -1, 0], [0, 0, 1]), 1.5, 14, P), { tone: "faint" }) });
  M.disc("machine.encoder", G.frameOf([28, yc, zc], X, [0, -1, 0], [0, 0, 1]), 0, 4, 3, { tone: "mid" });
  M.disc("machine.encoder.cap", G.frameOf([26.5, yc, zc], X, [0, -1, 0], [0, 0, 1]), 0, 1.5, 2.2, { tone: "mid" });

  // 37-38. Two independent brake units (dual circuit), each two calliper halves and a bridge.
  const unit = (name, [y0, y1], [za, zb], bridge) => {
    B.box(`${name}.outer`, [28.5, y0, za], [32, y1, zb], { tone: "mid" }, { r: 0.3 });
    B.box(`${name}.inner`, [33.5, y0, za], [37, y1, zb], { tone: "mid" }, { r: 0.3 });
    B.box(`${name}.bridge`, bridge[0], bridge[1], { tone: "mid" }, { r: 0.4, extra: bolt([29.5, (bridge[0][1] + bridge[1][1]) / 2, bridge[1][2]]) + bolt([36, (bridge[0][1] + bridge[1][1]) / 2, bridge[1][2]]) });
  };
  unit("machine.brake.A", [153, 165], [1566, 1578], [[28.5, 153, 1578], [37, 165, 1582]]);
  unit("machine.brake.B", [138, 146], [1550, 1562], [[28.5, 134, 1550], [37, 138, 1562]]);

  // 41. Motor terminal box on the housing.
  M.box("machine.terminal", [52, 153, zc + L.MOTOR.r], [62, 165, 1583], { tone: "mid" }, { r: 0.5, steps: 3, extra: bolt([53, 154, 1583]) + bolt([61, 164, 1583]) });
}
