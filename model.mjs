// Pure model of a 630 kg, 1.0 m/s machine-room-less traction elevator, roped 2:1.
// No imports, no DOM, no clock: the build imports it and the page inlines it.

export const SPEC = {
  floors: 5, floorHeight: 2.8, pit: 1.2, overhead: 3.6,
  ratedLoad: 630, persons: 8, carMass: 700, balance: 0.5,
  ratedSpeed: 1.0, accel: 0.6, jerk: 1.0,
  roping: 2, ropes: 4, ropeD: 0.008,
  sheaveD: 0.32, carPulleyD: 0.32, cwtPulleyD: 0.32,
  govD: 0.20, govTrip: 1.15, poles: 20,
  door: { clear: 0.80, open: 2.0, dwell: 3.0, close: 2.5 },
  levelZone: 0.05,
};
export const TRAVEL = (SPEC.floors - 1) * SPEC.floorHeight;
export const PERSON_KG = 75;
export const CWT_MASS = SPEC.carMass + SPEC.balance * SPEC.ratedLoad;

export const floorPos = (f) => (f - 1) * SPEC.floorHeight;

// Distance covered while accelerating from rest to v with limits a and j.
function accelDistance(v, a, j) {
  if (v <= 0) return 0;
  if (v >= (a * a) / j) return (v * (v / a + a / j)) / 2;
  return v * Math.sqrt(v / j);
}

// 7-segment jerk-limited S-curve from position `from` to `to` (metres).
export function plan(from, to, spec = SPEC) {
  const d = Math.abs(to - from);
  const dir = to > from ? 1 : to < from ? -1 : 0;
  const a = spec.accel;
  const j = spec.jerk;
  let vPeak = spec.ratedSpeed;
  if (d === 0) vPeak = 0;
  else if (2 * accelDistance(vPeak, a, j) > d) {
    let lo = 0;
    let hi = vPeak;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (2 * accelDistance(mid, a, j) > d) hi = mid;
      else lo = mid;
    }
    vPeak = lo;
  }
  const tj = vPeak > 0 ? Math.min(a / j, Math.sqrt(vPeak / j)) : 0;
  const aPeak = j * tj;
  const ta = vPeak > 0 ? Math.max(0, vPeak / aPeak - tj) : 0;
  const tc = vPeak > 0 ? Math.max(0, (d - 2 * accelDistance(vPeak, a, j)) / vPeak) : 0;
  const durations = [tj, ta, tj, tc, tj, ta, tj];
  const jerks = [j, 0, -j, 0, -j, 0, j];
  const segs = [];
  let s = 0;
  let v = 0;
  let acc = 0;
  let t0 = 0;
  for (let i = 0; i < 7; i++) {
    segs.push({ t0, dur: durations[i], j: jerks[i], s, v, a: acc });
    const T = durations[i];
    const jk = jerks[i];
    s += v * T + (acc * T * T) / 2 + (jk * T * T * T) / 6;
    v += acc * T + (jk * T * T) / 2;
    acc += jk * T;
    t0 += T;
  }
  return { from, to, dir, d, vPeak, tj, ta, tc, total: t0, segs };
}

const PHASES = ["accelerating", "accelerating", "accelerating", "running", "decelerating", "decelerating", "decelerating"];

// Closed-form state of a plan at time t: position, speed, acceleration and jerk (signed by direction).
export function sample(p, t, spec = SPEC) {
  if (p.dir === 0 || t >= p.total) return { pos: p.to, v: 0, a: 0, j: 0, phase: "stopped" };
  if (t <= 0) return { pos: p.from, v: 0, a: 0, j: 0, phase: "accelerating" };
  let index = 6;
  for (let i = 0; i < 7; i++) {
    if (t < p.segs[i].t0 + p.segs[i].dur) {
      index = i;
      break;
    }
  }
  const g = p.segs[index];
  const tau = t - g.t0;
  const s = Math.min(p.d, g.s + g.v * tau + (g.a * tau * tau) / 2 + (g.j * tau * tau * tau) / 6);
  const v = Math.max(0, g.v + g.a * tau + (g.j * tau * tau) / 2);
  const a = g.a + g.j * tau;
  const pos = p.from + p.dir * s;
  const phase = Math.abs(p.to - pos) < spec.levelZone ? "levelling" : PHASES[index];
  return { pos, v: p.dir * v, a: p.dir * a, j: p.dir * g.j, phase };
}

