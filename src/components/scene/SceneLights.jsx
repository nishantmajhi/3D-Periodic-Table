'use client';

// Visual polish pass: moving from unlit MeshBasicMaterial to lit
// MeshStandardMaterial needs actual lights in the scene, or everything
// renders pure black. Deliberately no shadow-casting lights/shadow maps --
// this app already went through a real perf-tuning pass (see tracker.md),
// and shadows add cost for a look this scene doesn't need (tiles/cubes are
// small, floating, and don't really occlude each other in a way shadows
// would sell).
//
// Mounted once per <Canvas> (each canvas is a separate scene graph in this
// two-canvas architecture), so it's included directly in both places in
// CanvasStack.jsx rather than assuming a single shared scene.
export default function SceneLights() {
  return (
    <>
      {/* Soft sky/ground fill so nothing is ever fully unlit, tinted to
          match the app's cool dark background rather than neutral gray. */}
      <hemisphereLight args={[0x9fc4ff, 0x11151c, 0.55]} />
      <ambientLight intensity={0.25} />

      {/* Key light: warm, slightly offset, gives fills their main shading
          and the isotope/atom spheres a readable highlight. */}
      <directionalLight position={[6, 10, 5]} intensity={1.15} color={0xfff2df} />

      {/* Cool rim/fill light from the opposite side, matching the app's
          cyan accent color, so shadowed faces don't just go flat and dark. */}
      <directionalLight position={[-7, 4, -6]} intensity={0.4} color={0x5ec8d8} />
    </>
  );
}
