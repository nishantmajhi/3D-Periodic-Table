#!/usr/bin/env node
// The app, built and served, in a real headless Chrome.
//
//   node tests/browser/run.js              build the working copy and check it
//   node tests/browser/run.js --original   build the commit this pass started from
//   node tests/browser/run.js --no-build   check the working copy's existing .next
//
// In --original mode every check named "regression:" must fail and every
// other check must pass; a regression check that passes against the original
// is not testing the defect it names. The original is checked out with
// `git worktree` under PT_WORK_DIR (default: .cache/ in this project, which
// is ignored), with this project's node_modules linked in, and removed
// afterwards. PT_WORK_DIR must be on the same drive as the project: webpack
// cannot express a path from one Windows drive to another, and the build
// fails with "Can't resolve './E:/...'".
//
// The page is driven through the DevTools protocol with Node's own WebSocket:
// real mouse events on the hit layer, real key events, and the accessible
// buttons the app renders for keyboard users. State is read back from the
// HUD, the detail panel and the address bar. GPU resources are counted by
// wrapping WebGL's create/delete calls before the page loads. Requests that
// leave 127.0.0.1 (the Google Fonts stylesheet) are refused, so the run is
// the same offline. WebGL runs on SwiftShader. Prints SKIP and exits 0 if no
// Chrome is found, which is why this is not part of `npm test`.

import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { buildOverview, firstHit, hiddenPillarPoints, overviewCamera, tileCenterOnScreen } from '../scene.js';
import { hittable } from '../../src/store/registry.js';
import { useCameraStore, applyCameraState } from '../../src/store/cameraStore.js';
import { LANTHANIDES } from '../../src/data/elements.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASELINE = 'af3f66d'; // "fixed atomic number non rendering properly", the last commit before this pass
const ORIGINAL = process.argv.includes('--original');
const NO_BUILD = process.argv.includes('--no-build');
const W = 1280, H = 800;
const WORK = process.env.PT_WORK_DIR || path.join(ROOT, '.cache');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHROME = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean).find((c) => fs.existsSync(c));

// --------------------------------------------------------------- the app ---

function prepareOriginal() {
  fs.mkdirSync(WORK, { recursive: true });
  const dir = fs.mkdtempSync(path.join(WORK, 'original-'));
  fs.rmSync(dir, { recursive: true });
  execFileSync('git', ['worktree', 'add', '--detach', dir, BASELINE], { cwd: ROOT, stdio: 'ignore' });
  const link = path.join(dir, 'node_modules');
  fs.symlinkSync(path.join(ROOT, 'node_modules'), link, 'junction');
  return {
    dir,
    cleanup() {
      // The link must be gone before git deletes the worktree, or the
      // recursive delete could follow it into the real node_modules.
      for (const unlink of [fs.unlinkSync, fs.rmdirSync]) {
        try { unlink(link); } catch { /* try the other way */ }
        try { fs.lstatSync(link); } catch { break; }
      }
      try {
        fs.lstatSync(link);
        console.error(`left ${dir} in place: could not remove its node_modules link`);
        return;
      } catch { /* gone, as it should be */ }
      execFileSync('git', ['worktree', 'remove', '--force', dir], { cwd: ROOT, stdio: 'ignore' });
    },
  };
}

const nextBin = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');

function build(dir) {
  process.stdout.write(`building ${ORIGINAL ? `${BASELINE} (original)` : 'the working copy'}... `);
  const t = Date.now();
  execFileSync(process.execPath, [nextBin, 'build'], { cwd: dir, stdio: 'ignore', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });
  console.log(`${((Date.now() - t) / 1000).toFixed(0)} s`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
}

async function serve(dir) {
  const port = await freePort();
  const child = spawn(process.execPath, [nextBin, 'start', '-p', String(port), '-H', '127.0.0.1'], {
    cwd: dir, stdio: 'ignore', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  });
  for (const deadline = Date.now() + 30000; Date.now() < deadline; await sleep(200)) {
    try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return { port, stop: () => child.kill() }; } catch { /* not up */ }
  }
  child.kill();
  throw new Error('next start never answered');
}