const smoothstep = (x) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

// Door fraction (0 closed, 1 open) at time t into a door phase.
export function doorAt(t, phase, spec = SPEC) {
  if (phase === "opening") return smoothstep(t / spec.door.open);
  if (phase === "open") return 1;
  if (phase === "closing") return 1 - smoothstep(t / spec.door.close);
  return 0;
}

const nearestFloor = (pos) => Math.min(SPEC.floors, Math.max(1, Math.round(pos / SPEC.floorHeight) + 1));

// Every number the page shows, from the car position, speed and controller state.
export function derived(state, spec = SPEC) {
  const carPos = state.pos;
  const speed = Math.abs(state.v);
  const ropeSpeed = spec.roping * speed;
  const sheaveRpm = (ropeSpeed / (Math.PI * spec.sheaveD)) * 60;
  const floor = nearestFloor(carPos);
  const persons = state.persons ?? 0;
  const loadKg = persons * PERSON_KG;
  return {
    carPos,
    cwtPos: TRAVEL - carPos,
    speed,
    dir: state.v > 1e-9 ? 1 : state.v < -1e-9 ? -1 : 0,
    travelDir: state.dir ?? 0,
    ropeSpeed,
    sheaveRpm,
    inverterHz: ((spec.poles / 2) * sheaveRpm) / 60,
    sheaveAngle: (spec.roping * carPos) / (spec.sheaveD / 2),
    carPulleyAngle: carPos / (spec.carPulleyD / 2),
    cwtPulleyAngle: carPos / (spec.cwtPulleyD / 2),
    govAngle: carPos / (spec.govD / 2),
    govRpm: (speed / (Math.PI * spec.govD)) * 60,
    govTripSpeed: spec.govTrip * spec.ratedSpeed,
    floor,
    atFloor: speed === 0 && Math.abs(carPos - floorPos(floor)) < 0.005,
    persons,
    loadKg,
    loadPct: loadKg / spec.ratedLoad,
    door: state.door ?? 0,
    doorState: state.doorState ?? "closed",
    phase: state.phase ?? "stopped",
    loopPos: carPos / 2,
  };
}

// The card's readout and the status line, from derived() alone.
export function readout(d) {
  const arrow = d.travelDir > 0 ? "▲" : d.travelDir < 0 ? "▼" : d.floor === SPEC.floors ? "▼" : "▲";
  return `L${d.floor} ${arrow} ${d.speed.toFixed(2)} m/s · rope ${d.ropeSpeed.toFixed(2)} m/s · ${Math.round(d.sheaveRpm)} rpm`;
}
export function status(d) {
  return `Car ${d.carPos.toFixed(2)} m above L1 · counterweight ${d.cwtPos.toFixed(2)} m · load ${Math.round(d.loadPct * 100)} % (${d.loadKg} kg) · doors ${d.doorState} · governor ${Math.round(d.govRpm)} rpm (trips at ${d.govTripSpeed.toFixed(2)} m/s)`;
}

// ---- Controller: a pure full-collective state machine -------------------------------------

export function initial(floor = 1, open = false) {
  return {
    t: 0, pos: floorPos(floor), v: 0, a: 0, phase: "stopped",
    floor, target: null, dir: 0, motion: null,
    calls: { car: [], up: [], down: [] },
    doorState: open ? "open" : "closed", doorT: 0, door: open ? 1 : 0, persons: 0,
  };
}

// The page opens with the car parked at a mid landing, doors open, so the cab, sling and doors read at once.
export const START_FLOOR = 3;
export const start = () => initial(START_FLOOR, true);

