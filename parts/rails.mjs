// Guide rails (plan items 19-28): two T89 car rails at x = 100 and two T50 counterweight rails at x = 80,
// in 5 m lengths joined by fishplates, standing on base plates in the pit and held by wall brackets
// (y0), clips on the common bracket beams (y1 car rail, CWT rail 1) and slab-edge brackets (CWT rail 2).
import * as k from "../../../.kiro/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../../.kiro/skills/anatomy/kit/lathe.mjs";
import * as A from "../../../.kiro/skills/anatomy/kit/audit.mjs";

// T-profile ring in plan: foot across x, blade pointing along dir (+1 or -1 in y).
function tRing(rail) {
  const { x, foot, dir, kind } = rail;
  const f = kind.foot / 2;
  const b = kind.blade / 2;
  const yF = foot + dir * kind.footT;
  const yT = foot + dir * kind.height;
  return [[x - f, foot], [x + f, foot], [x + f, yF], [x + b, yF], [x + b, yT], [x - b, yT], [x - b, yF], [x - f, yF]];
}

export function build(H, L) {
  const S = H.scope({ piece: "rails" });
  const { Dots, Ln, at, P } = H;
  const bolt = (p, axis) => Ln(k.sideRing(p, 0.75, axis, P, 12), { tone: "lo" }) + Dots([at(p)], { size: 0.45, tone: "mid" });
  const boltTop = (x, y, z) => Ln(k.ring(x, y, 0.75, z, P, 12), { tone: "lo" }) + Dots([at([x, y, z])], { size: 0.45, tone: "mid" });

  for (const rail of L.RAILS) {
    const { x, foot, dir, kind, top, id } = rail;
    const ring = tRing(rail);
    const half = kind.foot / 2;
    const tip = L.tipOf(rail);
    const yLo = Math.min(foot, tip);
    const yHi = Math.max(foot, tip);
    const big = kind === L.T89;

    // 24. Base plate on the pit floor, with two anchor bolts.
    S.box(`rails.${id}.base`, [x - half - 3, yLo - 3, L.PIT_TOP], [x + half + 3, yHi + 3, L.RAIL_BASE], { tone: "mid" }, {
      r: 0.4,
      extra: boltTop(x - half - 1.5, (yLo + yHi) / 2, L.RAIL_BASE) + boltTop(x + half + 1.5, (yLo + yHi) / 2, L.RAIL_BASE),
    });

    // 19-22. The rail itself, in lengths up to its top.
    const joints = L.RAIL_JOINTS.filter((z) => z < top - 10);
    const cuts = [L.RAIL_BASE, ...joints, top];
    // Foot and blade are separate items, so a guide roller sitting in the notch between them can be
    // drawn in front of one and behind the other.
    void ring;
    const yF = foot + dir * kind.footT;
    const bh = kind.blade / 2;
    for (let i = 0; i < cuts.length - 1; i++) {
      S.box(`rails.${id}.foot`, [x - half, Math.min(foot, yF), cuts[i]], [x + half, Math.max(foot, yF), cuts[i + 1]], { tone: "mid" }, { r: 0, steps: 1 });
      S.box(`rails.${id}.blade`, [x - bh, Math.min(yF, tip), cuts[i]], [x + bh, Math.max(yF, tip), cuts[i + 1]], { tone: "mid" }, { r: 0, steps: 1 });
    }

    // 23. Fishplates behind the foot at each joint, bolted through the foot.
    const half2 = big ? 25 : 15;
    const yBack = dir > 0 ? [foot - 1.2, foot] : [foot, foot + 1.2];
    for (const z of joints) {
      const front = dir > 0 ? foot + kind.footT : foot + 1.2;
      const bolts = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => bolt([x + sx * (half - 1), front, z + sz * (half2 - 5)], "y"))).join("");
      S.box(`rails.${id}.fishplate`, [x - half, yBack[0], z - half2], [x + half, yBack[1], z + half2], { tone: "mid" }, { r: 0.2, extra: dir > 0 ? "" : bolts });
      if (dir > 0) {
        // Bolt heads on the foot's visible front face: thin discs sitting on it.
        const heads = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => H.record(A.disc(G.frameAlong([x + sx * (half - 1), front, z + sz * (half2 - 5)], [0, 1, 0]), 0, 0.3, 0.75, { name: `rails.${id}.fishbolt` }))));
        S.put(`rails.${id}.fishbolts`, [x, front, z], bolts, heads, { bias: 0.2 });
      }
    }
  }

  const [carY0, carY1, cwt1, cwt2] = L.RAILS;
  const B = L.BEAM;

  for (let f = 1; f <= 5; f++) {
    const zb = B.bottom(f);
    const zt = B.top(f);

    // 25. Car rail y0: wall plate, standoff arm and backing plate on wall y0, with two clips on the foot.
    {
      const r = carY0;
      const h = r.kind.foot / 2;
      const yb = r.foot;
      S.box(`rails.bracket${f}.wall`, [r.x - 10, 0, zb], [r.x + 10, 1.5, zb + 16], { tone: "mid" }, {
        r: 0.2,
        extra: [[-8.5, 2], [8.5, 2], [-8.5, 14], [8.5, 14]].map(([dx, dz]) => bolt([r.x + dx, 1.5, zb + dz], "y")).join(""),
      });
      S.box(`rails.bracket${f}.arm`, [r.x - 1.5, 1.5, zb + 3], [r.x + 1.5, yb - 1.2, zb + 13], { tone: "mid" }, { r: 0.2 });
      S.box(`rails.bracket${f}.back`, [r.x - h - 2.5, yb - 1.2, zb + 1], [r.x + h + 2.5, yb, zb + 15], { tone: "mid" }, { r: 0.2 });
      for (const [x0, x1] of [[r.x - h - 2.5, r.x - h], [r.x + h, r.x + h + 2.5]]) {
        S.box(`rails.bracket${f}.clip`, [x0, yb, zb + 4], [x1, yb + r.kind.footT + 0.6, zb + 12], { tone: "mid" }, { r: 0.2, extra: bolt([(x0 + x1) / 2, yb + r.kind.footT + 0.6, zb + 8], "y") });
      }
    }

    // 26. Car rail y1: two clips on the beam web, either side of the foot.
    {
      const r = carY1;
      const h = r.kind.foot / 2;
      for (const [x0, x1] of [[r.x - h - 2.5, r.x - h], [r.x + h, r.x + h + 2.5]]) {
        S.box(`rails.clip${f}.car`, [x0, r.foot - r.kind.footT - 0.6, zb + 4], [x1, r.foot, zb + 12], { tone: "mid" }, { r: 0.2, extra: boltTop((x0 + x1) / 2, r.foot - 0.8, zb + 12) });
      }
    }

    // 26. CWT rail 1: clips on the far flange tips, top and bottom flange, either side of the foot.
    {
      const r = cwt1;
      const h = r.kind.foot / 2;
      for (const [z0, z1] of [[zt - 2.5, zt], [zb, zb + 2.5]]) {
        for (const [x0, x1] of [[r.x - h - 2.5, r.x - h], [r.x + h, r.x + h + 2.5]]) {
          S.box(`rails.clip${f}.cwt`, [x0, r.foot, z0], [x1, r.foot + r.kind.footT + 0.6, z1], { tone: "mid" }, { r: 0.2, extra: Dots([at([(x0 + x1) / 2, r.foot + r.kind.footT + 0.6, (z0 + z1) / 2])], { size: 0.45, tone: "mid" }) });
        }
      }
    }

    // 27. CWT rail 2: a bracket on the side slab edge (y 235), arm, backing plate and clips.
    {
      const r = cwt2;
      const h = r.kind.foot / 2;
      const z = L.Lf(f);
      const ye = L.SHAFT.y1;
      S.box(`rails.slabbracket${f}.plate`, [r.x - 8, ye - 1.5, z - 24], [r.x + 8, ye, z - 2], { tone: "mid" }, { r: 0.2, extra: boltTop(r.x - 6.5, ye - 0.75, z - 2) + boltTop(r.x + 6.5, ye - 0.75, z - 2) });
      S.box(`rails.slabbracket${f}.arm`, [r.x - 1.5, r.foot + 1.2, z - 20], [r.x + 1.5, ye - 1.5, z - 6], { tone: "mid" }, { r: 0.2 });
      S.box(`rails.slabbracket${f}.back`, [r.x - h - 2.5, r.foot, z - 22], [r.x + h + 2.5, r.foot + 1.2, z - 4], { tone: "mid" }, { r: 0.2 });
      for (const [x0, x1] of [[r.x - h - 2.5, r.x - h], [r.x + h, r.x + h + 2.5]]) {
        S.box(`rails.slabbracket${f}.clip`, [x0, r.foot - r.kind.footT - 0.6, z - 17], [x1, r.foot, z - 9], { tone: "mid" }, { r: 0.2, extra: boltTop((x0 + x1) / 2, r.foot - 0.8, z - 9) });
      }
    }
  }
}
