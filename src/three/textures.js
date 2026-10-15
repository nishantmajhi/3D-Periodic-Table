import * as THREE from 'three';

// All label textures are baked once into a small canvas and then reused as
// a sprite that can end up rendered quite large on screen (a popped isotope
// cube fills a good chunk of the viewport). Canvas text is rasterized at
// the canvas's native pixel size, so if that's too low for how large the
// sprite ends up on screen, fine glyph details -- like IBM Plex Mono's
// numeral "1", which has a small top flag/serif rather than a plain
// vertical bar -- get destroyed by aliasing once magnified, and can end up
// looking like a stray mark instead of a digit. SS supersamples every
// canvas texture (drawn at SS× resolution, then displayed at the original
// world size) so thin glyph features survive magnification cleanly.
const SS = 3;

// Canvas textures don't need mipmapping (they're sprites that get
// magnified far more often than minified), and letting three.js generate
// mipmaps for a non-power-of-two canvas can itself introduce blur/artifacts
// on thin text. Force plain linear filtering with no mip chain instead.
function labelTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function tileLabelTexture(text, num) {
  const w = 160, h = 160;
  const c = document.createElement('canvas');
  c.width = w * SS; c.height = h * SS;
  const ctx = c.getContext('2d');
  ctx.scale(SS, SS);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  if (num) {
    ctx.fillStyle = 'rgba(235,245,250,0.6)';
    ctx.font = '500 20px "IBM Plex Mono", monospace';
    ctx.fillText(num, 10, 8);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f2f8fc';
  const clean = text.replace('*', '');
  const fsize = clean.length > 3 ? 34 : 60;
  ctx.font = `700 ${fsize}px "Space Grotesk", sans-serif`;
  ctx.fillText(clean, w / 2, h / 2 + (clean.length > 3 ? 2 : 14));
  return labelTexture(c);
}

export function isoLabelTexture(sym, iso) {
  const w = 220, h = 220;
  const c = document.createElement('canvas');
  c.width = w * SS; c.height = h * SS;
  const ctx = c.getContext('2d');
  ctx.scale(SS, SS);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff6e6';
  const fsize = sym.length > 2 ? 56 : 72;
  ctx.font = `700 ${fsize}px "Space Grotesk", sans-serif`;
  ctx.fillText(sym, w / 2, h / 2 - 20);
  // NOTE: this must request a weight that's actually loaded (see the
  // IBM+Plex+Mono @import in globals.css) -- requesting an unloaded weight
  // here previously caused the browser to fall back to a completely
  // different font for this line, silently baked into the texture forever.
  ctx.font = '600 28px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#ffd9a0';
  ctx.fillText('mass ' + iso.mass, w / 2, h / 2 + 32);
  // Note: no separate "Element-Mass" (e.g. "Calcium-40") line here on
  // purpose -- the symbol above plus "mass N" already say exactly that;
  // iso.name is still used elsewhere (e.g. DetailPanel) where the symbol
  // isn't already right there next to it.
  return labelTexture(c);
}

export function captionTexture(text) {
  const w = 280, h = 90;
  const c = document.createElement('canvas');
  c.width = w * SS; c.height = h * SS;
  const ctx = c.getContext('2d');
  ctx.scale(SS, SS);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#cfe7ef';
  ctx.font = '600 32px "IBM Plex Mono", monospace';
  ctx.fillText(text, w / 2, h / 2);
  return labelTexture(c);
}

export function buildKeyTexture(categoryColors) {
  const w = 900, h = 340;
  const c = document.createElement('canvas');
  c.width = w * SS; c.height = h * SS;
  const ctx = c.getContext('2d');
  ctx.scale(SS, SS);
  ctx.fillStyle = 'rgba(11,15,20,0.94)';
  roundRect(ctx, 0, 0, w, h, 28); ctx.fill();
  ctx.strokeStyle = 'rgba(120,170,200,0.35)'; ctx.lineWidth = 3;
  roundRect(ctx, 3, 3, w - 6, h - 6, 26); ctx.stroke();

  ctx.fillStyle = '#8fd8ea'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = '600 30px "Space Grotesk", sans-serif';
  ctx.fillText('ELEMENT CATEGORIES', 30, 22);

  ctx.strokeStyle = 'rgba(120,170,200,0.25)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(30, 66); ctx.lineTo(w - 30, 66); ctx.stroke();

  const items = [
    ['Alkali metal', categoryColors.alkali],
    ['Alkaline earth', categoryColors.alkaline],
    ['Transition metal', categoryColors.transition],
    ['Post-transition', categoryColors.posttrans],
    ['Metalloid', categoryColors.metalloid],
    ['Nonmetal', categoryColors.nonmetal],
    ['Halogen', categoryColors.halogen],
    ['Noble gas', categoryColors.noble],
    ['Lanthanide', categoryColors.lanthanide],
    ['Actinide', categoryColors.actinide],
  ];
  const cols = 5, rows = 2, cw = (w - 60) / cols, ch = (h - 100) / rows;
  items.forEach((it, i) => {
    const cx = 30 + (i % cols) * cw;
    const cy = 96 + Math.floor(i / cols) * ch;
    ctx.fillStyle = '#' + it[1].toString(16).padStart(6, '0');
    roundRect(ctx, cx, cy + 4, 24, 24, 6); ctx.fill();
    ctx.fillStyle = '#dbe7ef'; ctx.font = '500 20px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(it[0], cx + 34, cy + 16);
  });
  return labelTexture(c);
}
