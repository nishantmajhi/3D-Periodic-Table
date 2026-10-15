import * as THREE from 'three';
import { isoLabelTexture } from './textures.js';
import { EDGE_COLOR } from './materialCache.js';
import { CUBE_SIZE } from './cuboidLayout.js';

const CUBE_GEO = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
const CUBE_EDGES_GEO = new THREE.EdgesGeometry(CUBE_GEO);

export function buildIsotopeCube(sym, iso, index, color = 0xffb454) {
  const size = CUBE_SIZE;
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.45 });
  const box = new THREE.Mesh(CUBE_GEO, mat);
  const edges = new THREE.LineSegments(
    CUBE_EDGES_GEO,
    new THREE.LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 0.45 })
  );
  const g = new THREE.Group();
  g.add(box, edges);

  const tex = isoLabelTexture(sym, iso);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(size * 0.95, size * 0.95, 1);
  sp.position.z = size / 2 + 0.03; // sit just proud of the face so the box doesn't depth-occlude the label
  g.add(sp);

  g.scale.setScalar(0.001);
  g.userData = { index, iso };
  return g;
}

// Frees what buildIsotopeCube allocated for this one cube: its three
// materials and its label texture. three never releases GPU memory on its
// own, so without this every pop left one 660x660 texture per isotope behind.
// The box and edge geometries are shared by every cube and stay.
export function disposeIsotopeCube(g) {
  g.traverse((o) => {
    if (!o.material) return;
    o.material.map?.dispose();
    o.material.dispose();
  });
}

function fibonacciSpherePoint(i, n, r) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = n > 1 ? 1 - (i / (n - 1)) * 2 : 0;
  const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
  const t = golden * i;
  return new THREE.Vector3(Math.cos(t) * radiusAtY * r, y * r, Math.sin(t) * radiusAtY * r);
}

function shellConfig(z) {
  const caps = [2, 8, 18, 32, 32, 32, 32];
  let remaining = z;
  const shells = [];
  for (const cap of caps) {
    if (remaining <= 0) break;
    const n = Math.min(cap, remaining);
    shells.push(n);
    remaining -= n;
  }
  return shells;
}

// ---------------------------------------------------------------------------
// PERF: buildAtom() runs synchronously in a GSAP onComplete, exactly when the
// isotope cube is dissolving. A heavy element (e.g. U, Z=92) needs ~50
// nucleus particles + ~92 electrons -- if each were its own Mesh + its own
// freshly-constructed SphereGeometry (the original approach), that's 140+
// unique GPU buffer allocations landing in a single frame, which is exactly
// the kind of thing that causes a visible stutter right at that moment.
//
// Fix: one shared SphereGeometry + one shared material per particle *type*
// (module-level, built once, reused across every atom for the whole app
// lifetime), rendered via THREE.InstancedMesh so the whole nucleus is 1-2
// draw calls and the whole electron shell system is 1 draw call, regardless
// of element size. Building/rebuilding an atom now allocates zero new
// geometries at all.
// ---------------------------------------------------------------------------
const NUCLEUS_GEO = new THREE.SphereGeometry(0.1, 8, 8);
const PROTON_MAT = new THREE.MeshStandardMaterial({ color: 0xff6b6b, emissive: 0xff6b6b, emissiveIntensity: 0.25, metalness: 0.2, roughness: 0.4 });
const NEUTRON_MAT = new THREE.MeshStandardMaterial({ color: 0xadb5bd, emissive: 0xadb5bd, emissiveIntensity: 0.12, metalness: 0.2, roughness: 0.4 });
const ELECTRON_GEO = new THREE.SphereGeometry(0.075, 8, 8);
const ELECTRON_MAT = new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xffe066, emissiveIntensity: 0.4, metalness: 0.1, roughness: 0.3 });
const RING_MAT = new THREE.LineBasicMaterial({ color: 0x7fd1ff, transparent: true, opacity: 0.45 });
const UNIT_CIRCLE_GEO = (() => {
  const pts = [];
  for (let a = 0; a <= 64; a++) {
    const t = (a / 64) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(t), 0, Math.sin(t)));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
})();
const _dummy = new THREE.Object3D();

