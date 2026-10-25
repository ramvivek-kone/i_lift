// Builds the MRL traction elevator figure: node build.mjs [--light] [--audit] [--open]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.kiro/skills/anatomy/kit/iso-kit.mjs";
import * as A from "../../.kiro/skills/anatomy/kit/audit.mjs";
import { kitScript } from "../../.kiro/skills/anatomy/scripts/inline-kit.mjs";
import * as L from "./layout.mjs";
import { SPEC, TRAVEL, CWT_MASS, initial, start, derived, readout, status } from "./model.mjs";
import { makeHelpers } from "./lib/helpers.mjs";
import { INFO } from "./info.mjs";
import * as shaft from "./parts/shaft.mjs";
import * as rails from "./parts/rails.mjs";
import * as machine from "./parts/machine.mjs";
import * as ropes from "./parts/ropes.mjs";
import * as car from "./parts/car.mjs";
import * as cwt from "./parts/cwt.mjs";
import * as landings from "./parts/landings.mjs";
import * as controller from "./parts/controller.mjs";
import * as safety from "./parts/safety.mjs";
import * as pit from "./parts/pit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const THEME = argv.includes("--light") ? "light" : "dark";
// --open: the doors-open pose (car at rest at L1, car and L1 landing doors open), drawn and recorded.
const OPEN = argv.includes("--open");

const { P, V, W, H: HEIGHT, KS } = L;
const R = A.recorder(P, { order: ["travel"], spring: {} });
const H = makeHelpers(R, P);
const pose = { open: OPEN };

shaft.build(H, L, pose);
rails.build(H, L, pose);
machine.build(H, L, pose);
ropes.build(H, L, pose);
car.build(H, L, pose);
cwt.build(H, L, pose);
landings.build(H, L, pose);
controller.build(H, L, pose);
safety.build(H, L, pose);
pit.build(H, L, pose);

// The doors-open pose is a standing pose: the controller never moves the car with its doors open (proved in
// model.test.mjs), so --open settles and audits the car at rest at L1 only.
const TRAVEL_STATES = OPEN ? [0] : A.uniformStates(56);
A.settle(R, P, { states: TRAVEL_STATES });
R.items.sort((a, b) => a.key - b.key);

const f1 = (v) => (Math.abs(v) < 0.05 ? "0" : v.toFixed(1));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const groups = R.items.map((item) => {
  const [mx, my, mz] = item.move;
  const ride = item.ride === "travel" ? ` data-ride="travel"` : "";
  return `<g class="it" data-name="${esc(item.name)}" data-group="${esc(item.group ?? item.piece)}" data-k="${item.key.toFixed(3)}" data-m="${f1(mx)},${f1(my)},${f1(mz)}"${ride}>${item.svg}</g>`;
});

const slab = L.PIT_SLAB;
const back = [`<path class="iso-halo" d="${k.haloOf(slab.plan, slab.z, slab.h, P)}"/>`];

const LABEL_TEXT =
  `A machine-room-less traction elevator in a ${SPEC.floors}-landing concrete hoistway, its two near walls cut away. A gearless motor and traction sheave sit on the rail tops at the overhead; ` +
  `${SPEC.roping}:1 ropes run from a wall hitch under the car's two pulleys, over the sheave, down round the counterweight pulley and up to a hitch on the counterweight rail. ` +
  `The car rides on roller guides with progressive safety gear, an overspeed governor and its rope run beside it, five landing entrances carry hall buttons and floor indicators, ` +
  `an open control panel stands beside the top landing, and the pit holds the buffers, a ladder and the travelling cable's loop. The car and counterweight travel the same distance in opposite directions.`;
const svg = k.figureSvg({ width: W, height: HEIGHT, label: LABEL_TEXT, body: [...back, `<g class="mrl-layer">${groups.join("")}</g>`] });

