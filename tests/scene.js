// The hit-test geometry of the overview, rebuilt from the same layout the
// scene renders (tableLayout, pillarY) with the same group structure
// Tile.jsx and Pillar.jsx register: a group per tile or pillar cube, with
// userData.el, holding its box, the box's outline and its label sprite.
// Both extras matter to a raycast: three counts a line as hit when the ray
// passes within a world unit of it, and raycasts a sprite as a
// camera-facing square, so once the view is tilted a tile's label stands up
// and catches rays its box would not.
import * as THREE from 'three';
import {
  tableLayout, TILE, TILE_H, MARKER_H, ELEMENTS_BY_SYMBOL, PILLAR_CUBE_W, PILLAR_CUBE_H, pillarY,
} from '../src/data/elements.js';
import { applyCameraState } from '../src/store/cameraStore.js';
import { solidHits } from '../src/store/registry.js';

function body(w, h, d, y) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const box = new THREE.Mesh(geo);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo));
  box.position.y = edges.position.y = y;
  return [box, edges];
}

export function buildOverview() {
  const roots = [];
  for (const cell of tableLayout()) {
    const h = cell.marker ? MARKER_H : TILE_H;
    const g = new THREE.Group();
    g.position.set(...cell.position);
    const label = new THREE.Sprite();
    label.scale.set(TILE * 0.95, TILE * 0.95, 1);
    label.position.y = h + 0.02;
    g.add(...body(TILE, h, TILE, h / 2), label);
    g.userData = { el: cell.el, isMarker: cell.marker };
    roots.push(g);
    (cell.pillarSymbols || []).forEach((sym, i) => {
      const p = new THREE.Group();
      p.position.set(cell.position[0], pillarY(i), cell.position[2]);
      const label = new THREE.Sprite();
      label.scale.set(TILE * 0.7, TILE * 0.7, 1);
      p.add(...body(PILLAR_CUBE_W, PILLAR_CUBE_H, PILLAR_CUBE_W, 0), label);
      p.userData = { el: ELEMENTS_BY_SYMBOL[sym], isMarker: false };
      p.visible = false; // Pillar.jsx hides them until the view is tilted
      roots.push(p);
    });
  }
  for (const r of roots) r.updateMatrixWorld(true);
  return roots;
}

export function overviewCamera(width, height) {
  const cam = new THREE.PerspectiveCamera(52, width / height, 0.1, 100);
  applyCameraState(cam); // the store's initial state: the near-top-down overview
  return cam;
}

const rootOf = (o) => { while (o && !o.userData.el) o = o.parent; return o; };

// The root the first hit belongs to, testing `objects` the way HitLayer does
// -- through the app's solidHits() unless `raw` asks for three's own answer.
export function firstHit(objects, cam, x, y, width, height, { raw = false } = {}) {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((x / width) * 2 - 1, -(y / height) * 2 + 1), cam);
  const all = ray.intersectObjects(objects, true);
  const hits = raw ? all : solidHits(all);
  return hits.length ? rootOf(hits[0].object) : null;
}

// Where the middle of an element is drawn, in CSS pixels: the top of its
// floor tile, or the center of its pillar cube.
export function tileCenterOnScreen(sym, cam, width, height) {
  const root = buildOverview().find((r) => r.userData.el.sym === sym);
  const local = root.visible ? new THREE.Vector3(0, TILE_H, 0) : new THREE.Vector3();
  const p = local.applyMatrix4(root.matrixWorld).project(cam);
  return { x: (p.x * 0.5 + 0.5) * width, y: (-p.y * 0.5 + 0.5) * height };
}

// Screen points (CSS pixels) whose first hit, ignoring visibility, is a
// hidden pillar cube.
export function hiddenPillarPoints(width, height, step = 4) {
  const roots = buildOverview();
  const cam = overviewCamera(width, height);
  const out = [];
  for (let y = step / 2; y < height; y += step) {
    for (let x = step / 2; x < width; x += step) {
      const r = firstHit(roots, cam, x, y, width, height);
      if (r && !r.visible) out.push({ x, y, sym: r.userData.el.sym });
    }
  }
  return out;
}

