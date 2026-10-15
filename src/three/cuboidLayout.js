export const CUBE_SIZE = 0.8;
export const CUBE_GAP = 0.16;
export const CUBE_STEP = CUBE_SIZE + CUBE_GAP;
export const MAX_PER_ROW = 5;

// Returns [{col, row}] offsets (in "camera right/up" units, multiplied by
// CUBE_STEP) for n isotope cubes: a single centered row for n <= 5, wrapping
// to a centered multi-row grid beyond that.
export function cubeSlots(n) {
  const perRow = n <= MAX_PER_ROW ? n : Math.ceil(n / Math.ceil(n / MAX_PER_ROW));
  const rows = Math.ceil(n / perRow);
  const slots = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow);
    const idxInRow = i % perRow;
    const rowCount = Math.min(perRow, n - row * perRow);
    const col = (idxInRow - (rowCount - 1) / 2) * CUBE_STEP;
    const rowOffset = ((rows - 1) / 2 - row) * CUBE_STEP;
    slots.push({ col, row: rowOffset });
  }
  return slots;
}
