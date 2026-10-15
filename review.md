# Code Review — 3D Periodic Table

First reviewed 2026-09-04. Remediated 2026-10-01 on `cleanup/2026-10-01`,
ten commits, not pushed. This file is now the record of that pass; the
original findings are summarised under "The first review, summarised" below.

## Corrections to the first review

**"There is nothing here I would call a bug" was wrong, twice over, and
both were visible on screen.** Clicking the middle of any floor tile opened a
different element: Fe opened Rh, H opened Be, Cs opened Sr, Og opened At.
Measured from each tile's drawn center at the default view, that is all 88
floor tiles. And the detail panel called uranium-238 "Stable: Yes", "a
stable, naturally occurring form of Uranium", along with 33 other
radioactive isotopes. Neither could be seen by reading the code, because the
first comes from a three.js default and the second from the data. Both
reproduce on the original build in headless Chrome.

**It praised a data file as real NIST data, and the data was mostly right.
The part that was wrong was how the code read it.** The NIST transcription
matches NIST, apart from three abundances rounded to six decimals. But the
file listed *naturally occurring* isotopes, its own header said so, and
`getIsotopesFor` stamped every one `stable: true`. The "longest-lived"
fallback masses, which the code said were "exactly this NIST figure", are
not NIST figures past plutonium, and 13 were out of date. tracker.md had
already admitted the superheavy ones were "from memory, not verified".

**Its two "open items the tracker already names" are both still open, and
one is now measured.** Touch was checked in emulation: a tap works; a drag
gets two pointer moves before the browser sends `pointercancel` and takes
the gesture, so touch orbiting does not work at all. Not fixed, because it
is interaction. See "Deliberately not done".

## What was fixed

| # | Defect | How it showed | Commit |
| --- | --- | --- | --- |
| 1 | **P1.** `HitLayer` raycast into each tile's outline (`LineSegments`); three counts a line as hit within `params.Line.threshold`, 1 world unit by default, and tiles are 1.05 apart | A click or hover on any tile picked the neighbour nearest the camera; all 88 tiles at the default view | `f081901` |
| 2 | **P1.** Every natural isotope was `stable: true`, with the matching note | U-238, U-235, Th-232, K-40, Rb-87, Pa-231 and 28 more shown and announced as stable | `a70fbc6` |
| 3 | 13 "longest-lived" fallback isotopes were out of date | Tc-98, Lr-262, Sg-271, Bh-272, Hs-270, Mt-276, Ds-281, Rg-280, Cn-285, Nh-284, Fl-289, Mc-288, Og-294 shown; now 97, 266, 269, 270, 269, 277, 282, 282, 286, 286, 290, 290, 295 | `a70fbc6` |
| 4 | The lost generator had rounded abundances to six decimals | He-3 shown as 0.000100% (it is 0.000134%) | `a70fbc6` |
| 5 | Three's raycaster ignores `visible`; the pillar cubes are hidden until the view is tilted | A click in the gap between tiles could open an invisible lanthanide or actinide; the cursor offered a pointer there | `fb516a3` |
| 6 | Popped cubes and atom views were removed from the scene and never `dispose()`d | One ~1.7 MB texture per isotope cube and three buffers per atom view kept for the life of the page | `f60eee5` |
| 7 | Abundance written with `toPrecision(3)` | He-4 and Ta-181 shown as 100% beside He-3 and Ta-180 | `927c408` |
| 8 | Hydrogen's hand-written isotopes had no abundance field | The only natural isotopes with no abundance row | `927c408` |
| 9 | The second commit deleted `.gitignore` | `node_modules/` and `.next/` untracked and one `git add .` from being committed | `f4e33c3` |

Also: `src/three/screenProject.js`, unused since the Initial commit, removed;
`CUBE_SIZE` defined once (builders.js had its own copy of the number the
layout spaces cubes by); `hasNoStableIsotopes()`, unused, which returned
`false` for uranium, removed; the prototype labelled as history (`562fc8a`).

**The isotope data is now generated.** The original generator was never
committed, so its output could not be re-run or checked.
`tools/gen-isotope-data.mjs` replaces it and writes `src/data/isotopeData.js`:

- natural isotopes and abundances from NIST, at full precision;
- stable or not by majority of IAEA LiveChart, NUBASE2020 and Wikipedia's
  *List of nuclides*: radioactive only with a *measured* decay from two of
  three; a lower bound is not a measurement. Ta-180 stays stable because
  what occurs in nature is the isomer Ta-180m, never seen to decay. The vote
  reads each source's isomer row when NUBASE says the natural form is one,
  which is how the first draft of the generator was caught calling it
  radioactive;
- longest-lived isotope by majority of IAEA, NUBASE2020 (estimates marked
  `#` excluded) and PubChem. The generator refuses to write if any element
  has no majority. None has.

**Where the sources stop agreeing**, which is where to look first if a
reader disputes something: Kr-78, Xe-124 and Ba-130 are radioactive by
Wikipedia alone (Xe-124's decay was observed by XENON1T in 2019; the IAEA
table still gives a bound) and are shown as stable. Tc-97 and Tc-98 have
half-lives of 4.21 and 4.2 million years; all three sources say 97. For the
superheavy elements the IAEA table's longest-lived bohrium, hassium,
meitnerium and roentgenium (Bh-278, Hs-278, Mt-282, Rg-286) disagree with
both NUBASE and PubChem, and were outvoted.

**On-screen changes**, all listed in the archive's `CLEANUP-LOG.md`: the
Stable row and note for 34 isotopes; the fallback isotope of 13 elements;
He-3's abundance; He-4 and Ta-181 written to more digits; an abundance row
for protium and deuterium. And clicks and hovers now land on the tile under
the pointer. No layout, styling, copy or interaction changed.

## Tests

There were none. Now:

- `npm test`: 73 tests, `node --test`, no dependencies. Layout (every
  element placed once, the period 1–3 gaps, the marker-to-pillar gap equal
  to the grid gap, the category key clear of every tile), keyboard
  movement, the cube arrangement, the camera's clamps and its matrixWorld
  refresh, the isotope rules and data, abundance formatting, hit-testing,
  and disposal. `tests/scene.js` rebuilds the overview's hit geometry the
  way the app registers it (box, outline and label sprite per tile) and
  projects it through the store's camera. That is how a click target
  becomes "where Fe is drawn" and not a guess.
- `npm run test:browser`: 20 checks in headless Chrome over the DevTools
  protocol, no dependencies. Production build, real mouse and keys, deep
  links, the detail panel read back, WebGL textures and buffers counted.
- `npm run test:original`: the same against `af3f66d` in a temporary
  worktree. All 14 `regression:` checks fail there and the other 6 pass,
  which the runner enforces. Node regression tests were each run against
  the commit before their fix and failed.

Each commit was checked out into its own worktree and tested there.

## Deliberately not done

