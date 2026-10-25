import { test } from "node:test";
import assert from "node:assert/strict";
import { SPEC, TRAVEL, floorPos, plan, sample, derived, readout, status, initial, start, START_FLOOR, call, step, board, TOUR, tourEvent } from "./model.mjs";

const FLOORS = Array.from({ length: SPEC.floors }, (_, i) => i + 1);
const PAIRS = FLOORS.flatMap((from) => FLOORS.filter((to) => to !== from).map((to) => [from, to]));
const DT = 0.001;
const EPS = 1e-9;

test("1. every plan ends exactly on its target, at rest", () => {
  for (const [from, to] of PAIRS) {
    const p = plan(floorPos(from), floorPos(to));
    const end = sample(p, p.total);
    assert.ok(Math.abs(end.pos - floorPos(to)) < EPS, `${from}->${to} ends at ${end.pos}`);
    assert.equal(end.v, 0);
    assert.equal(end.a, 0);
    // The closed form itself lands on the target just before the end.
    const near = sample(p, p.total - 1e-7);
    assert.ok(Math.abs(near.pos - floorPos(to)) < 1e-6, `${from}->${to} closed form ends at ${near.pos}`);
  }
});

test("2. speed, acceleration and jerk stay within limits, position and speed are continuous", () => {
  const short = [[0, 0.3], [0, 1.0], [0, 2.0], [2.2, 0]];
  const runs = [...PAIRS.map(([f, t]) => [floorPos(f), floorPos(t)]), ...short];
  for (const [from, to] of runs) {
    const p = plan(from, to);
    let prev = sample(p, 0);
    for (let t = DT; t <= p.total + DT; t += DT) {
      const q = sample(p, t);
      assert.ok(Math.abs(q.v) <= SPEC.ratedSpeed + EPS, `v ${q.v} at ${t}`);
      assert.ok(Math.abs(q.a) <= SPEC.accel + EPS, `a ${q.a} at ${t}`);
      assert.ok(Math.abs(q.j) <= SPEC.jerk + EPS, `j ${q.j} at ${t}`);
      assert.ok(Math.abs(q.pos - prev.pos) <= SPEC.ratedSpeed * DT + 1e-7, `pos jump at ${t}`);
      assert.ok(Math.abs(q.v - prev.v) <= SPEC.accel * DT + 1e-7, `v jump at ${t}`);
      prev = q;
    }
    assert.ok(Math.abs(prev.pos - to) < EPS);
  }
});

test("2b. short runs solve a lower peak speed and still end on target", () => {
  for (const d of [0.05, 0.3, 1.0, 2.0]) {
    const p = plan(0, d);
    assert.ok(p.vPeak < SPEC.ratedSpeed, `vPeak ${p.vPeak} for ${d}`);
    assert.ok(Math.abs(sample(p, p.total - 1e-9).pos - d) < 1e-6);
  }
});

test("3. run times: one floor 5.067 s, L1 to L5 13.47 s", () => {
  const one = plan(floorPos(1), floorPos(2));
  assert.ok(Math.abs(one.total - (2.8 / 1.0 + 1.0 / 0.6 + 0.6 / 1.0)) < 1e-9);
  assert.ok(Math.abs(one.total - 5.067) < 0.001, `one floor ${one.total}`);
  const all = plan(floorPos(1), floorPos(5));
  assert.ok(Math.abs(all.total - 13.47) < 0.005, `L1-L5 ${all.total}`);
  assert.equal(all.vPeak, SPEC.ratedSpeed);
});

test("4. derived numbers: equal and opposite travel, 2:1 rope speed, rated rpm and Hz", () => {
  for (let pos = 0; pos <= TRAVEL; pos += 0.01) {
    const d = derived({ pos, v: 0.37 });
    assert.ok(Math.abs(d.carPos + d.cwtPos - TRAVEL) < 1e-12);
    assert.equal(d.ropeSpeed, 2 * d.speed);
  }
  const rated = derived({ pos: 5, v: SPEC.ratedSpeed });
  assert.ok(Math.abs(rated.sheaveRpm - 119.37) < 0.01, `rpm ${rated.sheaveRpm}`);
  assert.ok(Math.abs(rated.inverterHz - 19.89) < 0.01, `Hz ${rated.inverterHz}`);
  assert.ok(Math.abs(rated.govRpm - 95.49) < 0.01, `gov ${rated.govRpm}`);
  assert.ok(Math.abs(rated.govTripSpeed - 1.15) < 1e-12);
  const down = derived({ pos: 5, v: -SPEC.ratedSpeed });
  assert.equal(down.dir, -1);
  assert.equal(down.speed, 1);
});

function run(events, seconds, dt = 0.01) {
  let s = initial(1);
  const trace = [];
  const queue = [...events].sort((a, b) => a.at - b.at);
  let next = 0;
  for (let t = 0; t <= seconds; t += dt) {
    while (next < queue.length && queue[next].at <= t + 1e-9) s = tourEvent(s, queue[next++]);
    s = step(s, dt);
    trace.push(s);
  }
  return trace;
}