const clone = (s) => ({ ...s, calls: { car: [...s.calls.car], up: [...s.calls.up], down: [...s.calls.down] }, motion: s.motion ? { ...s.motion } : null });
const add = (list, f) => (list.includes(f) ? list : [...list, f].sort((x, y) => x - y));
const drop = (list, f) => list.filter((x) => x !== f);
const parked = (s) => !s.motion && Math.abs(s.pos - floorPos(s.floor)) < 1e-9;

function reopen(s) {
  if (s.doorState === "open") s.doorT = 0;
  else if (s.doorState === "closing") {
    // Reopen from the fraction the doors have reached, so they never jump.
    const f = s.door;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2;
      if (smoothstep(m) < f) lo = m;
      else hi = m;
    }
    s.doorState = "opening";
    s.doorT = lo * SPEC.door.open;
  } else if (s.doorState === "closed") {
    s.doorState = "opening";
    s.doorT = 0;
  }
}

export function call(state, floor, kind = "car") {
  if (!(floor >= 1 && floor <= SPEC.floors)) return state;
  if (kind === "up" && floor === SPEC.floors) return state;
  if (kind === "down" && floor === 1) return state;
  const s = clone(state);
  if (parked(s) && s.floor === floor) {
    reopen(s);
    return s;
  }
  s.calls[kind] = add(s.calls[kind], floor);
  return s;
}

export function board(state, n) {
  if (state.doorState !== "open") return state;
  const s = clone(state);
  s.persons = Math.min(SPEC.persons, Math.max(0, s.persons + n));
  s.doorT = 0;
  return s;
}

const pending = (s) => s.calls.car.length + s.calls.up.length + s.calls.down.length > 0;
const allCalls = (s) => [...new Set([...s.calls.car, ...s.calls.up, ...s.calls.down])];

// Next stop for direction dir from floor f, or null when nothing lies ahead.
function nextStop(s, f, dir) {
  const ahead = (x) => (dir > 0 ? x > f : x < f);
  const along = dir > 0 ? s.calls.up : s.calls.down;
  const near = [...s.calls.car, ...along].filter(ahead).sort((x, y) => dir * (x - y));
  if (near.length) return near[0];
  const against = (dir > 0 ? s.calls.down : s.calls.up).filter(ahead).sort((x, y) => dir * (y - x));
  return against.length ? against[0] : null;
}

function choose(s) {
  const f = s.floor;
  const dirs = s.dir ? [s.dir, -s.dir] : [1, -1];
  if (!s.dir) {
    // Idle: head for the nearest call, upward on a tie.
    const calls = allCalls(s).filter((x) => x !== f);
    if (!calls.length) return null;
    const best = calls.sort((x, y) => Math.abs(x - f) - Math.abs(y - f) || y - x)[0];
    return { target: best, dir: best > f ? 1 : -1 };
  }
  for (const d of dirs) {
    const t = nextStop(s, f, d);
    if (t !== null) return { target: t, dir: d };
  }
  return null;
}

function arrive(s) {
  const f = s.floor;
  s.calls.car = drop(s.calls.car, f);
  if (s.dir > 0) s.calls.up = drop(s.calls.up, f);
  if (s.dir < 0) s.calls.down = drop(s.calls.down, f);
  if (s.dir && nextStop(s, f, s.dir) === null) {
    // Nothing more ahead: serve the other direction here and turn round.
    s.calls.up = drop(s.calls.up, f);
    s.calls.down = drop(s.calls.down, f);
    s.dir = pending(s) ? -s.dir : 0;
    if (s.dir && nextStop(s, f, s.dir) === null) s.dir = 0;
  }
  s.doorState = "opening";
  s.doorT = 0;
}

