// Graph paper: geometry and link parameters.
//
// - Sheets of the older generator (hard-coded A4 sheets) that are still drawn the same:
//   same name, so the same count of larger cells; polar zones as hard-coded there.
// - Every grid, area and larger cell stays within the margin, on every paper.
// - Settings survive the trip through the link.
//
// Run: npm test.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AREAS, DEFAULTS, GRIDS, GROUPS, MARGINS, PAPERS, SECTORS,
  buildGrid, groupFor, parseSettings, polarRings, renderSheet, settingsQuery,
  type GridType, type Paper, type Settings,
} from '../src/graph-paper.ts';

const area = (a: number) => AREAS.reduce((b, x) => (Math.abs(Math.log(x / a)) < Math.abs(Math.log(b / a)) ? x : b));
const sheet = (s: Partial<Settings>) => buildGrid({ ...DEFAULTS, ...s });

test('the default sheet is the first sheet of the old generator', () => {
  assert.equal(buildGrid(DEFAULTS).name, 'square_grid_24x36x50mm2');
});

test('old A4 sheets that fill the page come out the same', () => {
  const same: [string, Partial<Settings>][] = [
    ['square_grid_24x36x50mm2', { grid: 'square', area: area(50), group: 6 }],
    ['square_grid_54x36x25mm2', { grid: 'square', area: area(25), group: 6 }],
    ['square_grid_40x25x50mm2', { grid: 'square', area: area(50), group: 5 }],
    ['rectangular_grid_64x16x50mm2', { grid: 'rect', area: area(50), group: 4 }],
    ['polar_grid_36x8x100mm2', { grid: 'polar', area: area(100), group: 8, sectors: 12 }],
    ['polar_grid_50x12x50mm2', { grid: 'polar', area: area(50), group: 12, sectors: 10 }],
    ['polar_grid_32x16x50mm2', { grid: 'polar', area: area(50), group: 16, sectors: 8 }],
    ['hexagonal_grid_24x16x100mm2', { grid: 'hex', area: area(100), group: 4 }],
  ];
  for (const [name, s] of same) assert.equal(sheet(s).name, name);
});

test('polar zones of the old sheets', () => {
  const zones = (M: number, g: number, J: number) => {
    const out: string[] = [];
    for (const r of polarRings(M, g, J)) {
      const last = out[out.length - 1];
      if (last?.endsWith(`:${r.sectors}`)) out[out.length - 1] = last.replace(/-\d+:/, `-${r.to}:`);
      else out.push(`${r.from}-${r.to}:${r.sectors}`);
    }
    return out.join(' ');
  };
  // Older generator: rings 0–2, 1–4, 2–6 in units of 12, 24, 48 cells (radius² in cells × area / π).
  assert.equal(zones(12, 8, 3), '0-24:12 24-96:24 96-288:48');
  // Older generator: 0–2 × 10, 1–3 × 20, 2–4 × 30, 3–6 × 40, 4–10 × 60.
  assert.equal(zones(10, 12, 5), '0-20:10 20-60:20 60-120:30 120-240:40 240-600:60');
});

test('polar rings: whole larger rings, larger spokes on small ones', () => {
  for (const M of SECTORS) {
    for (const g of GROUPS.polar) {
      const rings = polarRings(M, g, 3);
      let B = 0;
      for (const r of rings) {
        assert.equal(r.from, B);
        assert.equal(r.sectors % M, 0, `${M}/${g}: sectors a multiple of ${M}`);
        assert.equal((M * g) % r.sectors, 0, `${M}/${g}: sectors divide a larger ring`);
        B = r.to;
      }
      assert.equal(B, 3 * M * g);
    }
  }
});

// Every coordinate of the drawing, from the path data: pairs after M and L, end points of arcs
// (circles around the centre, so their radius is checked too).
function points(d: string): [number, number][] {
  const out: [number, number][] = [];
  for (const part of d.match(/[MLA][^MLA]*/g) ?? []) {
    const n = part.slice(1).trim().split(/[\s,]+/).map(Number);
    if (part[0] === 'A') {
      out.push([n[5], n[6]], [n[0], 0], [0, n[1]], [-n[0], 0], [0, -n[1]]);
    } else {
      for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
    }
  }
  return out;
}

