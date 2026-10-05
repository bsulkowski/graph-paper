// Writes one A4 sheet of each grid to examples/, under the sheet's own name.
// Run: npm run examples

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { DEFAULTS, buildGrid, renderSheet, type Settings } from '../src/graph-paper.ts';

const sheets: Partial<Settings>[] = [
  { grid: 'square', area: 50, group: 6 },
  { grid: 'square', area: 25, group: 10 },
  { grid: 'rect', area: 50, group: 4 },
  { grid: 'tri', area: 25, group: 5 },
  { grid: 'hex', area: 50, group: 4 },
  { grid: 'polar', area: 100, group: 8, sectors: 12 },
];

const dir = new URL('../examples/', import.meta.url);
mkdirSync(dir, { recursive: true });
for (const f of readdirSync(dir)) if (f.endsWith('.svg')) rmSync(new URL(f, dir));
for (const s of sheets) {
  const settings: Settings = { ...DEFAULTS, ...s };
  const grid = buildGrid(settings);
  writeFileSync(new URL(`${grid.name}.svg`, dir), `<?xml version="1.0" encoding="UTF-8"?>\n${renderSheet(settings, grid)}\n`);
  console.log(grid.name);
}
