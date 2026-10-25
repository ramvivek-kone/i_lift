// Page behaviour: the model's full-collective controller drives the car, the counterweight, the coupled car
// and landing doors, the displays and the lit calls; the drawing is re-sorted every frame by key + lift × share.
// Hall and COP buttons are clickable, the stage takes keys, the parts buttons and hover explain each part, and
// an idle tour plays model.TOUR. The kit (holdStill) and the model (M) are inlined before this script.
const D = __DATA__;
const root = document.querySelector(".mrl");
const stage = root.querySelector(".mrl-stage");
const layer = stage.querySelector(".mrl-layer");
const readoutEl = root.querySelector("[data-readout]");
const infoEl = root.querySelector("[data-info]");
const liveEl = root.querySelector("[data-live]");
const partButtons = [...root.querySelectorAll(".mrl-part")];
const still = matchMedia("(prefers-reduced-motion: reduce)");

const nodes = [...layer.querySelectorAll(".it")].map((el) => {
  const m = el.dataset.m.split(",").map(Number);
  return {
    el,
    key: Number(el.dataset.k),
    m,
    lift: m[0] * D.V[0] + m[1] * D.V[1] + m[2] * D.V[2],
    rides: el.dataset.ride === "travel",
    hold: Boolean(el.querySelector("[data-hold]")),
    shown: "",
  };
});
const moving = nodes.filter((node) => node.rides);
let order = nodes.map((_, index) => index);
// The travelling cable's car leg: its clip (data-half) stays on the loop, which moves at half the car's offset.
const halves = moving.filter((node) => node.el.querySelector("[data-half]")).map((node) => ({ node, paths: [...node.el.querySelectorAll("[data-half]")] }));

// Rotating face marks (sheaves, pulleys, governor). The sign per sheave makes each rim move with its rope.
const SPIN = { T: (d) => -d.sheaveAngle, Snear: (d) => d.carPulleyAngle, Sfar: (d) => d.carPulleyAngle, C: (d) => d.cwtPulleyAngle, gov: (d) => d.govAngle };
const spinners = [...layer.querySelectorAll("[data-rot]")].map((el) => ({ el, of: SPIN[el.dataset.rot], shown: "" })).filter((s) => s.of);
const hzEls = [...root.querySelectorAll("[data-hz]")];
const piEls = [...root.querySelectorAll("[data-pi]")];
const copEls = [...root.querySelectorAll("[data-car-display]")];
// Door slide groups: car-l / car-r ride with the car, L{f}-l / L{f}-r stay at their landing. Left panels go -y.
const doorEls = [...layer.querySelectorAll("[data-door]")].map((el) => {
  const [where, side] = el.dataset.door.split("-");
  return { el, floor: where === "car" ? 0 : Number(where.slice(1)), dy: side === "l" ? -1 : 1, shown: "" };
});
const hallEls = [...layer.querySelectorAll("[data-call]")].map((el) => ({ el, floor: Number(el.dataset.call), kind: el.dataset.dir }));
const copCallEls = [...layer.querySelectorAll("[data-car-call]")].map((el) => ({ el, floor: Number(el.dataset.carCall), kind: "car" }));

let state = M.start();
let frame = 0;
let last = 0;
let visible = false;
let lastPhase = "";
let speak = false; // the live region stays empty until the reader focuses or uses the figure
let selected = null;

// Idle tour state.
let tourOn = false;
let tourPaused = false;
let tourT = 0;
let tourAt = 0;
let tourStarted = false;
let resumeTimer = 0;
let hovering = false;

function say(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}
function flag(el, name, on) {
  if (on) {
    if (!el.hasAttribute(name)) el.setAttribute(name, "");
  } else if (el.hasAttribute(name)) el.removeAttribute(name);
}

function place(share) {
  for (const node of moving) {
    const tx = (D.EX[0] * node.m[0] + D.EY[0] * node.m[1] + D.EZ[0] * node.m[2]) * share;
    const ty = (D.EX[1] * node.m[0] + D.EY[1] * node.m[1] + D.EZ[1] * node.m[2]) * share;
    const text = share === 0 ? "" : `translate(${tx.toFixed(2)} ${ty.toFixed(2)})`;
    if (text !== node.shown) {
      node.shown = text;
      if (text) node.el.setAttribute("transform", text);
      else node.el.removeAttribute("transform");
      if (node.hold) holdStill(node.el, share === 0 ? [0, 0] : [Number(tx.toFixed(2)), Number(ty.toFixed(2))]);
      node.tx = tx;
      node.ty = ty;
    }
  }
  for (const { node, paths } of halves) {
    const text = share === 0 ? "" : `translate(${(-(node.tx ?? 0) / 2).toFixed(2)} ${(-(node.ty ?? 0) / 2).toFixed(2)})`;
    for (const path of paths) {
      if (text) path.setAttribute("transform", text);
      else path.removeAttribute("transform");
    }
  }
  const keyOf = (index) => nodes[index].key + (nodes[index].rides ? nodes[index].lift * share : 0);
  const next = nodes.map((_, index) => index).sort((a, b) => keyOf(a) - keyOf(b));
  if (next.some((index, at) => index !== order[at])) {
    const fragment = document.createDocumentFragment();
    for (const index of next) fragment.appendChild(nodes[index].el);
    layer.appendChild(fragment);
    order = next;
  }
}