- **Touch (the first review's first P2).** Measured, not fixed. In Chrome's
  touch emulation a tap on Fe opens Fe, but a vertical drag produces two
  `pointermove`s and then `pointercancel`, because `#hit-layer` has the
  default `touch-action`, so the browser claims the pan. `HitLayer` also
  never listens for `pointercancel`, so after one, `dragging` stays true
  until the next press. On a device with both touch and a mouse, moving the
  mouse would then orbit the view with no button held. The fix is
  `touch-action: none` on the hit layer and a `pointercancel` handler, plus
  pinch-to-zoom if wanted. That is how the page responds to a hand, which is
  interface, so it is the author's call.
- **The performance check in a live session (second P2).** Needs eyes on a
  real GPU. The headless suite runs on SwiftShader and says nothing about
  frame times. What it does show is that the GPU memory the tracker never
  measured was leaking (fixed above).
- **Upgrading three, React Three Fiber and Next (P3).** Asked on
  2026-10-01; the author chose to document only. Next 14.2.35 is the last
  14.x and `npm audit` reports 23 Next.js advisories, two critical (RCE on
  Windows-hosted servers; RCE in the Image Optimization API with AVIF), all
  fixed only in 15.5.24 or later. That needs React 19 and R3F 9 together. The
  app uses no `next/image`, middleware, rewrites or Server Actions, which
  narrows the exposure, but `next start` still serves the image endpoint.
  Nothing in this repository deploys it. Also flagged: PostCSS and nanoid
  advisories, which come in through Next.
- **The atom's shell filling.** 2, 8, 18, 32 in order, right to argon and
  wrong after (potassium is drawn 2-8-9, not 2-8-8-1). tracker.md lists
  it under "simplifications (flagged intentionally, not bugs)", and the
  README now says so.
- **`PoppedCuboid.selectIsotope` with a bad index** sets the state to
  `moving` before checking the index, which would lock the app. No caller
  can pass one (every index comes from the same isotope list the cubes were
  built from), so it is noted, not changed.
- **`npm run lint`** is the Next scaffold's: with no ESLint config it opens
  an interactive setup prompt. Left; the README does not advertise it.
- **The README's "About".** Kept in the author's words, with two slips for
  the author: "came across a limitation of the modern periodic table is
  that the f-block…", and "designing around it rather than around it",
  where one of the two "around"s was meant to be another word.
- **A licence.** Not chosen. The README credits the data sources; NIST's
  data is public domain, and only facts are taken from the others.

## Notes for the next session

- **Run the generator's check before touching isotope data:**
  `node tools/gen-isotope-data.mjs --check`. It fetches five sources the
  first time, into `tools/.cache/`.
- **three.js hit-testing has two defaults that work against this scene,
  and both bit:** `Raycaster` ignores `visible`, and it hits lines within 1
  world unit. `hittable()` and `solidHits()` in `src/store/registry.js`
  are the guards; anything new that gets registered for raycasting goes
  through both.
- **A label sprite is hit-tested as a camera-facing square.** When the view
  is tilted, a tile's label stands up and covers part of the tile behind
  it, and each pillar cube is partly covered by the one above. A test that
  clicks "an element" has to find a point the model says is clear, as
  `tests/browser/run.js` does.
- **The browser suite's worktree must be on the project's drive.** With the
  worktree on D: and `node_modules` resolving to E:, webpack fails with
  "Can't resolve './E:/...'". Work files go in `.cache/`.
- **Remove a `node_modules` junction before deleting its worktree.**
  `git worktree remove --force` on a directory still holding a junction
  could follow it. The runner checks the link is gone first.

## The first review, summarised

Verdict: "nothing here I would call a bug", what follows "is about
finishing". It praised `docs/tracker.md` highly, rightly. Findings: (1)
test and tune touch input, P2, measured above and left; (2) verify the
atom-dissolve performance fix live, P2, left; (3) dependencies a year
behind, P3, documented with the advisories; (4) the prototype may be
redundant, label it, P3, done; (5) split the tracker's status wall into
dated entries, P3, done, every sentence kept; (6) no tests, add them for
the grid maths and isotope lookup, P3, done, along with the rest; (7) no
LICENSE, P3, data attribution added, the licence left to the author.

## Licence, 2026-10-02

The author chose one licence for all of their projects: free for personal,
non-commercial use, modifiable for the user's own use, and not to be
distributed, original or modified. No standard licence says that, so `LICENSE`
is a short custom text, the same in every project apart from the year and what
it excludes. The README's licence section says the same, and `package.json`
declares `SEE LICENSE IN LICENSE`, npm's form for a licence with no SPDX
identifier. Anything above that calls the licence an open question, or calls
the project MIT, is superseded.

## CI, 2026-10-02

`.github/workflows/ci.yml` runs `npm test`, and the browser suite (which runs
`next build` first) as a second job, on `ubuntu-latest`. Nothing has been
pushed, so it has not run on GitHub yet. Every job was run before committing,
from a fresh clone of this branch, the way a runner would run it: Linux jobs
in a throwaway Ubuntu 24.04 (the image `ubuntu-latest` uses) with the same
tool versions. 73, and 20 in the browser, with WebGL on SwiftShader.

The browser job fails if the runner prints `SKIP`, which it does when it finds
no Chrome; otherwise a missing browser would read as a pass.
