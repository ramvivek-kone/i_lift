// Five landing entrances (plan items 113-121): frame (jambs and header) on the lobby slab edge, two
// centre-opening panels hung on the shaft side from a hanger track (slide groups data-door="L{f}-l|r"),
// interlock, closer, sill with its groove, toe guard, the hall station with its call buttons
// (data-call, data-dir) on the wide jamb, and the position indicator (data-pi) over the opening.
import * as k from "../../../.kiro/skills/anatomy/kit/iso-kit.mjs";

export function build(H, L, { open = false } = {}) {
  const { Ln, Dots, at, P } = H;
  const bolt = (p) => Dots([at(p)], { size: 0.42, tone: "mid" });
  const E = L.ENTRANCE;
  const [jy0, jy1] = E.jambs;
  const [oy0, oy1] = E.open;
  const [px0, px1] = L.DOOR.landing;

  for (let f = 1; f <= L.LANDINGS.length; f++) {
    const S = H.scope({ piece: "landings", group: "landings" });
    const hall = H.scope({ piece: "landings", group: "hall" });
    const ind = H.scope({ piece: "landings", group: "indicators" });
    const z = L.Lf(f);
    const fx = E.face;

    // 118. Sill on its support angle, with the closed outline of its guide groove.
    S.box(`landing${f}.sill`, [176, jy0, z - 3], [L.SHAFT.x1, jy1, z], { tone: "mid" }, { r: 0.1, extra: Ln(k.planOutline({ x: 177.6, y: oy0 - 1, w: 0.9, d: oy1 - oy0 + 2, r: 0.4 }, z, P), { tone: "faint" }) });
    // 119. Toe guard under the sill on the shaft side.
    S.box(`landing${f}.toeguard`, [176, jy0, z - 40], [176.8, jy1, z - 4], { tone: "mid" }, { r: 0, steps: 1 });

    // 113. Frame: a jamb on each side (the y1 one wide, carrying the hall station) and the header.
    S.box(`landing${f}.jamb`, [fx[0], jy0, z], [fx[1], oy0, z + E.header], { tone: "mid" }, { r: 0.3 });
    S.box(`landing${f}.jamb`, [fx[0], oy1, z], [fx[1], L.HALL.y[1] + 1, z + E.header], { tone: "mid" }, { r: 0.3 });
    S.box(`landing${f}.header`, [fx[0], oy0, z + L.DOOR.height - 2], [fx[1], oy1, z + E.header], { tone: "mid" }, { r: 0.3 });

    // 114-115. Panels in slide groups, each on two hangers under the hanger track.
    const zt = z + L.DOOR.height - 2;
    for (const [id, [ya, yb], dy] of [[`L${f}-l`, L.DOOR.left, -1], [`L${f}-r`, L.DOOR.right, 1]]) {
      const shift = open && f === 1 ? dy * L.DOOR.slide : 0;
      const wrap = (svg) => `<g data-door="${id}">${svg}</g>`;
      const plan = { x: px0, y: ya + shift, w: px1 - px0, d: yb - ya, r: 0 };
      S.box(`landing${f}.panel`, [px0, ya + shift, z], [px1, yb + shift, zt], { tone: "mid" }, { r: 0, steps: 1, wrap, inner: Ln(k.sideSeam(plan, z + 105, P, 1), { tone: "faint" }) });
      for (const yh of [ya + 5, yb - 13]) S.box(`landing${f}.hanger`, [176, yh + shift, zt], [px1, yh + 8 + shift, zt + 4], { tone: "mid" }, { r: 0.1, wrap, extra: bolt([px1, yh + 4 + shift, zt + 2]) });
    }
    S.box(`landing${f}.track`, [176, 1, zt + 4], [fx[0], 157, zt + 8], { tone: "mid" }, { r: 0.2, extra: [10, 60, 100, 150].map((y) => bolt([fx[0] - 1, y, zt + 8])).join("") });

    // 116. Interlock on the track: lock box, hook and contact block.
    S.box(`landing${f}.lock`, [176, 70, zt + 8], [fx[0], 78, zt + 16], { tone: "mid" }, { r: 0.3, extra: bolt([fx[0], 71, zt + 15]) + bolt([fx[0], 77, zt + 15]) });
    S.box(`landing${f}.lock.hook`, [176.4, 78, zt + 9], [177.6, 80, zt + 12], { tone: "mid" }, { r: 0.1 });
    S.box(`landing${f}.lock.contact`, [176, 80, zt + 8], [fx[0], 86, zt + 13], { tone: "mid" }, { r: 0.3 });
    // 117. Spring closer on the track.
    S.box(`landing${f}.closer`, [176, 150, zt + 8], [fx[0], 156, zt + 14], { tone: "mid" }, { r: 0.4, steps: 3 });

    // 120. Hall station on the wide jamb: a plate and its call buttons (L1 up only, L5 down only).
    {
      const [hy0, hy1] = L.HALL.y;
      const [hz0, hz1] = L.HALL.z;
      const x = fx[1] + 0.8;
      const dirs = [...(f < L.LANDINGS.length ? ["up"] : []), ...(f > 1 ? ["down"] : [])];
      const arrow = (dir) => (dir === "up" ? "M0 -1L1 0.6L-1 0.6Z" : "M0 1L1 -0.6L-1 -0.6Z");
      const buttons = dirs
        .map((dir, i) => {
          const cy = dirs.length === 1 ? 12.5 : 8 + i * 9;
          return `<g data-call="${f}" data-dir="${dir}" role="button" aria-label="Call the car to landing ${f}, going ${dir}" transform="translate(4 ${cy})"><circle class="mrl-btn" cx="0" cy="0" r="2.2"/><path class="mrl-arrow" d="${arrow(dir)}"/></g>`;
        })
        .join("");
      const face = H.face([x, hy1, z + hz1], [0, -1, 0], [0, 0, -1], buttons);
      hall.box(`landing${f}.hall`, [fx[1], hy0, z + hz0], [x, hy1, z + hz1], { tone: "mid" }, { r: 0.3, extra: face + bolt([x, hy0 + 1, z + hz0 + 1]) + bolt([x, hy1 - 1, z + hz1 - 1]) });
    }

    // 121. Position indicator over the opening: a plate with a display window and its text.
    {
      const [iy0, iy1] = L.INDICATOR.y;
      const [iz0, iz1] = L.INDICATOR.z;
      const x = fx[1] + 0.6;
      const w = iy1 - iy0;
      const hgt = iz1 - iz0;
      const inner = `<rect class="mrl-window" x="1.5" y="1.5" width="${w - 3}" height="${hgt - 3}" rx="0.8"/><text class="mrl-display" data-pi="${f}" x="${w / 2}" y="${hgt / 2 + 2.6}" font-size="7" text-anchor="middle" textLength="${w - 6}" lengthAdjust="spacingAndGlyphs">1 ·</text>`;
      const face = H.face([x, iy1, z + iz1], [0, -1, 0], [0, 0, -1], inner);
      ind.box(`landing${f}.indicator`, [fx[1], iy0, z + iz0], [x, iy1, z + iz1], { tone: "mid" }, { r: 0.3, extra: face });
    }
  }
}