// ---------------------------------------------------------------- chrome ---

async function launchChrome() {
  fs.mkdirSync(WORK, { recursive: true });
  const profile = fs.mkdtempSync(path.join(WORK, 'chrome-'));
  const child = spawn(CHROME, [
    '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, `--window-size=${W},${H}`, 'about:blank',
  ], { stdio: 'ignore' });
  let port = 0;
  for (const deadline = Date.now() + 30000; Date.now() < deadline && !port; await sleep(50)) {
    try { port = Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]) || 0; } catch { /* not yet */ }
  }
  if (!port) throw new Error('Chrome never wrote DevToolsActivePort');
  let ws = null;
  for (const deadline = Date.now() + 30000; Date.now() < deadline && !ws; await sleep(50)) {
    try { ws = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch { /* not up */ }
  }
  const page = new Page(ws);
  await page.open();
  return {
    page,
    close() {
      page.ws.close();
      child.kill();
      for (let i = 0; i < 20; i++) {
        try { fs.rmSync(profile, { recursive: true, force: true }); break; } catch { const u = Date.now() + 100; while (Date.now() < u) { /* Chrome lets go late */ } }
      }
    },
  };
}

// GPU objects alive, counted from WebGL's own create and delete calls.
const COUNT_GL = `
  window.__gl = { textures: 0, buffers: 0 };
  for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) {
    const p = C.prototype, ct = p.createTexture, dt = p.deleteTexture, cb = p.createBuffer, db = p.deleteBuffer;
    p.createTexture = function () { window.__gl.textures++; return ct.apply(this, arguments); };
    p.deleteTexture = function (t) { if (t) window.__gl.textures--; return dt.apply(this, arguments); };
    p.createBuffer = function () { window.__gl.buffers++; return cb.apply(this, arguments); };
    p.deleteBuffer = function (b) { if (b) window.__gl.buffers--; return db.apply(this, arguments); };
  }`;

