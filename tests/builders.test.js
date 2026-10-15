// The popped isotope cubes and the atom illustration: what they are made
// of, and that taking them down frees what was made for them alone.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

// textures.js draws labels on a canvas; a stand-in that accepts the calls.
before(() => {
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
});

const { buildIsotopeCube, disposeIsotopeCube, buildAtom, disposeAtom } = await import('../src/three/builders.js');

function watchDisposals(root) {
  const disposed = new Set();
  const watch = (x) => x?.addEventListener('dispose', () => disposed.add(x));
  root.traverse((o) => { watch(o); watch(o.geometry); watch(o.material); watch(o.material?.map); });
  return disposed;
}

test('an isotope cube is a box, its edges and a label sprite, carrying its isotope', () => {
  const iso = { mass: 56 };
  const g = buildIsotopeCube('Fe', iso, 2, 0xffd43b);
  assert.deepEqual(g.children.map((c) => c.type), ['Mesh', 'LineSegments', 'Sprite']);
  assert.equal(g.userData.index, 2);
  assert.equal(g.userData.iso, iso);
  assert.equal(g.children[0].material.color.getHex(), 0xffd43b);
  assert.ok(g.children[2].material.map, 'the label is a texture');
});

test('regression: disposing a cube frees its own materials and label texture', () => {
  const g = buildIsotopeCube('Fe', { mass: 56 }, 0);
  const [box, edges, sprite] = g.children;
  const disposed = watchDisposals(g);
  disposeIsotopeCube(g);
  for (const x of [box.material, edges.material, sprite.material, sprite.material.map]) assert.ok(disposed.has(x), x.type);
});

test('the geometry every cube shares survives a disposal', () => {
  const a = buildIsotopeCube('Fe', { mass: 56 }, 0);
  const b = buildIsotopeCube('Fe', { mass: 57 }, 1);
  assert.equal(a.children[0].geometry, b.children[0].geometry, 'shared, as builders.js intends');
  const disposed = watchDisposals(a);
  disposeIsotopeCube(a);
  assert.ok(!disposed.has(a.children[0].geometry));
  assert.ok(!disposed.has(a.children[1].geometry));
});

test('an atom has a nucleus of protons and neutrons and one ring per shell', () => {
  // Shells fill 2, 8, 18, 32 in order -- the simplification tracker.md
  // records on purpose -- so iron's 26 electrons make three rings (2, 8, 16).
  const atom = buildAtom(26, 30);
  const meshes = atom.children.filter((c) => c.isInstancedMesh);
  assert.deepEqual(meshes.map((m) => m.count), [23, 27, 26], 'protons and neutrons scaled to 50 spheres, 26 electrons');
  assert.equal(atom.children.filter((c) => c.type === 'LineLoop').length, 3);
  assert.equal(typeof atom.userData.update, 'function');
});

test('hydrogen-1 has one proton, no neutron mesh, one electron', () => {
  const atom = buildAtom(1, 0);
  assert.deepEqual(atom.children.filter((c) => c.isInstancedMesh).map((m) => m.count), [1, 1]);
});

test('regression: disposing an atom frees its instance buffers and nothing it shares', () => {
  const atom = buildAtom(92, 146);
  const other = buildAtom(26, 30);
  const disposed = watchDisposals(atom);
  disposeAtom(atom);
  const meshes = atom.children.filter((c) => c.isInstancedMesh);
  assert.equal(meshes.length, 3);
  for (const m of meshes) assert.ok(disposed.has(m), 'instanced mesh disposed');
  for (const m of meshes) {
    assert.ok(!disposed.has(m.geometry), 'shared sphere geometry kept');
    assert.ok(!disposed.has(m.material), 'shared material kept');
  }
  assert.equal(other.children[0].material, meshes[0].material, 'the next atom still uses it');
});

test('the cubes are the size the cuboid layout spaces them for, so neighbours never touch', async () => {
  const { CUBE_SIZE, CUBE_STEP } = await import('../src/three/cuboidLayout.js');
  const g = buildIsotopeCube('Fe', { mass: 56 }, 0);
  const { width, height, depth } = g.children[0].geometry.parameters;
  assert.deepEqual([width, height, depth], [CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]);
  assert.ok(CUBE_STEP > CUBE_SIZE);
});
