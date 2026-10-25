// Landing control panel (plan items 122-129) on the L5 lobby slab beside the frame: the cabinet (near side
// cut away, door swung open on its far hinge), the VVVF inverter with heatsink slots and its Hz display
// (data-hz), three contactors, the main switch, the manual brake release lever, the ARD battery and the
// terminal strip. Three cables leave through glands in its top and cross the overhead in three parallel lanes,
// above everything else, to the machine: the power cable to the motor terminal box, the brake-release Bowden
// cable to brake A and the encoder cable to the encoder.
import * as G from "../../../.kiro/skills/anatomy/kit/lathe.mjs";
import * as k from "../../../.kiro/skills/anatomy/kit/iso-kit.mjs";

export function build(H, L) {
  const S = H.scope({ piece: "controller", group: "controller" });
  const { Ln, Dots, at, P } = H;
  const bolt = (p) => Dots([at(p)], { size: 0.42, tone: "mid" });
  const { x, y, w, d } = L.LCP.plan;
  const [z0, z1] = L.LCP.z;
  const x1 = x + w;
  const y1 = y + d;
  const t = 1.5;
  const bx = x + t; // the internals stand on the back panel's face

  // 122. Cabinet: back, far side, top and bottom; the near side is cut away.
  // The back panel is two sheets (a seam at mid-height), so neither is a slender post the cables could land on.
  const zm = (z0 + z1) / 2;
  S.box("lcp.back", [x, y, z0], [bx, y1, zm], { tone: "mid" }, { r: 0, steps: 1 });
  S.box("lcp.back", [x, y, zm], [bx, y1, z1], { tone: "mid" }, { r: 0, steps: 1 });
  S.box("lcp.side", [bx, y, z0], [x1, y + t, z1], { tone: "mid" }, { r: 0, steps: 1 });
  S.box("lcp.top", [bx, y + t, z1 - t], [x1, y1, z1], { tone: "mid" }, { r: 0, steps: 1 });
  S.box("lcp.bottom", [bx, y + t, z0], [x1, y1, z0 + t], { tone: "mid" }, { r: 0, steps: 1 });
  // The door, swung about 100 degrees on its hinge at the far front edge, with two hinge pins.
  {
    // Closed, the door runs from the hinge along +y; open, it has turned outward (toward +x) by doorDeg.
    const a = (L.LCP.doorDeg * Math.PI) / 180;
    const along = [Math.sin(a), Math.cos(a), 0];
    const normal = [along[1], -along[0], 0];
    const F = { o: [x1, y, z0], a: [0, 0, 1], u: along, v: normal };
    S.prism("lcp.door", F, [[0, 0], [d, 0], [d, t], [0, t]], 0.5, z1 - z0 - 0.5, { tone: "mid" });
    // Hinge pins on the hinge line, clear of both the cabinet side and the door leaf.
    for (const zp of [z0 + 20, z1 - 28]) S.disc("lcp.hinge", G.frameOf([x1 + 0.55, y + 0.55, zp], [0, 0, 1], [1, 0, 0], [0, 1, 0]), 0, 8, 0.5, { tone: "mid" });
  }

  // 123. VVVF inverter: heatsink slots and the frequency display on its front.
  {
    const [ia, ib] = [y + 3, y + 17];
    const [za, zb] = [z0 + 90, z0 + 160];
    const fx = bx + 8.5;
    const slots = Array.from({ length: 9 }, (_, i) => `<rect class="mrl-slot" x="${1.6}" y="${22 + i * 5}" width="${ib - ia - 3.2}" height="2.2" rx="1.1"/>`).join("");
    const inner = `<rect class="mrl-window" x="2" y="3" width="${ib - ia - 4}" height="7" rx="0.6"/><text class="mrl-display" data-hz x="${(ib - ia) / 2}" y="8.4" font-size="4.6" text-anchor="middle" textLength="${ib - ia - 6}" lengthAdjust="spacingAndGlyphs">00.0 Hz</text><rect class="mrl-window" x="2" y="12" width="4" height="4" rx="0.5"/>${slots}`;
    const face = H.face([fx, ib, zb], [0, -1, 0], [0, 0, -1], inner);
    S.box("lcp.inverter", [bx, ia, za], [fx, ib, zb], { tone: "hi" }, { r: 0.4, steps: 3, extra: face });
  }

  // 124-125. Three contactors and the main switch with its handle.
  for (let i = 0; i < 3; i++) {
    const ya = y + 20 + i * 4.4;
    S.box("lcp.contactor", [bx, ya, z0 + 160], [bx + 5.5, ya + 3.8, z0 + 172], { tone: "mid" }, { r: 0.3, steps: 3, extra: bolt([bx + 5.5, ya + 1.9, z0 + 170]) + bolt([bx + 5.5, ya + 1.9, z0 + 162]) });
  }
  S.box("lcp.mainswitch", [bx, y + 20, z0 + 120], [bx + 4.5, y + 32, z0 + 145], { tone: "mid" }, { r: 0.4, steps: 3 });
  S.box("lcp.mainswitch.handle", [bx + 4.5, y + 24.5, z0 + 128], [bx + 7.5, y + 27.5, z0 + 138], { tone: "hi" }, { r: 0.5, steps: 3 });

  // 126. Manual brake release: a base, a lever and its ball knob.
  S.box("lcp.release", [bx, y + 20, z0 + 64], [bx + 3.5, y + 26, z0 + 76], { tone: "mid" }, { r: 0.3 });
  S.disc("lcp.release.lever", G.frameOf([bx + 3.5, y + 23, z0 + 70], [1, 0, 0], [0, 1, 0], [0, 0, 1]), 0, 7, 0.6, { tone: "mid" });
  S.ball("lcp.release.knob", [bx + 3.5 + 7 + 1.15, y + 23, z0 + 70], 1.2, { tone: "hi" });

  // 127-128. ARD battery pack (cells as seams that run edge to edge) and the terminal strip.
  {
    const [ya, yb] = [y + 3, y + 18];
    const [za, zb] = [z0 + 10, z0 + 40];
    const fx = bx + 7.5;
    const cells = [1, 2, 3].map((i) => Ln(k.segment([fx, ya + (i * (yb - ya)) / 4, za], [fx, ya + (i * (yb - ya)) / 4, zb], P), { tone: "faint" })).join("");
    S.box("lcp.battery", [bx, ya, za], [fx, yb, zb], { tone: "mid" }, { r: 0, steps: 1, inner: cells + Ln(k.segment([bx, yb, za + 24], [fx, yb, za + 24], P) + k.segment([fx, ya, za + 24], [fx, yb, za + 24], P), { tone: "faint" }) });
  }
  {
    const [ya, yb] = [y + 20, y + 32];
    const [za, zb] = [z0 + 22, z0 + 50];
    const fx = bx + 3;
    const ways = Array.from({ length: 11 }, (_, i) => k.segment([fx, ya + ((i + 1) * (yb - ya)) / 12, za], [fx, ya + ((i + 1) * (yb - ya)) / 12, zb], P)).join("");
    S.box("lcp.terminals", [bx, ya, za], [fx, yb, zb], { tone: "mid" }, { r: 0, steps: 1, inner: Ln(ways, { tone: "faint" }) });
  }

  // 129. Cables from glands in the cabinet top, up to the overhead hitch beam and along it to the machine.
  const lane = (i) => ({ gx: x + 6 + i * 3, gy: y + 24 + i * 3, ly: L.HITCH_BEAM.y0 - 8 + i * 2.2, lz: 1590 });
  const glands = [0, 1, 2].map((i) => {
    const { gx, gy } = lane(i);
    S.disc("lcp.gland", G.frameOf([gx, gy, z1], [0, 0, 1], [1, 0, 0], [0, 1, 0]), 0, 1.4, 1.6, { tone: "mid" });
    return [gx, gy, z1 + 1.4];
  });
  const run = (i, tail, r, name) => {
    const { gx, gy, ly, lz } = lane(i);
    const g = glands[i];
    H.cable(name, [g, [gx, gy, lz], [gx, ly, lz], ...tail(ly, lz)], r, { piece: "controller", group: "controller", tone: "mid", bend: 4, ends: [false, false], shells: [false, true], bundle: "lcp" });
    void g;
  };
  run(0, (ly, lz) => [[57, ly, lz], [57, 159, lz], [57, 159, 1583]], 0.9, "lcp.cable.power");
  run(1, (ly, lz) => [[33, ly, lz], [33, 159, lz], [33, 159, 1582]], 0.55, "lcp.cable.bowden");
  run(2, (ly, lz) => [[18, ly, lz], [18, 159, lz], [18, 159, L.T.c[2]], [26.5, 159, L.T.c[2]]], 0.45, "lcp.cable.encoder");
}