export function buildAtom(protons, neutrons) {
  const g = new THREE.Group();
  const total = protons + neutrons;
  const shown = Math.min(total, 50);
  const R = 0.16 * Math.cbrt(total || 1);

  // Nucleus: two InstancedMeshes (protons, neutrons) sharing one geometry.
  const protonCountShown = Math.max(1, Math.round(shown * (protons / total)));
  const neutronCountShown = Math.max(0, shown - protonCountShown);

  const protonMesh = new THREE.InstancedMesh(NUCLEUS_GEO, PROTON_MAT, protonCountShown);
  const neutronMesh = neutronCountShown > 0 ? new THREE.InstancedMesh(NUCLEUS_GEO, NEUTRON_MAT, neutronCountShown) : null;
  let pi = 0, ni = 0;
  for (let i = 0; i < shown; i++) {
    const isProton = i < protonCountShown;
    _dummy.position.copy(fibonacciSpherePoint(i, shown, R));
    _dummy.updateMatrix();
    if (isProton) protonMesh.setMatrixAt(pi++, _dummy.matrix);
    else if (neutronMesh) neutronMesh.setMatrixAt(ni++, _dummy.matrix);
  }
  protonMesh.instanceMatrix.needsUpdate = true;
  g.add(protonMesh);
  if (neutronMesh) {
    neutronMesh.instanceMatrix.needsUpdate = true;
    g.add(neutronMesh);
  }

  // Note: no on-atom "Xp · Yn" caption here — that's already shown in the
  // DetailPanel legend (protons/neutrons/electrons rows), so it doesn't
  // need to be duplicated inside the 3D illustration itself.

  // Electron shells: rings share one unit-circle geometry (scaled per shell
  // radius instead of rebuilding points); all electrons across all shells
  // are one InstancedMesh.
  const shells = shellConfig(protons); // neutral-atom electron count
  const totalElectrons = shells.reduce((a, b) => a + b, 0);
  const electronMesh = totalElectrons > 0 ? new THREE.InstancedMesh(ELECTRON_GEO, ELECTRON_MAT, totalElectrons) : null;
  if (electronMesh) g.add(electronMesh);

  const shellObjs = [];
  let eStart = 0;
  shells.forEach((count, si) => {
    const rad = R + 0.75 + si * 0.5;
    const ring = new THREE.LineLoop(UNIT_CIRCLE_GEO, RING_MAT);
    ring.scale.set(rad, 1, rad);
    ring.rotation.x = 0.3 + si * 0.22;
    ring.rotation.z = si * 0.4;
    g.add(ring);
    shellObjs.push({ rad, ring, count, startIdx: eStart, dir: si % 2 === 0 ? 1 : -1, speed: 0.9 - si * 0.1 });
    eStart += count;
  });

  function updateElectrons(t) {
    if (!electronMesh) return;
    shellObjs.forEach((sh) => {
      for (let e = 0; e < sh.count; e++) {
        const phase = (e / sh.count) * Math.PI * 2;
        const ang = phase + t * sh.speed * sh.dir;
        _dummy.position.set(sh.rad * Math.cos(ang), 0, sh.rad * Math.sin(ang)).applyEuler(sh.ring.rotation);
        _dummy.updateMatrix();
        electronMesh.setMatrixAt(sh.startIdx + e, _dummy.matrix);
      }
      sh.ring.rotation.y += 0.0012 * sh.dir;
    });
    electronMesh.instanceMatrix.needsUpdate = true;
  }
  updateElectrons(0); // avoid a one-frame flash at the origin before the first useFrame tick

  g.userData.update = updateElectrons;
  return g;
}

// Frees the per-atom GPU buffers: each InstancedMesh's instance matrices.
// The geometries and materials are module-level and shared by every atom.
export function disposeAtom(g) {
  g.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
}