class Page {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.id = 0; this.pending = new Map(); this.errors = []; this.refused = []; }

  open() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.addEventListener('error', () => reject(new Error('DevTools websocket error')));
      this.ws.addEventListener('message', (e) => {
        const m = JSON.parse(e.data);
        if (m.id && this.pending.has(m.id)) {
          const { res, rej } = this.pending.get(m.id);
          this.pending.delete(m.id);
          if (m.error) rej(new Error(m.error.message)); else res(m.result);
        } else if (m.method === 'Runtime.exceptionThrown') {
          this.errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
        } else if (m.method === 'Fetch.requestPaused') {
          const { requestId, request } = m.params;
          const ok = new URL(request.url).hostname === '127.0.0.1';
          if (!ok) this.refused.push(request.url);
          this.send(ok ? 'Fetch.continueRequest' : 'Fetch.failRequest', ok ? { requestId } : { requestId, errorReason: 'BlockedByClient' }).catch(() => {});
        }
      });
      this.ws.addEventListener('open', async () => {
        try {
          await this.send('Runtime.enable');
          await this.send('Page.enable');
          await this.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
          await this.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
          await this.send('Page.addScriptToEvaluateOnNewDocument', { source: COUNT_GL });
          resolve();
        } catch (err) { reject(err); }
      });
    });
  }

  send(method, params = {}) {
    return new Promise((res, rej) => { const id = ++this.id; this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); });
  }

  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`in page: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
    return r.result.value;
  }

  async waitFor(expression, timeoutMs = 20000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try { if (await this.eval(expression)) return; } catch { /* mid-navigation */ }
      await sleep(50);
    }
    throw new Error(`timed out waiting for ${expression}`);
  }

  state() { return this.eval(`document.querySelector('#hud .state')?.textContent.replace('state: ', '') ?? null`); }
  waitState(s, ms) { return this.waitFor(`document.querySelector('#hud .state')?.textContent === 'state: ${s}'`, ms); }

  async load(url) {
    await this.send('Page.navigate', { url });
    await this.waitFor(`document.readyState === 'complete' && !!document.querySelector('#hud')`);
    // Settled: the scene has registered its tiles once the accessible grid
    // can find one, and a frame or two has been drawn.
    await this.waitFor(`document.querySelectorAll('canvas').length === 2`);
    await sleep(600);
  }

  async mouse(type, x, y, buttons = 0) {
    await this.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !buttons ? 'none' : 'left', buttons, clickCount: 1, pointerType: 'mouse' });
  }

  async click(x, y) {
    await this.mouse('mouseMoved', x, y);
    await this.mouse('mousePressed', x, y, 1);
    await this.mouse('mouseReleased', x, y);
  }

  async key(key, code = key, keyCode = 0) {
    for (const type of ['keyDown', 'keyUp']) await this.send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: keyCode });
  }

  escape() { return this.key('Escape', 'Escape', 27); }

  // The accessible button for an element, as a keyboard user reaches it.
  activate(sym) {
    return this.eval(`(() => {
      const b = [...document.querySelectorAll('[role=grid] button, [role=list] button')]
        .find((x) => x.textContent.startsWith(${JSON.stringify(`${sym},`)}) || x.textContent.includes(${JSON.stringify(`(${sym})`)}));
      b.focus(); b.click(); return true;
    })()`);
  }

  panel() {
    return this.eval(`(() => {
      const p = document.querySelector('#detailPanel');
      const rows = Object.fromEntries([...p.querySelectorAll('.row')].map((r) => [r.firstChild.textContent, r.lastChild.textContent]));
      return { title: p.querySelector('h3')?.textContent, rows, note: p.querySelector('p')?.textContent };
    })()`);
  }

  isotopeOptions() { return this.eval(`[...document.querySelectorAll('[role=listbox] [role=option]')].map((o) => o.textContent.split(' ')[0])`); }
  gl() { return this.eval('({ ...window.__gl })'); }
}

// ---------------------------------------------------------------- checks ---

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ok    ${name}`);
  } catch (e) {
    results.push({ name, ok: false, why: e.message });
    console.log(`  FAIL  ${name}\n          ${e.message.split('\n')[0]}`);
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const eq = (a, b, what) => assert(JSON.stringify(a) === JSON.stringify(b), `${what}: got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);

async function run(page, base) {
  const url = (p = '') => `http://127.0.0.1:${base}/${p}`;

  await check('the overview loads with the accessible grid and no page errors', async () => {
    await page.load(url());
    eq(await page.state(), 'overview', 'state');
    eq(await page.eval(`document.querySelectorAll('[role=grid] button').length`), 88, 'grid buttons');
    eq(await page.eval(`document.querySelectorAll('[role=list] button').length`), 30, 'lanthanide and actinide buttons');
    eq(page.errors, [], 'page errors');
  });

  await check('a deep link opens the element, whatever the case of its symbol', async () => {
    await page.load(url('element/fe'));
    await page.waitState('popped');
    eq(await page.isotopeOptions(), ['Fe-54', 'Fe-56', 'Fe-57', 'Fe-58'], 'isotopes');
  });

  await check('an isotope deep link opens its detail panel', async () => {
    await page.load(url('element/Fe/isotope/56'));
    await page.waitState('detail');
    const p = await page.panel();
    eq(p.title, 'Fe-56', 'title');
    eq([p.rows.Protons, p.rows.Neutrons, p.rows.Electrons, p.rows.Stable], ['26', '30', '26', 'Yes'], 'rows');
    eq(await page.eval('location.pathname'), '/element/Fe/isotope/56', 'address');
  });

  await check('regression: uranium-238 is shown as radioactive', async () => {
    await page.load(url('element/U/isotope/238'));
    await page.waitState('detail');
    const p = await page.panel();
    eq(p.rows.Stable, 'No', 'Stable row');
    assert(/radioactive/.test(p.note), `note: ${p.note}`);
  });

  await check('regression: protactinium-231 is shown as radioactive', async () => {
    await page.load(url('element/Pa/isotope/231'));
    await page.waitState('detail');
    eq((await page.panel()).rows.Stable, 'No', 'Stable row');
  });

  await check('regression: helium-4 is not shown as 100% beside helium-3', async () => {
    await page.load(url('element/He/isotope/4'));
    await page.waitState('detail');
    eq((await page.panel()).rows['Natural abundance'], '99.9999%', 'abundance');
  });

  await check('regression: protium shows its natural abundance', async () => {
    await page.load(url('element/H/isotope/1'));
    await page.waitState('detail');
    eq((await page.panel()).rows['Natural abundance'], '99.99%', 'abundance');
  });

  await check('regression: lawrencium shows its longest-lived isotope, Lr-266', async () => {
    await page.load(url('element/Lr'));
    await page.waitState('popped');
    eq(await page.isotopeOptions(), ['Lr-266'], 'isotopes');
  });

  for (const sym of ['Fe', 'H', 'Cs', 'Og']) {
    await check(`regression: a click in the middle of ${sym}'s tile opens ${sym}`, async () => {
      await page.load(url());
      const p = tileCenterOnScreen(sym, overviewCamera(W, H), W, H);
      await page.click(p.x, p.y);
      await page.waitState('popped');
      eq(await page.eval('location.pathname'), `/element/${sym}`, `address after a click at ${Math.round(p.x)},${Math.round(p.y)}`);
      await page.escape();
      await page.waitState('overview');
      eq(await page.eval('location.pathname'), '/', 'address after Escape');
    });
  }

  // A gap between tiles where a hidden pillar cube is the only solid thing
  // under the pointer.
  const cam0 = overviewCamera(W, H), roots0 = buildOverview();
  const gaps = hiddenPillarPoints(W, H).filter((p) => firstHit(hittable(roots0), cam0, p.x, p.y, W, H) === null);
  const target = gaps[Math.floor(gaps.length / 2)];

  await check(`regression: a click in the gap over a hidden pillar cube opens nothing (${target.sym} at ${target.x},${target.y})`, async () => {
    await page.load(url());
    await page.click(target.x, target.y);
    await sleep(1500);
    eq(await page.eval('location.pathname'), '/', 'address');
    eq(await page.state(), 'overview', 'state');
  });

  await check('regression: hovering there does not offer a pointer', async () => {
    await page.load(url());
    await page.mouse('mouseMoved', target.x - 40, target.y - 40);
    await page.mouse('mouseMoved', target.x, target.y);
    await sleep(100);
    eq(await page.eval(`document.querySelector('#hit-layer').style.cursor`), 'grab', 'cursor');
  });

  await check('regression: tilted, the pillars show and a click on a pillar cube opens it', async () => {
    await page.load(url());
    // Drag the view up 100px: phi rises by 0.6, past PHI_SHOW.
    await page.mouse('mouseMoved', 640, 700);
    await page.mouse('mousePressed', 640, 700, 1);
    for (let i = 1; i <= 10; i++) await page.mouse('mouseMoved', 640, 700 - i * 10, 1);
    await page.mouse('mouseReleased', 640, 600);
    await sleep(200);
    // The same drag, applied to a copy of the store's starting state.
    const start = { ...useCameraStore.getState() };
    useCameraStore.getState().drag(0, -100);
    const cam = new THREE.PerspectiveCamera(52, W / H, 0.1, 100);
    applyCameraState(cam);
    useCameraStore.setState(start);
    // Tilted, each cube is partly behind the one above it. Find, near the
    // middle of some lanthanide, a point that is that lanthanide and stays
    // so for 3px in every direction.
    const shown = buildOverview();
    for (const r of shown) r.visible = true;
    const at = (x, y) => firstHit(shown, cam, x, y, W, H)?.userData.el.sym;
    let sym = null, p = null;
    for (const s of LANTHANIDES) {
      const c = tileCenterOnScreen(s, cam, W, H);
      for (let dy = -30; dy <= 30 && !p; dy += 2) {
        for (let dx = -30; dx <= 30 && !p; dx += 2) {
          const x = Math.round(c.x) + dx, y = Math.round(c.y) + dy;
          if ([[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]].every(([u, v]) => at(x + u, y + v) === s)) p = { x, y };
        }
      }
      if (p) { sym = s; break; }
    }
    assert(p, 'no lanthanide is clear of its neighbours at this tilt');
    await page.click(p.x, p.y);
    await page.waitState('popped');
    eq(await page.eval('location.pathname'), `/element/${sym}`, `address after a click at ${Math.round(p.x)},${Math.round(p.y)}`);
  });

  await check('the keyboard reaches a lanthanide without tilting, and Escape steps back', async () => {
    await page.load(url());
    await page.activate('Gd');
    await page.waitState('popped');
    eq((await page.isotopeOptions()).length, 7, 'gadolinium has seven natural isotopes');
    await page.escape();
    await page.waitState('overview');
  });

  // One pop first so that anything created once and kept (shaders, the
  // atom's shared geometry) is in the baseline.
  async function cycleElement(sym) {
    await page.activate(sym);
    await page.waitState('popped');
    await sleep(250);
    await page.escape();
    await page.waitState('overview');
    await sleep(250);
  }
  async function cycleAtom(index) {
    await page.eval(`document.querySelectorAll('[role=listbox] [role=option]')[${index}].click()`);
    await page.waitState('detail');
    await sleep(250);
    await page.escape();
    await page.waitState('popped');
    await sleep(250);
  }

  await check('regression: popping elements and closing them again frees their textures', async () => {
    await page.load(url());
    await cycleElement('Fe');
    const before = await page.gl();
    for (const sym of ['Sn', 'Xe', 'Fe', 'Cd', 'U']) await cycleElement(sym);
    const after = await page.gl();
    eq(after.textures, before.textures, `live textures after five more pops (before ${before.textures})`);
  });

  await check('regression: opening and closing atom views frees their buffers', async () => {
    await page.load(url('element/Sn'));
    await page.waitState('popped');
    await cycleAtom(0);
    const before = await page.gl();
    for (const i of [1, 2, 3, 4, 5, 6]) await cycleAtom(i);
    const after = await page.gl();
    eq(after.buffers, before.buffers, `live buffers after six more atom views (before ${before.buffers})`);
  });

  await check('nothing left the machine but the refused font stylesheet', async () => {
    const other = page.refused.filter((u) => !u.startsWith('https://fonts.googleapis.com/') && !u.startsWith('https://fonts.gstatic.com/'));
    eq(other, [], 'refused requests');
  });

  await check('no page errors over the whole run', async () => eq(page.errors, [], 'page errors'));
}

// ------------------------------------------------------------------ main ---

if (!CHROME) {
  console.log('SKIP: no Chrome found (set CHROME to its path)');
  process.exit(0);
}

let original = null, server = null, chrome = null;
try {
  const dir = ORIGINAL ? (original = prepareOriginal()).dir : ROOT;
  if (ORIGINAL || !NO_BUILD) build(dir);
  server = await serve(dir);
  chrome = await launchChrome();
  console.log(`checking ${ORIGINAL ? `the original (${BASELINE})` : 'the working copy'} in headless Chrome:`);
  await run(chrome.page, server.port);
} finally {
  chrome?.close();
  server?.stop();
  original?.cleanup();
}

const failed = results.filter((r) => !r.ok);
if (ORIGINAL) {
  const wrong = results.filter((r) => r.name.startsWith('regression:') === r.ok);
  console.log(`\n${results.length} checks against the original: ${failed.length} failed, ${results.length - failed.length} passed`);
  for (const r of wrong) console.log(`  UNEXPECTED: ${r.name} ${r.ok ? 'passed' : 'failed'}${r.why ? ` -- ${r.why}` : ''}`);
  process.exit(wrong.length ? 1 : 0);
}
console.log(`\n${results.length} checks: ${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
