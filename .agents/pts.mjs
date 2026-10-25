import * as k from "../../../.kiro/skills/anatomy/kit/iso-kit.mjs";
import * as L from "../layout.mjs";
const pts = { motor: [56, 159, 1556], T: [80, 159, 1556], gov: [123, 146, 1520], tension: [123, 146, 40], hitchA: [120, 14, 1550], hitchB: [80, 207, 1560], C: [80, 191, 1500], Snear: [85, 128, 78], Sfar: [115, 29, 78], guide: [100, 146, 360], lcp: [188, 157, 1340], landing3: [181, 100, 790], hall3: [184, 132, 792], pit: [100, 100, 40], ladder: [177, 160, 60], loop: [14, 75, 50], buffer: [140, 118, 70] };
for (const [n, p] of Object.entries(pts)) {
  const [x, y] = k.iso(p, L.P);
  console.log(n, (24 + x * 1.158).toFixed(0), (52 + y * 1.158).toFixed(0));
}
