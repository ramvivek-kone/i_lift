// Part groups: id -> { name, text }, every sentence built from SPEC so it cannot disagree with the model.
import { SPEC, TRAVEL, CWT_MASS } from "./model.mjs";

const m = (v) => `${v.toFixed(1)} m`;
const mm = (v) => `${Math.round(v * 1000)}`;
const rated = SPEC.ratedSpeed;
const sheaveRpm = ((SPEC.roping * rated) / (Math.PI * SPEC.sheaveD)) * 60;
const pulleyRpm = (rated / (Math.PI * SPEC.carPulleyD)) * 60;
const hz = ((SPEC.poles / 2) * sheaveRpm) / 60;
const govRpm = (rated / (Math.PI * SPEC.govD)) * 60;
const trip = SPEC.govTrip * rated;
const n = (v, d = 0) => v.toFixed(d);

export const INFO = {
  shaft: { name: "Hoistway", text: `${SPEC.floors} landings ${m(SPEC.floorHeight)} apart, ${m(SPEC.pit)} pit, ${m(SPEC.overhead)} overhead; the two near walls are cut away.` },
  rails: { name: "Guide rails", text: "T89 car rails and T50 counterweight rails in 5 m lengths, fishplated, held at every floor by wall brackets, beam clips and slab brackets." },
  machine: { name: "Traction machine", text: `A gearless permanent-magnet motor with ${SPEC.poles} poles on a bedplate across the rail tops: at ${n(rated, 2)} m/s it turns at ${n(sheaveRpm)} rpm, fed at ${n(hz, 1)} Hz.` },
  brake: { name: "Machine brake", text: "Two independent brake units grip one disc on the motor shaft; either one alone holds the car with rated load." },
  sheave: { name: "Traction sheave", text: `Ø${mm(SPEC.sheaveD)} mm with ${SPEC.ropes} grooves; with ${SPEC.roping}:1 roping its rim runs at twice car speed, ${n(SPEC.roping * rated, 2)} m/s at rated speed.` },
  ropes: { name: `${SPEC.roping}:1 suspension ropes`, text: `${SPEC.ropes} × Ø${mm(SPEC.ropeD)} mm steel ropes from hitch to hitch, under the car and over the counterweight pulley; each run's length changes as the car moves.` },
  hitches: { name: "Rope hitches", text: "Both rope ends are fixed: one on wall y0 over the far car pulley, one on a plate on top of counterweight rail 2, each rope in a wedge socket on a sprung rod; a load cell weighs the car side." },
  car: { name: "Car", text: `${SPEC.ratedLoad} kg or ${SPEC.persons} persons at ${n(rated, 1)} m/s over ${m(TRAVEL)} of travel.` },
  sling: { name: "Car sling and pulleys", text: `Plank, uprights and crosshead carry the cab; two Ø${mm(SPEC.carPulleyD)} mm pulleys set diagonally under it turn at ${n(pulleyRpm, 1)} rpm at rated speed.` },
  guides: { name: "Roller guides", text: "Four roller guides, each with two face rollers and a tip roller, keep the car on its T89 rails." },
  safety: { name: "Safety gear", text: `Two progressive safety gears, linked by a synchronising rod, wedge the car to its rails when the governor trips at ${n(trip, 2)} m/s.` },
  cab: { name: "Cab", text: `1.40 × 1.10 m inside, 2.25 m high, with the car operating panel on the far wall; the near side panel is cut away.` },
  doors: { name: "Car doors", text: `Centre-opening, ${n(SPEC.door.clear * 100)} cm clear, opening in ${n(SPEC.door.open, 1)} s and closing in ${n(SPEC.door.close, 1)} s; the coupler vane drives the landing doors.` },
  cartop: { name: "Car top", text: "Door operator, inspection station, junction box and balustrade, with the positioning reader head on its corner." },
  cwt: { name: "Counterweight", text: `${CWT_MASS} kg: the car plus ${Math.round(SPEC.balance * 100)} % of the rated load; it travels as far as the car, the other way, on its own ${SPEC.roping}:1 pulley.` },
  landings: { name: "Landing entrances", text: `${SPEC.floors} centre-opening landing doors on hanger tracks, each locked by an interlock until the car is level and its vane couples them.` },
  hall: { name: "Hall stations", text: "Up and down call buttons on each landing jamb: L1 has only up, L5 only down." },
  indicators: { name: "Position indicators", text: "Each landing shows the car's floor and direction above its door." },
  controller: { name: "Landing control panel", text: `Beside the L5 door: the VVVF inverter (${n(hz, 1)} Hz at rated speed), contactors, main switch, manual brake release and the battery for automatic rescue.` },
  governor: { name: "Overspeed governor", text: `Ø${mm(SPEC.govD)} mm, driven by a rope clamped to the car: ${n(govRpm, 1)} rpm at ${n(rated, 2)} m/s; at ${n(trip, 2)} m/s it trips and pulls the safety gear.` },
  limits: { name: "Final limit switches", text: "Two switches on the y1 car rail, above the top landing and below the bottom one, cut the power if the car's cam over-travels." },
  tape: { name: "Positioning tape", text: "A steel tape from the overhead to the pit, read by a head on the car roof, gives the car's absolute position and the door zones." },
  buffers: { name: "Buffers", text: `Polyurethane buffers under the car and the counterweight, allowed at ${n(rated, 1)} m/s.` },
  ladder: { name: "Pit ladder", text: `A fixed ladder down into the ${m(SPEC.pit)} pit, beside the pit stop switch.` },
  cable: { name: "Travelling cable", text: `Hangs from the shaft wall halfway up and from the car; its loop rises at half car speed, ${n(rated / 2, 2)} m/s at rated speed.` },
  pit: { name: "Pit", text: "The stop switch by the ladder top keeps the car from moving while anyone is in the pit." },
};