const papers = Object.keys(PAPERS) as Paper[];

for (const grid of GRIDS) {
  test(`${grid}: every area and larger cell stays within the margin`, () => {
    const cases: Partial<Settings>[] = [];
    for (const a of AREAS) for (const group of GROUPS[grid]) cases.push({ area: a, group });
    // Paper, orientation, direction and margin on a few sizes; small cells on large paper are slow.
    for (const paper of papers) {
      for (const landscape of [false, true]) {
        for (const turn of [false, true]) {
          cases.push({ paper, landscape, turn, area: area(50), group: GROUPS[grid][1], margin: MARGINS[landscape ? 1 : 0] });
          cases.push({ paper, landscape, turn, area: area(200), group: GROUPS[grid][2] });
        }
      }
    }
    for (const c of cases) {
      const s: Settings = { ...DEFAULTS, ...c, grid };
      const g = buildGrid(s);
      const label = `${grid} ${s.paper}${s.landscape ? ' landscape' : ''}${s.turn ? ' turned' : ''} ${s.area.toFixed(1)} mm² /${s.group}`;
      if (!g.fits) {
        assert.equal(g.minor + g.major, '', label);
        continue;
      }
      assert.ok(g.majors > 0 && g.cells >= g.majors, label);
      const hw = g.width / 2 - s.margin + 1e-3, hh = g.height / 2 - s.margin + 1e-3;
      for (const [x, y] of points(g.minor + g.major)) {
        assert.ok(Math.abs(x) <= hw && Math.abs(y) <= hh, `${label}: (${x}, ${y}) outside ±${hw}, ±${hh}`);
      }
    }
  });
}

test('small cells fill whole larger ones (square, rect, tri)', () => {
  for (const grid of ['square', 'rect', 'tri'] as GridType[]) {
    for (const group of GROUPS[grid]) {
      const g = sheet({ grid, group, area: area(25) });
      assert.equal(g.cells, g.majors * group * group, `${grid}/${group}`);
    }
  }
});

test('too large a cell gives no grid, not an error', () => {
  const g = sheet({ grid: 'hex', area: AREAS[AREAS.length - 1], group: 5, paper: 'a5' });
  assert.equal(g.fits, false);
  assert.ok(renderSheet({ ...DEFAULTS, grid: 'hex', area: AREAS[AREAS.length - 1], group: 5, paper: 'a5' }).startsWith('<svg'));
});

test('settings survive the link', () => {
  assert.equal(settingsQuery(DEFAULTS), '');
  const samples: Settings[] = [
    { ...DEFAULTS, grid: 'hex', area: area(12.5), group: 3, turn: true, paper: 'a3', landscape: true, ink: 'green', margin: 15, caption: false },
    { ...DEFAULTS, grid: 'polar', area: area(35), group: 12, sectors: 10, ink: 'blue' },
    { ...DEFAULTS, grid: 'tri', area: area(6.25), group: 1, paper: 'letter' },
    { ...DEFAULTS, grid: 'rect', area: area(800), group: 2, turn: true },
  ];
  for (const s of samples) assert.deepEqual(parseSettings(new URLSearchParams(settingsQuery(s))), s);
  // Areas are written rounded in the link and read back as the nearest step.
  for (const a of AREAS) assert.equal(parseSettings(new URLSearchParams(settingsQuery({ ...DEFAULTS, area: a }))).area, a);
});

test('unknown link parameters fall back to defaults', () => {
  const s = parseSettings(new URLSearchParams('grid=spiral&area=-3&group=7&paper=b5&ink=red&margin=3'));
  assert.deepEqual(s, DEFAULTS);
  assert.equal(parseSettings(new URLSearchParams('grid=tri&group=6')).group, 6);
  assert.equal(parseSettings(new URLSearchParams('grid=hex&group=6')).group, groupFor('hex', 6));
});

test('switching grids keeps k × k, but not into or out of polar', () => {
  assert.equal(groupFor('tri', 4, 'square'), 4);
  assert.equal(groupFor('hex', 6, 'square'), groupFor('hex', 0));
  assert.equal(groupFor('polar', 4, 'hex'), 8);
  assert.equal(groupFor('square', 8, 'polar'), groupFor('square', 0));
});
