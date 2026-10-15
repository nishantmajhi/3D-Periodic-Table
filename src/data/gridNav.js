// Keyboard movement through the accessible element grid (AccessibleOverlay).
// The rows are the real PERIODS layout minus the La*/Ac* marker cells, which
// are not focusable -- the elements they stand for are listed separately.
import { PERIODS } from './elements.js';

export const NAV_ROWS = PERIODS.map((row) => row.filter(([, sym]) => !sym.includes('*')));

export function clampCell(row, col) {
  const r = Math.max(0, Math.min(NAV_ROWS.length - 1, row));
  const c = Math.max(0, Math.min(NAV_ROWS[r].length - 1, col));
  return { row: r, col: c };
}

// The cell a key moves focus to, or null for a key the grid does not handle.
// Up/Down land on the element in the next row whose group is nearest the
// current one, since rows have different gaps (the first match wins a tie).
export function navigate({ row, col }, key) {
  switch (key) {
    case 'ArrowRight': return clampCell(row, col + 1);
    case 'ArrowLeft': return clampCell(row, col - 1);
    case 'ArrowDown':
    case 'ArrowUp': {
      const delta = key === 'ArrowDown' ? 1 : -1;
      const targetRow = Math.max(0, Math.min(NAV_ROWS.length - 1, row + delta));
      const curGroup = NAV_ROWS[row][col][0];
      let bestIdx = 0, bestDiff = Infinity;
      NAV_ROWS[targetRow].forEach(([g], i) => {
        const diff = Math.abs(g - curGroup);
        if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
      });
      return clampCell(targetRow, bestIdx);
    }
    case 'Home': return clampCell(row, 0);
    case 'End': return clampCell(row, NAV_ROWS[row].length - 1);
    default: return null;
  }
}
