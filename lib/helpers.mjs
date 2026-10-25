// Recorder-bound drawing helpers, adapted from the arcade cabinet's build. Every helper records the true
// shape of what it draws into the one recorder as it puts its item, so nothing escapes the audit.
import * as k from "../../../.kiro/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../../.kiro/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../../.kiro/skills/anatomy/kit/tube.mjs";
import * as A from "../../../.kiro/skills/anatomy/kit/audit.mjs";

const signed = (poly) => poly.reduce((a, [x, y], i) => {
  const [x2, y2] = poly[(i + 1) % poly.length];
  return a + x * y2 - x2 * y;
}, 0);
const screenOriented = (pts) => (signed(pts) < 0 ? [...pts].reverse() : pts);
function runsOf(flags, want) {
  const count = flags.length;
  const runs = [];
  const start = flags.findIndex((flag, index) => flag !== flags[(index + count - 1) % count]);
  if (start < 0) return flags[0] === want ? [Array.from({ length: count + 1 }, (_, index) => index % count)] : [];
  let run = null;
  for (let step = 0; step < count; step++) {
    const index = (start + step) % count;
    if (flags[index] === want) {
      if (!run) run = [index];
      run.push((index + 1) % count);
    } else if (run) {
      runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);
  return runs;
}

const safeId = (name) => name.replace(/[^a-zA-Z0-9_-]/g, "-");

// makeHelpers(R, P, defaults): defaults ({ piece, group, ride, move }) apply to every item put through
// these helpers; scope(more) returns the same helpers with more defaults (e.g. a moving assembly).
export function makeHelpers(R, P, defaults = {}, shared = { cables: [], clips: new Set() }) {
  const V = G.viewOf(P);
  const KS = G.scaleOf(P);
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const Dots = (points, style) => k.dotsSvg(points, style);
  const Faded = (list, style) => k.fadedSvg(list, style);
  const path3 = (points, closed = false) => k.pathOf(points.map(at), closed);
  const record = R.solid;

  // put(name, ref, svg, shapes, { bias, piece, group, ride, move, owner, ...rest })
  function put(name, ref, svg, shapes = [], { bias = 0, owner, ...rest } = {}) {
    const o = { ...defaults, ...rest };
    const piece = o.piece ?? "shaft";
    if (owner) for (const shape of shapes) shape.owner = owner;
    return R.put({ ...o, name, at: ref, bias, svg, shapes, piece, group: o.group ?? piece, ride: o.ride, move: o.move ?? [0, 0, 0] });
  }

  function prismPaths(F, poly, s0, s1) {
    const ring = signed(poly) > 0 ? poly : [...poly].reverse();
    const n = ring.length;
    const W3 = (s, [x, y]) => [F.o[0] + F.a[0] * s + F.u[0] * x + F.v[0] * y, F.o[1] + F.a[1] * s + F.u[1] * x + F.v[1] * y, F.o[2] + F.a[2] * s + F.u[2] * x + F.v[2] * y];
    const capNear = G.dot3(F.a, V) > 0;
    const [nearS, farS] = capNear ? [s1, s0] : [s0, s1];
    const near = ring.map((p) => at(W3(nearS, p)));
    const far = ring.map((p) => at(W3(farS, p)));
    const normals = ring.map(([x0, y0], i) => {
      const [x1, y1] = ring[(i + 1) % n];
      return G.unit3(G.add3(G.mul3(F.u, y1 - y0), G.mul3(F.v, -(x1 - x0))));
    });
    const facing = normals.map((m) => G.dot3(m, V) > 1e-9);
    const outline = [];
    const crease = [];
    for (const run of runsOf(facing, false)) outline.push(k.pathOf(run.map((i) => near[i])));
    for (const run of runsOf(facing, true)) {
      crease.push(k.pathOf(run.map((i) => near[i])));
      outline.push(k.pathOf(run.map((i) => far[i])));
    }
    for (let i = 0; i < n; i++) if (facing[(i + n - 1) % n] !== facing[i]) outline.push(k.pathOf([near[i], far[i]]));
    const parts = [k.pathOf(screenOriented(near), true), k.pathOf(screenOriented(far), true)];
    const buckets = [[], [], [], [], []];
    for (let i = 0; i < n; i++) {
      if (!facing[i]) continue;
      const quad = screenOriented([near[i], near[(i + 1) % n], far[(i + 1) % n], far[i]]);
      parts.push(k.pathOf(quad, true));
      buckets[G.toneOf(normals[i], P)].push(k.pathOf(quad, true));
    }
    const capTone = G.toneOf(capNear ? F.a : G.mul3(F.a, -1), P);
    buckets[capTone].push(k.pathOf(screenOriented(near), true));
    return { fill: parts.join(""), outline: outline.join(""), crease: crease.join(""), top: buckets[4].join(""), shades: buckets.slice(0, 4).map((b) => b.join("")) };
  }

  function prism(name, F, poly, s0, s1, style = {}, { extra = "", inner = "", bias = 0, ref, ...opts } = {}) {
    const shape = record(A.prism(F, poly, s0, s1, { name }));
    const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length;
    const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
    const centre = G.add3(G.add3(G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), G.mul3(F.u, cx)), G.mul3(F.v, cy));
    put(name, ref ?? centre, S(prismPaths(F, poly, s0, s1), { tone: "mid", ...style, inner }) + extra, [shape], { bias, ...opts });
    return shape;
  }

  // wrap(svg) puts the drawing in an inner group (a door panel's slide group, for example).
  function box(name, [x0, y0, z0], [x1, y1, z1], style = {}, { r = 0.4, steps = 2, bevel = 0, extra = "", inner = "", bias = 0, ground = false, wrap, owner, ...opts } = {}) {
    const plan = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r };
    const shape = record(A.slab(plan, z0, z1 - z0, { name, ...(ground ? { ground: true } : {}), ...(owner ? { owner } : {}) }, steps));
    const svg = S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra;
    put(name, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], wrap ? wrap(svg) : svg, [shape], { bias, ...opts });
    return shape;
  }

  function slab(name, plan, z, h, style = {}, { steps = 2, bevel = 0, extra = "", inner = "", bias = 0, ...opts } = {}) {
    const shape = record(A.slab(plan, z, h, { name }, steps));
    put(name, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { bias, ...opts });
    return shape;
  }

  // Any floor outline (concave too) stood on the floor and extruded up.
  function extruded(name, ring, z, h, style = {}, { extra = "", inner = "", bias = 0, bevel, ref, ...opts } = {}) {
    const shape = record(A.extruded(ring, z, h, { name }));
    const cx = ring.reduce((a, p) => a + p[0], 0) / ring.length;
    const cy = ring.reduce((a, p) => a + p[1], 0) / ring.length;
    put(name, ref ?? [cx, cy, z + h / 2], S(k.extrude(ring, z, h, P, { convex: false, ...(bevel ? { bevel } : {}) }), { tone: "mid", ...style, inner }) + extra, [shape], { bias, ...opts });
    return shape;
  }

  function turned(name, F, profile, style = {}, { extra = "", inner = "", bias = 0, smooth, steps, rims, bevel = 0, owner, ...opts } = {}) {
    const options = { bevel, ...(smooth !== undefined ? { smooth } : {}), ...(steps ? { steps } : {}), ...(rims ? { rims } : {}) };
    const paths = G.solidOf(profile, F, P, options);
    const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
    const shape = record(A.solid(F, profile, { name, owner, radius: smooth && smooth.radius ? smooth.radius : null }));
    put(name, G.add3(F.o, G.mul3(F.a, mid)), S(paths, { tone: "mid", ...style, inner }) + extra, [shape], { bias, ...opts });
    return shape;
  }

  const disc = (name, F, s0, s1, r, style = {}, options = {}) => turned(name, F, [[s0, r], [s1, r]], style, options);

  function ball(name, c, r, style = {}, { bias = 0, extra = "", ...opts } = {}) {
    const shape = record(A.ball(c, r, { name }));
    put(name, c, S(G.sphereOf(c, r, P, { steps: 32 }), { tone: "mid", ...style }) + extra, [shape], { bias, ...opts });
    return shape;
  }

  // A face-plane transform: local x along ex, local y along ey, origin at o.
  function planeMatrix(o, ex, ey) {
    const p0 = at(o);
    const px = at(G.add3(o, ex));
    const py = at(G.add3(o, ey));
    const v = (x) => x.toFixed(4);
    return `matrix(${v(px[0] - p0[0])} ${v(px[1] - p0[1])} ${v(py[0] - p0[0])} ${v(py[1] - p0[1])} ${p0[0].toFixed(2)} ${p0[1].toFixed(2)})`;
  }
  const face = (o, ex, ey, inner) => `<g transform="${planeMatrix(o, ex, ey)}">${inner}</g>`;

  const route = (name, points, r, opts = {}) => {
    const o = { ...defaults, ...opts };
    return R.route(name, points, r, { ...opts, piece: o.piece ?? "shaft", move: o.move ?? [0, 0, 0], ride: o.ride ?? o.piece ?? "shaft" });
  };

  function cable(name, points, r = 0.5, { tone = "mid", bend = 3, ends = [true, true], shells = [false, false], rings, maxLength = 16, bias = 0.05, limp = true, touch, bundle, ...opts } = {}) {
    const path = G.fillet(points, Math.max(bend, r * 2.6), 10, { P, tube: r });
    const total = G.pathLength(path);
    const SHELL = Math.max(1.6, r * 2.4);
    const gaps = [...(shells[0] ? [[0, SHELL]] : []), ...(shells[1] ? [[total - SHELL, total]] : [])];
    route(name, path, r, { gaps, limp, touch, bundle, rims: shells.map((on) => (on ? r * 1.9 : r)), ...opts });
    shared.cables.push(name);
    tubePieces(path, r, P, { maxLength, spacing: Math.max(0.6, Math.min(1.6, r)), gaps, ...(rings ? { rings } : {}) }).forEach((piece, index) =>
      put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone }), [A.tube(piece.points, piece.radii)], { bias, route: name, chunk: index, ...opts }),
    );
    [0, 1].forEach((index) => {
      const end = index ? path[path.length - 1] : path[0];
      if (shells[index]) {
        const tangent = G.tangentAlong(path, index ? total : 0);
        const F = G.frameAlong(end, tangent);
        const [s0, s1] = index ? [-SHELL, 0] : [0, SHELL];
        const shape = record(A.disc(F, s0, s1, r * 1.9, { name: `${name}.shell${index}`, owner: name }));
        put(`${name}.shell${index}`, G.add3(end, G.mul3(tangent, (s0 + s1) / 2)), S(G.disc(s0, s1, r * 1.9, F, P, { steps: 20, bevel: 0.2 }), { tone: "mid" }), [shape], { bias: bias + 0.1, ...opts });
      } else if (ends[index]) {
        const size = Math.max(0.5, r * KS * 0.9);
        put(`${name}.end${index}`, end, Dots([at(end)], { size, tone: "hi" }), [A.ball(end, size / KS, { name: `${name}.end${index}`, owner: name })], { bias: bias + 0.15, ...opts });
      }
    });
    return path;
  }

  // A rope run whose visible length changes as its moving end rides: one full-length tubePieces chunk
  // (rest length plus the whole stroke beyond the fixed end), clipped at the fixed end by a clip that the
  // page holds still (data-hold), recorded as a rod sliding out of a gland at the fixed end.
  function ropeSlide(name, top, bottom, r, { ride, move, group, tone = "hi", stroke = 1120, bias = 0.05, owner, ...opts } = {}) {
    const down = G.unit3(G.sub3(bottom, top));
    const rest = G.len3(G.sub3(bottom, top));
    const F = G.frameAlong(top, down);
    const start = G.add3(top, G.mul3(down, -stroke));
    // A straight run: a coarse spacing keeps the path small without changing its shape.
    const [piece] = tubePieces([start, bottom], r, P, { maxLength: rest + stroke + 1, spacing: 20, caps: [false, true] });
    const { clip } = G.rodOut(F, 0, rest, r, P, { stroke });
    let id = `clip-${safeId(name)}`;
    for (let n = 2; shared.clips.has(id); n++) id = `clip-${safeId(name)}-${n}`;
    shared.clips.add(id);
    const svg = `<clipPath id="${id}"><path data-hold d="${clip}"/></clipPath><g clip-path="url(#${id})">${tubeSvg(piece, { tone })}</g>`;
    const shape = record(A.slide(F, 0, rest, r, { name, owner: owner ?? name }));
    return put(name, G.add3(top, G.mul3(down, rest / 2)), svg, [shape], { bias, ride, move, group, ...opts });
  }

  const scope = (more) => makeHelpers(R, P, { ...defaults, ...more }, shared);

  return { put, record, prismPaths, prism, box, slab, extruded, turned, disc, ball, planeMatrix, face, cable, route, ropeSlide, scope, at, S, Ln, Dots, Faded, path3, V, KS, P, R, cables: shared.cables };
}
