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
  AREAS, DEFAULTS, GRIDS, GROUPS, MARGINS, PAPERS, SECTORS, SECTORS_THIRD,
  buildGrid, groupFor, parseSettings, polarRings, renderSheet, sectorsFor, settingsQuery,
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

// Every coordinate of the drawing, from the path data: pairs after M and L, and arcs. A large
// arc is half of a circle around the centre (full polar grid): its four extremes are checked.
// A small arc (the ⅓ sector) is followed from its centre, found from the chord, in 32 steps.
function points(d: string): [number, number][] {
  const out: [number, number][] = [];
  let at: [number, number] = [0, 0];
  for (const part of d.match(/[MLA][^MLA]*/g) ?? []) {
    const n = part.slice(1).trim().split(/[\s,]+/).map(Number);
    if (part[0] === 'A') {
      const [r, , , large, , x, y] = n;
      if (large === 1) {
        out.push([x, y], [r, 0], [0, r], [-r, 0], [0, -r]);
      } else {
        const mx = (at[0] + x) / 2, my = (at[1] + y) / 2;
        const dx = x - at[0], dy = y - at[1], chord = Math.hypot(dx, dy);
        const h = Math.sqrt(Math.max(0, r * r - chord * chord / 4));
        // Sweep flag 1: the angle grows from start to end by less than half a turn.
        const centres: [number, number][] = [[mx - h * dy / chord, my + h * dx / chord], [mx + h * dy / chord, my - h * dx / chord]];
        const [cx, cy] = centres.find(([cx, cy]) => {
          const turn = Math.atan2(y - cy, x - cx) - Math.atan2(at[1] - cy, at[0] - cx);
          return ((turn % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) < Math.PI;
        })!;
        const t0 = Math.atan2(at[1] - cy, at[0] - cx);
        let t1 = Math.atan2(y - cy, x - cx);
        while (t1 < t0) t1 += 2 * Math.PI;
        for (let i = 0; i <= 32; i++) {
          const t = t0 + (t1 - t0) * i / 32;
          out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
        }
      }
      at = [x, y];
    } else {
      for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
      at = [n[n.length - 2], n[n.length - 1]];
    }
  }
  return out;
}

const papers = Object.keys(PAPERS) as Paper[];

const variants: { label: string; grid: GridType; extra: Partial<Settings> }[] = [
  ...GRIDS.map((grid) => ({ label: grid, grid, extra: {} })),
  { label: 'polar ⅓', grid: 'polar', extra: { part: 3, sectors: 4 } },
  { label: 'polar ⅓ (2 per arc)', grid: 'polar', extra: { part: 3, sectors: 2 } },
];

for (const { label: variant, grid, extra } of variants) {
  test(`${variant}: every area and larger cell stays within the margin`, () => {
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
      const s: Settings = { ...DEFAULTS, ...c, ...extra, grid };
      const g = buildGrid(s);
      const label = `${variant} ${s.paper}${s.landscape ? ' landscape' : ''}${s.turn ? ' turned' : ''} ${s.area.toFixed(1)} mm² /${s.group}`;
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

test('the ⅓ sector: name, edge along the page, three of them make the circle', () => {
  const third = sheet({ grid: 'polar', part: 3, sectors: 4, group: 8, area: area(100) });
  assert.equal(third.name, 'sector_grid_44x8x100mm2');
  assert.equal(third.cells, 44 * 8);
  // One straight edge is vertical: some major line has both ends at the same x.
  assert.ok(/M(-?[\d.]+) (-?[\d.]+)L\1 /.test(third.major), 'a vertical edge');
  // Zones and radii as on the full circle with three times as many larger cells, so three
  // sheets put together continue each other's lines.
  const full = sheet({ grid: 'polar', part: 1, sectors: 12, group: 8, area: area(100) });
  const n = Math.min(full.rings!.length, third.rings!.length) - 1;
  for (let i = 0; i < n; i++) {
    assert.equal(third.rings![i].sectors * 3, full.rings![i].sectors);
    assert.ok(Math.abs(third.rings![i].to - full.rings![i].to) < 1e-9);
  }
  // On landscape paper the straight edge turns horizontal.
  const wide = sheet({ grid: 'polar', part: 3, sectors: 4, group: 8, area: area(100), landscape: true });
  assert.ok(wide.extent[2] - wide.extent[0] > wide.extent[3] - wide.extent[1]);
});

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
    { ...DEFAULTS, grid: 'polar', part: 3, sectors: 4, group: 8, area: area(100) },
    { ...DEFAULTS, grid: 'polar', part: 3, sectors: 6, group: 16, landscape: true },
  ];
  for (const s of samples) assert.deepEqual(parseSettings(new URLSearchParams(settingsQuery(s))), s);
  // Areas are written rounded in the link and read back as the nearest step.
  for (const a of AREAS) assert.equal(parseSettings(new URLSearchParams(settingsQuery({ ...DEFAULTS, area: a }))).area, a);
});

test('the ⅓ sector in the link', () => {
  assert.equal(settingsQuery({ ...DEFAULTS, grid: 'polar', group: 8, part: 3, sectors: 4 }), 'grid=polar&part=3');
  // Links from before version 1.1 have no part: the whole circle, as before.
  const old = parseSettings(new URLSearchParams('grid=polar&sectors=10&group=12'));
  assert.equal(old.part, 1);
  assert.equal(old.sectors, 10);
  // A count offered only for the circle falls back to the default of the third.
  assert.equal(parseSettings(new URLSearchParams('grid=polar&part=3&sectors=12')).sectors, 4);
  // Switching keeps the spacing where it can: 12 around the circle = 4 along a third.
  assert.equal(sectorsFor(3, 12, 1), 4);
  assert.equal(sectorsFor(1, 2, 3), 6);
  assert.equal(sectorsFor(3, 10, 1), 4);
  for (const n of SECTORS_THIRD) assert.ok(sectorsFor(3, n, 3) === n);
  for (const n of SECTORS) assert.ok(sectorsFor(1, n, 1) === n);
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