const CALLS = [
  { at: 0, floor: 4, kind: "car" },
  { at: 1, floor: 2, kind: "up" },
  { at: 2, floor: 5, kind: "down" },
  { at: 3, floor: 3, kind: "down" },
  { at: 20, floor: 1, kind: "car" },
  { at: 21, floor: 5, kind: "car" },
  { at: 40, floor: 2, kind: "down" },
];

test("5. controller: doors shut while moving, every call served, stops only on landings, deterministic", () => {
  const trace = run(CALLS, 160);
  for (const s of trace) {
    if (Math.abs(s.v) > 0) assert.equal(s.door, 0, `door ${s.door} while moving at ${s.t}`);
    if (s.motion) assert.equal(s.doorState, "closed");
  }
  const last = trace[trace.length - 1];
  assert.deepEqual(last.calls, { car: [], up: [], down: [] });
  // Every stop is on a landing.
  for (let i = 1; i < trace.length; i++) {
    if (trace[i - 1].motion && !trace[i].motion) {
      const f = trace[i].floor;
      assert.ok(Math.abs(trace[i].pos - floorPos(f)) < 1e-9, `stopped at ${trace[i].pos}`);
    }
  }
  // Each called floor was visited with the doors open.
  for (const c of CALLS) {
    const served = trace.some((s) => s.t >= c.at && s.doorState === "open" && s.floor === c.floor);
    assert.ok(served, `call ${c.kind} ${c.floor} served`);
  }
  const again = run(CALLS, 160);
  assert.deepEqual(again.map((s) => [s.pos, s.v, s.door]), trace.map((s) => [s.pos, s.v, s.door]));
});

test("5b. boarding only with the doors open, clamped to 0..8; the tour boards while open", () => {
  const s0 = initial(1);
  assert.equal(board(s0, 3).persons, 0);
  let s = call(s0, 1, "car");
  for (let i = 0; i < 300; i++) s = step(s, 0.01);
  assert.equal(s.doorState, "open");
  assert.equal(board(s, 12).persons, 8);
  assert.equal(board(board(s, 2), -5).persons, 0);
  // Replay the tour from the page's opening pose and check each boarding lands while the doors are open.
  let t = start();
  const events = [...TOUR];
  let next = 0;
  for (let time = 0; time <= 74; time += 0.01) {
    while (next < events.length && events[next].at <= time + 1e-9) {
      if (events[next].board) assert.equal(t.doorState, "open", `tour board at ${events[next].at}`);
      t = tourEvent(t, events[next++]);
    }
    t = step(t, 0.01);
  }
  assert.equal(t.persons, 0);
  // The tour ends parked where it starts, so it loops seamlessly.
  assert.equal(t.floor, START_FLOOR);
  assert.ok(Math.abs(t.pos - floorPos(START_FLOOR)) < EPS);
  assert.equal(t.motion, null);
});

test("6. opening pose: car parked level at L3, doors open, readout and status agree", () => {
  const s = start();
  assert.equal(START_FLOOR, 3);
  assert.equal(s.floor, 3);
  assert.equal(s.doorState, "open");
  assert.equal(s.door, 1);
  const d = derived(s);
  assert.ok(Math.abs(d.carPos - 5.6) < EPS);
  assert.ok(Math.abs(d.cwtPos - 5.6) < EPS);
  assert.equal(d.atFloor, true);
  assert.equal(readout(d), "L3 ▲ 0.00 m/s · rope 0.00 m/s · 0 rpm");
  assert.match(status(d), /^Car 5\.60 m above L1 · counterweight 5\.60 m · load 0 % \(0 kg\) · doors open/);
  // Left alone, the doors dwell their real time, then close, and the car stays level.
  let t = s;
  for (let i = 0; i < 700; i++) t = step(t, 0.01);
  assert.equal(t.doorState, "closed");
  assert.equal(t.door, 0);
  assert.ok(Math.abs(t.pos - floorPos(3)) < EPS);
});

test("7. full runs from the opening pose: up to L4 and down to L1 level exactly, doors open then close", () => {
  for (const [to, dir] of [[4, 1], [1, -1]]) {
    let s = call(start(), to, "car");
    const seen = [];
    let arrivedAt = null;
    for (let i = 0; i < 3000; i++) {
      s = step(s, 0.01);
      if (seen[seen.length - 1] !== s.doorState) seen.push(s.doorState);
      if (s.motion) assert.equal(Math.sign(s.v) || dir, dir);
      if (arrivedAt === null && !s.motion && s.floor === to) {
        arrivedAt = s.t;
        assert.ok(Math.abs(s.pos - floorPos(to)) < EPS, `levels at ${s.pos}`);
        const d = derived(s);
        assert.equal(d.atFloor, true);
        assert.equal(d.speed, 0);
        assert.ok(readout(d).startsWith(`L${to} `));
      }
    }
    assert.ok(arrivedAt !== null, `reached L${to}`);
    assert.deepEqual(seen, ["open", "closing", "closed", "opening", "open", "closing", "closed"]);
    assert.equal(s.floor, to);
  }
});