export function step(state, dt) {
  const s = clone(state);
  s.t += dt;
  if (s.motion) {
    s.motion.t += dt;
    const p = s.motion.plan;
    const q = sample(p, s.motion.t);
    s.pos = q.pos;
    s.v = q.v;
    s.a = q.a;
    s.phase = q.phase;
    if (s.motion.t >= p.total) {
      s.pos = p.to;
      s.v = 0;
      s.a = 0;
      s.phase = "stopped";
      s.motion = null;
      s.floor = s.target;
      s.target = null;
      arrive(s);
    }
    return s;
  }
  if (s.doorState === "opening") {
    s.doorT += dt;
    s.door = doorAt(s.doorT, "opening");
    if (s.doorT >= SPEC.door.open) {
      s.doorState = "open";
      s.doorT = 0;
      s.door = 1;
    }
    return s;
  }
  if (s.doorState === "open") {
    // A hall call for this floor in the direction of travel keeps the doors open.
    s.calls.car = drop(s.calls.car, s.floor);
    if (s.dir >= 0 && s.calls.up.includes(s.floor)) (s.calls.up = drop(s.calls.up, s.floor)), (s.doorT = 0);
    if (s.dir <= 0 && s.calls.down.includes(s.floor)) (s.calls.down = drop(s.calls.down, s.floor)), (s.doorT = 0);
    s.doorT += dt;
    if (s.doorT >= SPEC.door.dwell) {
      s.doorState = "closing";
      s.doorT = 0;
    }
    return s;
  }
  if (s.doorState === "closing") {
    s.doorT += dt;
    s.door = doorAt(s.doorT, "closing");
    if (s.doorT >= SPEC.door.close) {
      s.doorState = "closed";
      s.doorT = 0;
      s.door = 0;
    }
    return s;
  }
  // Doors closed and parked.
  if (s.calls.car.includes(s.floor) || (s.calls.up.includes(s.floor) && s.dir >= 0) || (s.calls.down.includes(s.floor) && s.dir <= 0)) {
    s.calls.car = drop(s.calls.car, s.floor);
    if (s.dir >= 0) s.calls.up = drop(s.calls.up, s.floor);
    if (s.dir <= 0) s.calls.down = drop(s.calls.down, s.floor);
    s.doorState = "opening";
    s.doorT = 0;
    return s;
  }
  const next = choose(s);
  if (!next) {
    // Only a call against the direction at this floor may remain: turn round and serve it.
    if (s.calls.up.includes(s.floor) || s.calls.down.includes(s.floor)) {
      s.calls.up = drop(s.calls.up, s.floor);
      s.calls.down = drop(s.calls.down, s.floor);
      s.dir = 0;
      s.doorState = "opening";
      s.doorT = 0;
      return s;
    }
    s.dir = 0;
    return s;
  }
  s.dir = next.dir;
  s.target = next.target;
  s.motion = { plan: plan(s.pos, floorPos(next.target)), t: 0 };
  s.phase = "accelerating";
  return s;
}

// The idle tour: loads going up and down, starting and ending at START_FLOOR (L3), so it loops seamlessly
// from the opening pose. Times in seconds from the start of the tour.
export const TOUR = [
  { at: 0.0, floor: 3, kind: "car", board: 0 },
  { at: 2.5, floor: 0, kind: "", board: 2 },
  { at: 3.0, floor: 5, kind: "car", board: 0 },
  { at: 18.0, floor: 0, kind: "", board: 3 },
  { at: 18.5, floor: 1, kind: "car", board: 0 },
  { at: 39.5, floor: 0, kind: "", board: -4 },
  { at: 40.0, floor: 2, kind: "up", board: 0 },
  { at: 52.5, floor: 0, kind: "", board: 1 },
  { at: 53.0, floor: 3, kind: "car", board: 0 },
  { at: 65.5, floor: 0, kind: "", board: -2 },
];
export const TOUR_LENGTH = 74;

// Apply one tour event to a state.
export function tourEvent(state, event) {
  let s = state;
  if (event.board) s = board(s, event.board);
  if (event.floor) s = call(s, event.floor, event.kind || "car");
  return s;
}
