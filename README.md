# 3D Periodic Table

An interactive periodic table in the browser, built with Next.js and React
Three Fiber. From above it looks like the ordinary flat table. Tilt it and
the lanthanides and actinides turn out to hang as pillars beneath their
marker cells, part of the table rather than two detached rows. Click any
element and its isotopes pop out toward you as cubes. Click an isotope to
see a model of the atom, with its proton, neutron and electron counts, its
natural abundance, and whether it is stable.

## About

While studying **Grade X Science**, the author, **Manish Majhi**, came
across a limitation of the modern periodic table is that the
f-block elements (the lanthanides and actinides) don't actually fit in
its main body, and are instead pulled out into two detached rows floating
below it. The table that every student memorizes isn't, strictly, complete
in two dimensions.

That footnote stuck with Manish. The periodic table has been revised
before: Henry Moseley refined Mendeleev's original ordering by arranging
elements by atomic number instead of atomic weight, resolving several
inconsistencies Mendeleev's version couldn't. In that same spirit — taking
a real, named limitation of the current table and designing around it
rather than around it — Manish built this project to fit the f-block
elements into the main body itself, by using the third dimension: the
lanthanides and actinides hang as pillars beneath their marker cell,
reachable from the flat 2D layout everyone already recognizes, rather than
being relegated to a separate strip underneath it.

## Running it

Needs Node.js 18.17 or later.

```sh
npm install
npm run dev        # http://localhost:3000
```

For a production build, `npm run build` and then `npm start`.

## Using it

- **Drag** to orbit, **scroll** to zoom. Drag the view upward to tilt it:
  the pillars fade in once the table is tilted far enough.
- **Click** an element to pop out its isotopes, then click an isotope to see
  its atom. **Escape** or the Back button steps back one level.
- **Keyboard:** Tab into the table, arrow keys to move between elements (up
  and down land on the nearest group in the next period), Home and End for
  the ends of a period, Enter to open. The lanthanides and actinides are
  listed after the main table, so the keyboard reaches them without tilting.
  A screen reader hears each element and isotope announced.
- **Links:** the address bar follows what you open, so it can be shared.
  `/element/Fe` opens iron's isotopes; `/element/Fe/isotope/56` opens the
  iron-56 atom. The symbol is not case-sensitive.

## Tests

```sh
npm test                 # 73 tests, under a second, no browser
npm run test:browser     # builds the app and runs 20 checks in headless Chrome
npm run test:original    # the same 20 against the commit before the 2026-10-01 fixes
```

`npm test` uses Node's built-in runner and covers the parts that decide
things: where every element sits on the floor and in the pillars, the
spacing between them, the keyboard movement through the grid, how the
isotope cubes are arranged, the camera's limits, which isotopes each element
shows and what they say, how an abundance is written, what a click can
land on, and that closing a view frees its GPU memory.

The browser suite needs Chrome. It prints `SKIP` without one, which is why it
is separate. It serves a production build and uses it the way a person would:
real mouse clicks computed from where each element is drawn, real key
presses, deep links. It then reads the answer from the page, and counts
WebGL textures and buffers to check nothing leaks. `test:original` builds the
earlier code in a temporary git worktree and requires every check named
`regression:` to fail there. Work files go in `.cache/`, which must be on the
same drive as the project.

## Where the data comes from

Everything an element's panel states is generated, not typed:

| Fact | Source |
| --- | --- |
| Which isotopes occur naturally, and how abundant they are | NIST, *Atomic Weights and Isotopic Compositions for All Elements* |
| Whether a naturally occurring isotope is stable | Majority of IAEA LiveChart, NUBASE2020 and Wikipedia's *List of nuclides*: radioactive only if two of the three report a measured decay |
| The longest-lived isotope of an element with no natural ones | Majority of IAEA LiveChart, NUBASE2020 and PubChem |

`node tools/gen-isotope-data.mjs` fetches the sources (cached in
`tools/.cache/`) and writes `src/data/isotopeData.js`; `--check` reports
whether the committed file is current. The script explains each rule.
"Naturally occurring" is not the same as "stable": uranium-238,
potassium-40 and 32 others occur in nature and are radioactive, and the app
says so. Three isotopes are counted radioactive by only one source (Kr-78,
Xe-124, Ba-130). They are shown as stable, and the generator prints them
each time it runs.

