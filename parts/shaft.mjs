// Hoistway and building (plan items 1-18): pit slab, the two concrete back walls, the five L-shaped floor
// slabs and the roof stub (near walls cut away), the overhead hitch beam, the C160 common bracket beams
// with their end plates, sill support angles and the shaft lights.
import * as k from "../../../.kiro/skills/anatomy/kit/iso-kit.mjs";

export function build(H, L) {
  const S = H.scope({ piece: "shaft" });
  const { Ln, Dots, at, path3, P } = H;
  const cut = (corners) => `<path class="mrl-cut" d="${path3(corners, true)}"/>`;
  const top = L.TOP;

  // 1. Pit floor slab, sectioned on its two near faces.
  {
    const { plan, z, h } = L.PIT_SLAB;
    const x1 = plan.x + plan.w;
    const y1 = plan.y + plan.d;
    const inner = cut([[x1, plan.y, z], [x1, y1, z], [x1, y1, z + h], [x1, plan.y, z + h]]) + cut([[plan.x, y1, z], [x1, y1, z], [x1, y1, z + h], [plan.x, y1, z + h]]);
    S.box("stand.pit", [plan.x, plan.y, z], [x1, y1, z + h], { tone: "lo" }, { r: 0, inner, bias: -2000 });
  }

  // 2-3. The two back walls, each cast in one lift per storey (pour joints at the slab soffits), so no lift is
  // a slender post. Faces toward the car carry formwork joints and tie holes; the open ends are cut.
  const lifts = [0, ...L.LANDINGS.slice(1).map((z) => z - L.SLAB_T), top];
  const pours = lifts.slice(0, -1).map((z, i) => [z, lifts[i + 1]]);
  pours.forEach(([za, zb], i) => {
    const last = i === pours.length - 1;
    // Back wall x0.
    {
      const w = L.WALL_X0;
      const y1 = w.y + w.d;
      const joints = [];
      for (let z = 140; z < zb; z += 140) if (z > za + 1) joints.push(k.segment([0, 0, z], [0, y1, z], P));
      joints.push(k.segment([0, 117.5, za], [0, 117.5, zb], P));
      const ties = [];
      for (let z = 70; z < zb; z += 140) if (z > za) for (const y of [30, 88, 147, 205]) ties.push(at([0, y, z]));
      const inner = cut([[w.x, y1, za], [0, y1, za], [0, y1, zb], [w.x, y1, zb]]) + (last ? cut([[w.x, w.y, top], [0, w.y, top], [0, y1, top], [w.x, y1, top]]) : "") + Ln(joints.join(""), { tone: "faint" }) + Dots(ties, { size: 0.45, tone: "lo" });
      S.box("stand.wall.x0", [w.x, w.y, za], [0, y1, zb], { tone: "lo" }, { r: 0, inner, bias: -1000 });
    }
    // Back wall y0, between wall x0 and the lobby side.
    {
      const w = L.WALL_Y0;
      const x1 = w.x + w.w;
      const joints = [];
      for (let z = 140; z < zb; z += 140) if (z > za + 1) joints.push(k.segment([0, 0, z], [x1, 0, z], P));
      joints.push(k.segment([90, 0, za], [90, 0, zb], P));
      const ties = [];
      for (let z = 70; z < zb; z += 140) if (z > za) for (const x of [22, 67, 113, 158]) ties.push(at([x, 0, z]));
      const inner = cut([[x1, w.y, za], [x1, 0, za], [x1, 0, zb], [x1, w.y, zb]]) + (last ? cut([[w.x, w.y, top], [x1, w.y, top], [x1, 0, top], [w.x, 0, top]]) : "") + Ln(joints.join(""), { tone: "faint" }) + Dots(ties, { size: 0.45, tone: "lo" });
      S.box("stand.wall.y0", [w.x, w.y, za], [x1, 0, zb], { tone: "lo" }, { r: 0, inner, bias: -1000 });
    }
  });

  // 5-10. Floor slabs L1..L5 and the roof stub: L-shaped rings round the hole, cut on their outer faces,
  // with the screed (floor finish) line running round the section.
  const ring = L.SLAB_RING;
  // The roof stub is cut away with the near walls: over the machine it would hide the traction sheave.
  const levels = L.LANDINGS.map((z, i) => ({ name: `shaft.slab.L${i + 1}`, z }));
  for (const { name, z } of levels) {
    const z0 = z - L.SLAB_T;
    const xs = L.LOBBY_X;
    const ys = L.SIDE_Y;
    const inner =
      cut([[xs, -L.WALL_T, z0], [xs, ys, z0], [xs, ys, z], [xs, -L.WALL_T, z]]) +
      cut([[-L.WALL_T, ys, z0], [xs, ys, z0], [xs, ys, z], [-L.WALL_T, ys, z]]) +
      Ln(k.ringSeam(ring, z - 5, P), { tone: "lo" });
    S.extruded(name, ring, z0, L.SLAB_T, { tone: "lo" }, { inner });
  }

  // 11. The overhead hitch beam is not built: hitch B sits on counterweight rail 2, and a beam across the
  // near side of the overhead would hide the machine.

  // 12-16. C160 common bracket beams, web on the car side and flanges opening toward the counterweight;
  // a bearing plate on the back wall and one bolted to the lobby slab edge.
  const B = L.BEAM;
  for (let f = 1; f <= 5; f++) {
    const zb = B.bottom(f);
    const zt = B.top(f);
    S.box(`shaft.beam${f}.web`, [B.x0, B.y0, zb], [B.x1, B.y0 + B.web, zt], { tone: "mid" }, { r: 0.1 });
    S.box(`shaft.beam${f}.flange`, [B.x0, B.y0 + B.web, zb], [B.x1, B.y1, zb + B.flange], { tone: "mid" }, { r: 0.1 });
    S.box(`shaft.beam${f}.flange`, [B.x0, B.y0 + B.web, zt - B.flange], [B.x1, B.y1, zt], { tone: "mid" }, { r: 0.1 });
    const plate = (x0, x1, z1, name) => {
      const bolts = Dots([[B.y0 - 2.5, zb - 2], [B.y1 + 2.5, zb - 2], [B.y0 - 2.5, zt + 2], [B.y1 + 2.5, zt + 2]].map(([y, z]) => at([x1, y, z])), { size: 0.45, tone: "mid" });
      S.box(name, [x0, B.y0 - 4, zb - 4], [x1, B.y1 + 4, z1], { tone: "mid" }, { r: 0.2, extra: bolts });
    };
    plate(0, L.BEAM_PLATE, zt + 4, `shaft.beam${f}.plate`);
    plate(L.SHAFT.x1 - L.BEAM_PLATE, L.SHAFT.x1, zt + 5, `shaft.beam${f}.plate`);
  }

  // 17. Sill support angles on the lobby slab edge, under each landing sill.
  const [ey0, ey1] = L.ENTRANCE.jambs;
  for (let f = 1; f <= 5; f++) {
    const z = L.Lf(f);
    S.box(`shaft.sillangle${f}`, [L.SHAFT.x1 - 1, ey0, z - 20], [L.SHAFT.x1, ey1, z - 3], { tone: "mid" }, { r: 0.1 });
    S.box(`shaft.sillangle${f}`, [L.SHAFT.x1 - 4, ey0, z - 4], [L.SHAFT.x1 - 1, ey1, z - 3], { tone: "mid" }, { r: 0.1 });
  }

  // 18. Shaft lights on wall y0, one per floor: a housing and its lens.
  for (let f = 1; f <= 5; f++) {
    const z = L.Lf(f) + 150;
    S.box(`shaft.light${f}`, [34, 0, z], [46, 3.5, z + 16], { tone: "mid" }, { r: 0.6, steps: 3, extra: Dots([at([35.4, 3.5, z + 8]), at([44.6, 3.5, z + 8])], { size: 0.4, tone: "mid" }) });
    S.box(`shaft.light${f}.lens`, [36, 3.5, z + 2], [44, 4.3, z + 14], { tone: "hi" }, { r: 0.6, steps: 3 });
  }
}