function spin(d) {
  for (const s of spinners) {
    const deg = ((s.of(d) * 180) / Math.PI) % 360;
    const text = Math.abs(deg) < 0.005 ? "" : `rotate(${deg.toFixed(2)})`;
    if (text === s.shown) continue;
    s.shown = text;
    if (text) s.el.setAttribute("transform", text);
    else s.el.removeAttribute("transform");
  }
}

// The car doors and the landing doors at the car's floor move together (the vane couples them).
function doors(d) {
  for (const door of doorEls) {
    const frac = door.floor === 0 || door.floor === state.floor ? d.door : 0;
    const s = door.dy * D.doorSlide * frac;
    const text = Math.abs(s) < 0.01 ? "" : `translate(${(D.EY[0] * s).toFixed(2)} ${(D.EY[1] * s).toFixed(2)})`;
    if (text === door.shown) continue;
    door.shown = text;
    if (text) door.el.setAttribute("transform", text);
    else door.el.removeAttribute("transform");
  }
}

function displays(d) {
  const arrow = d.travelDir > 0 ? " ▲" : d.travelDir < 0 ? " ▼" : "";
  for (const el of hzEls) say(el, `${d.inverterHz.toFixed(1).padStart(4, "0")} Hz`);
  for (const el of piEls) say(el, `${d.floor}${arrow || " ·"}`);
  for (const el of copEls) say(el, `${d.floor}`);
  for (const b of hallEls) flag(b.el, "data-lit", state.calls[b.kind].includes(b.floor));
  for (const b of copCallEls) flag(b.el, "data-lit", state.calls.car.includes(b.floor) || (state.target === b.floor && state.motion !== null));
}

function announce(d) {
  const phase = state.motion ? `departing L${state.floor} for L${state.target}` : d.doorState === "opening" ? `arriving L${d.floor}, doors opening` : d.doorState === "closing" ? `L${d.floor}, doors closing` : "";
  if (phase && phase !== lastPhase && speak) say(liveEl, phase);
  if (phase !== lastPhase && !state.motion && d.doorState === "opening") stage.setAttribute("aria-description", `Car at landing ${d.floor}, ${d.persons} on board`);
  lastPhase = phase;
}

function infoLine(d) {
  if (selected && D.INFO[selected]) {
    const html = `<strong>${D.INFO[selected].name}</strong> · ${D.INFO[selected].text}`;
    if (infoEl.innerHTML !== html) infoEl.innerHTML = html;
  } else say(infoEl, M.status(d));
}

function draw() {
  const d = M.derived(state);
  place(Math.min(1, Math.max(0, d.carPos / D.travel)));
  spin(d);
  doors(d);
  displays(d);
  say(readoutEl, M.readout(d));
  infoLine(d);
  announce(d);
}

const idle = () => !state.motion && state.doorState === "closed" && !state.calls.car.length && !state.calls.up.length && !state.calls.down.length;
const touring = () => tourOn && !tourPaused;

// Reduced motion: runs and door strokes complete at once; the dwell still lasts its real time.
function skipAhead() {
  for (let guard = 0; guard < 8; guard++) {
    if (state.motion) state = M.step(state, state.motion.plan.total - state.motion.t + 1e-6);
    else if (state.doorState === "opening") state = M.step(state, M.SPEC.door.open - state.doorT + 1e-6);
    else if (state.doorState === "closing") state = M.step(state, M.SPEC.door.close - state.doorT + 1e-6);
    else break;
  }
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring()) {
    tourT += dt;
    while (tourAt < M.TOUR.length && M.TOUR[tourAt].at <= tourT) state = M.tourEvent(state, M.TOUR[tourAt++]);
    if (tourT >= M.TOUR_LENGTH) {
      tourT = 0;
      tourAt = 0;
    }
  }
  if (still.matches) {
    skipAhead();
    state = M.step(state, dt);
    skipAhead();
  } else state = M.step(state, dt);
  draw();
  frame = visible && (!idle() || touring()) ? requestAnimationFrame(tick) : 0;
}