Hydrogen's three isotopes and a few notable radioactive ones (carbon-14,
cobalt-60, iodine-131, technetium-99, uranium-235 and -238, plutonium-239)
have hand-written descriptions in `src/data/isotopes.js`.

Two things are simplified on purpose. The atom model fills electron shells
2, 8, 18, 32 in order, which is right up to argon and not beyond it. The
nucleus is drawn with at most 50 spheres, in the right proportion of
protons to neutrons. A few category assignments at the
metal/metalloid boundary (polonium, astatine) are conventions that sources
disagree on.

NIST data is a work of the US government and in the public domain.
NUBASE2020 is F.G. Kondev et al., *Chinese Physics C* 45, 030001 (2021).
The IAEA LiveChart of Nuclides is at nds.iaea.org/relnsd. Only facts —
stable or not, a mass number — are taken from Wikipedia and PubChem.

## How it works

- **Two canvases.** The table renders in one WebGL canvas, the popped
  isotopes and the atom in a second one above it, and a CSS
  `backdrop-filter` layer between them blurs the table behind whatever is
  open. Both cameras read one shared camera store every frame
  (`src/store/cameraStore.js`), so they never drift apart.
- **One hit layer.** Neither canvas handles pointer events. A transparent div
  (`src/components/HitLayer.jsx`) turns drags into camera moves and clicks
  into raycasts against the registered tiles or isotope cubes, ignoring
  anything hidden and ignoring the drawn outlines.
- **Imperative animation, React read-model.** GSAP moves the three.js objects
  directly (`src/components/scene/PoppedCuboid.jsx`, driven through
  `src/three/popController.js`); `src/store/appStore.js` only reflects the
  state (`overview`, `moving`, `popped`, `detail`) for the HUD, the Back
  button and the detail panel.
- **Addresses without navigation.** The URL is updated with
  `history.replaceState` (`src/three/urlSync.js`), not Next's router,
  because a real route change would remount both WebGL canvases.
  `/element/...` routes exist only for the first load; `src/hooks/useDeepLink.js`
  then opens the element as a click would.
- **Accessibility layer.** `src/components/ui/AccessibleOverlay.jsx` renders
  the whole table as visually hidden buttons in a keyboard grid
  (`src/data/gridNav.js`), with a live region for announcements; keyboard
  focus reuses the hover highlight on the real 3D tile.
- **Code-split.** The three.js bundle loads only in the browser, after the
  web fonts are ready, because label textures bake in whatever font exists
  at the moment they are drawn.

`docs/tracker.md` is the engineering log, with the reasoning behind fixes
that the code alone does not show. Read it before changing the scene.
`docs/periodic-table-prototype.html` is the single-file prototype the app
was ported from, kept for reference only.

## Project structure

```
app/                         Next.js routes: /, /element/[symbol], /element/[symbol]/isotope/[mass]
src/
  data/                      elements, layout, keyboard grid, isotopes (no React, no three.js)
    isotopeData.js           generated by tools/gen-isotope-data.mjs
  three/                     three.js builders, textures, shared materials, layout of the cubes
  store/                     zustand stores, and the registries the hit layer raycasts against
  hooks/useDeepLink.js       opens the element in the URL on first load
  components/                the two canvases, the hit layer, scene parts and the 2D overlay
tools/gen-isotope-data.mjs   regenerates the isotope data from its sources
tests/                       node --test suites; scene.js rebuilds the hit geometry
tests/browser/run.js         the headless-Chrome suite
docs/                        tracker.md (engineering log) and the original prototype
```

## Known gaps

- **Touch.** A tap opens an element, but a touch drag does not orbit: after
  a couple of moves the browser claims the gesture and cancels the pointer.
  Fixing that is a change to how the page handles touch, and has not been
  made.
- **Next.js 14 is out of support.** `npm audit` lists advisories that are
  fixed only in Next 15.5.24 and later, which also needs React 19 and React
  Three Fiber 9. Nothing here is deployed by this repository; if you host it
  yourself, plan that upgrade.

## Licence

Free for personal, non-commercial use. You may use, study and modify this
software for yourself, but you may not use it commercially, and you may not
share or publish it, in its original form or modified. See [LICENSE](LICENSE)
for the full terms.
