# Anatomy of an MRL traction elevator

Interactive isometric figure of a modern machine-room-less traction elevator, built with the
[Anatomy skill](https://github.com/wheresryan22/anatomy) (installed at `~/.kiro/skills/anatomy`).

A 630 kg, 1.0 m/s, 5-landing hoistway with the two near walls cut away: gearless PMSM machine
with dual brake and traction sheave in the overhead, 2:1 belts with car and counterweight
diverter sheaves, car sling with safety gear and roller guides, counterweight, T-rails on
brackets, overspeed governor with pit tension pulley, travelling cable, landing doors and hall
stations, landing control panel (controller/inverter, rescue operation), limit switches,
positioning tape, buffers and pit equipment. 620 solids, 868 drawn items.

## Open

- Light theme: `mrl-elevator-light.html`
- Dark theme: `mrl-elevator.html`

Both are standalone pages; open them in Chrome or Edge.

## Controls

- `1`–`5` or a hall/car call button: send the car to that landing (S-curve run, levelling, doors open/close).
- Hover or Tab-focus a part to see its name and what it does.
- Readout: floor, direction, car speed, rope speed (2× car speed for 2:1 roping), sheave rpm,
  counterweight position, load and door state. Every number comes from `model.mjs`.
- Respects `prefers-reduced-motion`.

## Rebuild

```powershell
node build.mjs --light        # light page
node build.mjs                # dark page
node build.mjs --light --audit   # skill's depth/painter's-order audit (~2.5 min)
node --test model.test.mjs    # motion/controller model tests
```

Screenshots (skill's `capture.mjs`, Chrome):

```powershell
$env:CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
node $env:USERPROFILE\.kiro\skills\anatomy\scripts\capture.mjs mrl-elevator-light.html --out shots\final-light.png
```

## Verification

- Model tests: 7/7 pass (one-floor run 5.07 s, L1→L5 13.47 s; 119.4 rpm sheave at rated speed).
- Both themes build; audit passed (620 solids, 868 items, 0 crowding pairs); line-end checks 0 in both themes.
- Light captures with a floor call: console clean, no sideways scroll.

## Not verified (speed mode)

- No independent design review pass was run.
- Skipped: slowed motion sheet, dark-theme close-ups, 4× detail pass.
- With the car parked at L1 it sits low in the shaft and is partly hidden behind the slab edge;
  call a higher floor to see the car and sling clearly.
