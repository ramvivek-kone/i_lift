// Safety and positioning (plan items 99-104): the overspeed governor on a bracket off the y1 car rail, its
// rope (an endless loop: the x = 133 side and both wraps are static; the x = 113 side is clamped to the car's
// lever, so it is two sliding runs that ride with the car), the weighted tension pulley in the pit, the two
// final limit switches on the y1 car rail and the positioning tape with its top clamp and pit tensioner.
import * as G from "../../../.kiro/skills/anatomy/kit/lathe.mjs";
import * as k from "../../../.kiro/skills/anatomy/kit/iso-kit.mjs";
import { tubePieces, tubeSvg } from "../../../.kiro/skills/anatomy/kit/tube.mjs";
import * as A from "../../../.kiro/skills/anatomy/kit/audit.mjs";
import { circle, faceMarks } from "./machine.mjs";

const GOV_ROPE = 0.45;

export function build(H, L) {
  const gov = H.scope({ piece: "safety", group: "governor" });
  const lim = H.scope({ piece: "safety", group: "limits" });
  const tape = H.scope({ piece: "safety", group: "tape" });
  const { Ln, Dots, at, P } = H;
  const bolt = (p) => Dots([at(p)], { size: 0.42, tone: "mid" });
  const [rx0, rx1] = [L.RAILS[1].x - L.T89.foot / 2, L.RAILS[1].x + L.T89.foot / 2];
  const g = L.GOVERNOR.c;
  const t = L.TENSION.c;
  const Y = [0, 1, 0];
  const seat = L.GOVERNOR.r - GOV_ROPE;
  const body = [[-2.5, 4.5], [-1.6, 4.5], [-1.6, 10.8], [-0.9, 10.8], [-0.9, seat], [0.9, seat]];
  const flange = [[0.9, 10.8], [1.6, 10.8], [1.6, 4.5], [2.5, 4.5]];
  const sheave = (S, name, c, extra = "") => {
    const F = G.frameOf(c, Y, [1, 0, 0], [0, 0, 1]);
    S.turned(name, F, body, { tone: "mid" }, { inner: Ln(G.arcOf(F, 0, seat, P), { tone: "faint" }) });
    S.turned(`${name}.flange`, F, flange, { tone: "mid" }, { extra });
    return F;
  };

  // 99. Governor: an arm off the rail foot's end, a shelf and back plate, the sheave, its flyweight housing
  // (whose face turns, data-rot="gov") and the tripping switch.
  gov.box("safety.gov.arm", [rx1, 142, g[2] - 16], [110, 150, g[2] - 13], { tone: "mid" }, { r: 0.2, extra: bolt([105.5, 150, g[2] - 14.5]) + bolt([109, 150, g[2] - 14.5]) });
  gov.box("safety.gov.shelf", [110, 142, g[2] - 16], [140, 145, g[2] - 13], { tone: "mid" }, { r: 0.2 });
  gov.box("safety.gov.back", [111, 142, g[2] - 13], [135, 143.5, g[2] + 13], { tone: "mid" }, { r: 0.4, steps: 3, extra: bolt([112.5, 143.5, g[2] + 11.5]) + bolt([133.5, 143.5, g[2] + 11.5]) });
  sheave(gov, "safety.gov.sheave", g);
  {
    const F = G.frameOf([g[0], g[1] + 2.5, g[2]], Y, [1, 0, 0], [0, 0, 1]);
    const weights = `<path class="iso-line" data-tone="faint" d="M-1.5 -4.6L1.5 -4.6L1.5 -2.4L-1.5 -2.4Z M-1.5 4.6L1.5 4.6L1.5 2.4L-1.5 2.4Z"/>`;
    const face = H.face([g[0], g[1] + 4, g[2]], [1, 0, 0], [0, 0, -1], `<g data-rot="gov">${H.Ln(circle(0, 0, 1.2) + circle(0, 0, 5.2) + "M0 -1.2L0 -2.4M0 1.2L0 2.4", { tone: "faint" })}${weights}${H.Ln("M1.2 0L5.2 0", { tone: "hi" })}</g>`);
    gov.disc("safety.gov.housing", F, 0, 1.5, 6, { tone: "hi" }, { extra: face });
  }
  gov.box("safety.gov.switch", [136, 142, g[2] - 13], [140, 145, g[2] - 6], { tone: "mid" }, { r: 0.4, steps: 3, extra: bolt([138, 145, g[2] - 7.5]) });

  // 101. Tension pulley: a pivot block on the rail foot's end, the arm, the pulley and the weight.
  gov.box("safety.tension.pivot", [rx1, 142, t[2] - 4], [108, 150, t[2] + 4], { tone: "mid" }, { r: 0.3, extra: bolt([106, 150, t[2]]) });
  gov.box("safety.tension.arm", [108, 142, t[2] - 2], [142, 143.5, t[2] + 2], { tone: "mid" }, { r: 0.3 });
  sheave(gov, "safety.tension.sheave", t);
  gov.box("safety.tension.weight", [136, 143.5, t[2] - 12], [142, 149, t[2] + 2], { tone: "lo" }, { r: 0.4, steps: 3, inner: Ln(k.sideSeam({ x: 136, y: 143.5, w: 6, d: 5.5, r: 0.4 }, t[2] - 5, P, 3), { tone: "faint" }) });

  // 100. Governor rope: one static route over the governor, down the x = 133 side and round the tension
  // pulley, whose two ends merge into the two sliding runs on the x = 113 side.
  {
    const [xa, xb] = L.GOVERNOR.runs;
    const Fg = G.frameOf(g, Y, [1, 0, 0], [0, 0, 1]);
    const Ft = G.frameOf(t, Y, [1, 0, 0], [0, 0, 1]);
    const points = [...G.arcPoints(Fg, 0, L.GOVERNOR.r, Math.PI, 0, 20), ...G.arcPoints(Ft, 0, L.TENSION.r, 2 * Math.PI, Math.PI, 20)];
    void xb;
    const name = "safety.govrope";
    H.route(name, points, GOV_ROPE, { piece: "safety", group: "governor", touch: ["safety.gov.sheave", "safety.tension.sheave", "safety.govrope.up", "safety.govrope.down"], ends: [false, false] });
    tubePieces(points, GOV_ROPE, P, { maxLength: 24, spacing: 0.6 }).forEach((piece, index) =>
      H.put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone: "mid" }), [A.tube(piece.points, piece.radii)], { piece: "safety", group: "governor", route: name, chunk: index, bias: 0.05 }),
    );
    const car = { ride: "travel", move: [0, 0, L.TRAVEL_CM], piece: "safety", group: "governor", tone: "mid" };
    const z0 = L.Lf(1);
    H.ropeSlide("safety.govrope.up", [xa, g[1], g[2]], [xa, g[1], z0 - 31], GOV_ROPE, car);
    H.ropeSlide("safety.govrope.down", [xa, t[1], t[2]], [xa, t[1], z0 - 38], GOV_ROPE, car);
  }

  // 102-103. Final limit switches on brackets off the y1 car rail foot, worked by the car's cam in over-travel.
  for (const [name, zs] of [["top", L.Lf(5) + 155], ["bottom", L.Lf(1) + 80]]) {
    lim.box(`safety.limit.${name}.bracket`, [86, 148.6, zs], [96, 149, zs + 10], { tone: "mid" }, { r: 0.1 });
    lim.box(`safety.limit.${name}`, [86, 141, zs + 1], [92, 148.6, zs + 9], { tone: "mid" }, { r: 0.4, steps: 3, extra: bolt([86.8, 141, zs + 8]) + bolt([91.2, 141, zs + 2]) });
    lim.disc(`safety.limit.${name}.roller`, G.frameOf([90.5, 141, zs + 5], [0, -1, 0], [1, 0, 0], [0, 0, 1]), 0, 1, 1.2, { tone: "lo" });
  }

  // 104. Positioning tape: an arm off the rail foot's end, the clamp plate with a ruler strip, the steel
  // tape, and the spring tensioner on the pit floor.
  {
    const { x, y, w, top } = L.TAPE;
    const ty = [y - 0.05, y + 0.15];
    tape.box("safety.tape.arm", [rx1, 149, top - 6], [148, 150, top], { tone: "mid" }, { r: 0.1 });
    tape.box("safety.tape.clamp", [x - 3, ty[1], top - 12], [x + 3, 149, top], { tone: "mid" }, { r: 0.2, extra: bolt([x - 2, ty[1], top - 3]) + bolt([x + 2, ty[1], top - 3]) });
    const strip = { x: 112, y: 149, w: 28, d: 1, r: 0 };
    const ticks = k.topTicks(113, 139, 1, 5, 149, top + 0.3, [0.4, 0.75], P, "x");
    tape.box("safety.tape.ruler", [strip.x, strip.y, top], [strip.x + strip.w, strip.y + strip.d, top + 0.3], { tone: "mid" }, { r: 0, steps: 1, extra: Ln(ticks.minor, { tone: "lo" }) + Ln(ticks.major, { tone: "mid" }) });
    tape.box("safety.tape", [x - w / 2, ty[0], 22], [x + w / 2, ty[1], top - 2], { tone: "mid" }, { r: 0, steps: 1 });
    tape.box("safety.tape.foot", [x - 2, ty[0] - 0.6, 16], [x + 2, ty[1] + 0.6, 22], { tone: "mid" }, { r: 0.2 });
    const F = G.frameOf([x, y, 4], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const ribs = G.ribsOf(F, 0.2, 11.8, 1.6, 7, P, { twist: 1.2, fade: [0.05, 0.5] });
    tape.disc("safety.tape.spring", F, 0, 12, 1.6, { tone: "mid" }, { inner: H.Faded(ribs, { tone: "lo" }) });
    tape.box("safety.tape.base", [x - 5, y - 4, 0], [x + 5, y + 4, 4], { tone: "mid" }, { r: 0.4, extra: bolt([x - 4, y - 3, 4]) + bolt([x + 4, y + 3, 4]) });
  }
}