const rest = derived(start());
const atRated = derived({ ...initial(1), v: SPEC.ratedSpeed });
const RATED_RPM = atRated.sheaveRpm;
const RATED_HZ = atRated.inverterHz;
const caption =
  `A ${SPEC.ratedLoad} kg (${SPEC.persons}-person) machine-room-less elevator at ${SPEC.ratedSpeed.toFixed(1)} m/s serving ${SPEC.floors} landings ${SPEC.floorHeight.toFixed(1)} m apart ` +
  `(${TRAVEL.toFixed(1)} m of travel), with a ${SPEC.pit.toFixed(1)} m pit and ${SPEC.overhead.toFixed(1)} m of overhead. The car and its ${CWT_MASS} kg counterweight (the car plus ` +
  `${Math.round(SPEC.balance * 100)} % of the load) both hang ${SPEC.roping}:1 from ${SPEC.ropes} × Ø${(SPEC.ropeD * 1000).toFixed(0)} mm ropes, so the ropes run over the ` +
  `Ø${(SPEC.sheaveD * 1000).toFixed(0)} mm sheave (D/d ${Math.round(SPEC.sheaveD / SPEC.ropeD)}) at twice car speed: ${Math.round(RATED_RPM)} rpm and ${RATED_HZ.toFixed(1)} Hz at rated speed; the ropes are drawn wider to read. ` +
  `Progressive safety gear, a governor that trips at ${(SPEC.govTrip * SPEC.ratedSpeed).toFixed(2)} m/s and polyurethane buffers guard the car; at this rise no compensation chain is needed. ` +
  `The inverter, brake release and rescue battery live in the panel at the top landing. Every run follows a jerk-limited S-curve (${SPEC.accel} m/s², ${SPEC.jerk} m/s³).`;

const stage =
  `<div class="iso-stage mrl-stage" tabindex="0" role="group" aria-label="MRL traction elevator. Press 1 to 5 to send the car to a landing, the up and down arrows to move one landing, O to reopen the doors, plus or minus to board or alight while the doors are open, Escape to stop the tour.">${svg}` +
  `<span class="mrl-sr" role="status" aria-live="polite" data-live></span></div>` +
  `<p class="mrl-info" aria-live="off" data-info>${esc(status(rest))}</p>`;

// Numbered parts buttons under the card: each highlights one or more drawing groups and explains the first.
const PARTS = [
  ["machine", "brake"], ["sheave"], ["ropes"], ["hitches"], ["cab", "cartop"], ["sling", "guides"], ["safety"],
  ["doors"], ["cwt"], ["landings", "hall", "indicators"], ["controller"], ["governor", "limits", "tape"], ["cable"], ["pit", "buffers", "ladder"],
];
const PART_NAMES = { cab: "Car", pit: "Pit" };
const PARTS_HTML = PARTS.map((groups, index) => {
  const label = PART_NAMES[groups[0]] ?? INFO[groups[0]].name;
  return `<button type="button" class="mrl-part" data-groups="${groups.join(" ")}"><span class="mrl-num">${String(index + 1).padStart(2, "0")}</span>${esc(label)}</button>`;
}).join("");

const plate = k.plateHtml({
  fig: "Fig 1",
  title: "Anatomy of an MRL traction elevator",
  hint: "1–5 or a call button · hover a part",
  readout: readout(rest),
  keys: [
    { mark: "lit", label: "Traction sheave: the ropes cross it at twice car speed" },
    { mark: "raised", label: "The car, the subject" },
    { mark: "edge", label: `The ${SPEC.roping}:1 suspension ropes` },
  ],
  caption,
  body: stage,
}).replace(`<figcaption class="iso-legend">`, `<figcaption class="iso-legend"><span class="mrl-parts">${PARTS_HTML}</span>`);

const axis = (v) => k.axisVector(P, v);
const DATA = { P, V, EX: axis([1, 0, 0]), EY: axis([0, 1, 0]), EZ: axis([0, 0, 1]), TRAVEL_CM: L.TRAVEL_CM, travel: TRAVEL, floors: SPEC.floors, doorSlide: L.DOOR.slide, INFO };

const CSS = readFileSync(join(HERE, "mrl.css"), "utf8");
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const modelScript = `const M = (() => {\n${modelSource}\nreturn { SPEC, TRAVEL, floorPos, plan, sample, doorAt, derived, readout, status, initial, start, START_FLOOR, call, step, board, TOUR, TOUR_LENGTH, tourEvent };\n})();\n`;
const LIVE = `(() => {\n${readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA))}\n})();\n`;

const body = `<style>${CSS}</style><div class="mrl">${plate}</div>`;
const page = k.pageHtml({ title: "Anatomy of an MRL traction elevator", theme: THEME, body, script: kitScript() + modelScript + LIVE, width: 650 });
const name = THEME === "light" ? "mrl-elevator-light.html" : "mrl-elevator.html";
writeFileSync(join(HERE, name), page);
console.log(`wrote ${name} ${(page.length / 1024).toFixed(0)} KB · ${R.items.length} items · ${R.solids.length} solids · scale ${KS.toFixed(3)}`);

// Pairs inspected at 8x and judged clear: the four ropes of one run lie side by side by design, so each
// rope's end at its pulley tangent sits beside its neighbours' runs.
const CROWD_OK = [["ropes.wrapC*", "ropes.B*"], ["ropes.wrapT*", "ropes.cwt*"]];
A.auditOrExit(R, P, { frames: OPEN ? [] : A.uniformStates(112), apart: !OPEN, crowd: CROWD_OK });