function run() {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}

// ---- Tour: starts 1.4 s after the figure first comes into view, pauses on any input, resumes 3.6 s later.
function startTour() {
  if (still.matches) return;
  tourOn = true;
  tourPaused = false;
  tourT = 0;
  tourAt = 0;
  run();
}
function tryResume() {
  resumeTimer = 0;
  if (!tourOn) return;
  if (hovering || !idle()) {
    resumeTimer = setTimeout(tryResume, 1000);
    return;
  }
  startTour();
}
function touched() {
  speak = true;
  if (tourOn) tourPaused = true;
  if (resumeTimer) clearTimeout(resumeTimer);
  resumeTimer = tourOn ? setTimeout(tryResume, 3600) : 0;
}

// ---- Input -------------------------------------------------------------------------------------
function act(next) {
  state = next;
  run();
  if (!frame) draw();
}

function select(group) {
  if (group === selected) return;
  selected = group;
  for (const node of nodes) flag(node.el, "data-on", group !== null && node.el.dataset.group === group);
  flag(stage, "data-focus", group !== null);
  for (const b of partButtons) flag(b, "data-on", group !== null && b.dataset.groups.split(" ").includes(group));
  infoLine(M.derived(state));
}
function selectMany(groups) {
  selected = groups[0];
  for (const node of nodes) flag(node.el, "data-on", groups.includes(node.el.dataset.group));
  flag(stage, "data-focus", true);
  for (const b of partButtons) flag(b, "data-on", b.dataset.groups === groups.join(" "));
  infoLine(M.derived(state));
}

stage.addEventListener("click", (event) => {
  const target = event.target.closest("[data-call], [data-car-call], [data-door-open], [data-door-close], [data-alarm]");
  if (!target) return;
  touched();
  if (target.dataset.call) act(M.call(state, Number(target.dataset.call), target.dataset.dir));
  else if (target.dataset.carCall) act(M.call(state, Number(target.dataset.carCall), "car"));
  else if (target.hasAttribute("data-door-open")) act(M.call(state, state.floor, "car"));
  else if (target.hasAttribute("data-door-close")) {
    if (state.doorState === "open") act({ ...state, doorT: M.SPEC.door.dwell });
  } else if (target.hasAttribute("data-alarm")) say(liveEl, "Alarm pressed: the car calls the service centre");
});
stage.addEventListener("pointerdown", touched);
stage.addEventListener("pointerover", (event) => {
  const it = event.target.closest(".it");
  if (it && it.dataset.group) select(it.dataset.group);
});
stage.addEventListener("pointerenter", () => {
  hovering = true;
  touched();
});
stage.addEventListener("pointerleave", () => {
  hovering = false;
  select(null);
});
stage.addEventListener("focus", touched);

stage.addEventListener("keydown", (event) => {
  const key = event.key;
  let handled = true;
  if (/^[1-9]$/.test(key) && Number(key) <= D.floors) act(M.call(state, Number(key), "car"));
  else if (key === "ArrowUp" || key === "ArrowDown") {
    const base = state.target ?? state.floor;
    const to = base + (key === "ArrowUp" ? 1 : -1);
    if (to >= 1 && to <= D.floors) act(M.call(state, to, "car"));
  } else if (key === "o" || key === "O") act(M.call(state, state.floor, "car"));
  else if (key === "+" || key === "=") act(M.board(state, 1));
  else if (key === "-" || key === "_") act(M.board(state, -1));
  else if (key === "Escape") {
    tourOn = false;
    tourPaused = false;
    if (resumeTimer) clearTimeout(resumeTimer);
    resumeTimer = 0;
    select(null);
  } else handled = false;
  if (!handled) return;
  event.preventDefault();
  if (key !== "Escape") touched();
  else speak = true;
});

for (const button of partButtons) {
  const groups = button.dataset.groups.split(" ");
  const show = () => {
    touched();
    selectMany(groups);
  };
  const hide = () => {
    if (partButtons.some((other) => other !== button && other.matches(":hover, :focus-visible"))) return;
    select(null);
  };
  button.addEventListener("pointerenter", show);
  button.addEventListener("focus", show);
  button.addEventListener("click", show);
  button.addEventListener("pointerleave", hide);
  button.addEventListener("blur", hide);
}

new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) {
      if (!tourStarted) {
        tourStarted = true;
        setTimeout(() => {
          if (!tourPaused && idle()) startTour();
          else if (!still.matches) {
            tourOn = true;
            tourPaused = true;
            if (!resumeTimer) resumeTimer = setTimeout(tryResume, 3600);
          }
        }, 1400);
      }
      run();
    } else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  },
  { rootMargin: "120px 0px" },
).observe(stage);

draw();
