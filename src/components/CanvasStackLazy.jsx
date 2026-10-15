'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const CanvasStack = dynamic(() => import('./CanvasStack'), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

function LoadingScreen() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#93a1b0',
        background: '#090c11',
        fontFamily: "'Inter', sans-serif",
        fontSize: 13,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      Loading 3D periodic table…
    </div>
  );
}

// All tile/isotope labels are canvas-drawn text baked once into a
// CanvasTexture (see textures.js) using the custom webfonts loaded via the
// @import in globals.css. Canvas text rasterizes with whatever font is
// *actually available at the moment fillText() runs* -- if a custom
// webfont hasn't finished downloading yet, the browser silently swaps in a
// fallback font for that draw call, and since a CanvasTexture is a static
// snapshot, it never gets redrawn once the real font arrives. Waiting for
// the CSS Font Loading API's `document.fonts.ready` before mounting the
// scene at all guarantees every label texture is drawn with the correct
// font from its very first frame. A short timeout keeps a slow/failed font
// fetch from stalling the app indefinitely.
function useFontsReady(timeoutMs = 2500) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts?.ready) {
      setReady(true);
      return;
    }
    let settled = false;
    const markReady = () => {
      if (!settled) {
        settled = true;
        setReady(true);
      }
    };
    document.fonts.ready.then(markReady);
    const timer = setTimeout(markReady, timeoutMs);
    return () => clearTimeout(timer);
  }, []);
  return ready;
}

export default function CanvasStackLazy(props) {
  const fontsReady = useFontsReady();
  if (!fontsReady) return <LoadingScreen />;
  return <CanvasStack {...props} />;
}
