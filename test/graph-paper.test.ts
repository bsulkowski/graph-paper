// Graph paper: geometry and link parameters.
//
// - Sheets of the older generator (hard-coded A4 sheets) that are still drawn the same:
//   same name, so the same count of larger cells.
// - The polar grid: rings of near-square larger cells, counts from the allowed set.
// - Every grid, area and larger cell stays within the margin, on every paper.
// - Settings survive the trip through the link.
//
// Run: npm test.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AREAS, DEFAULTS, GRIDS, GROUPS, MARGINS, PAPERS, PARTS,
  buildGrid, groupFor, inkColors, parseSettings, polarRings, renderSheet, settingsQuery,
  type GridType, type Paper, type Settings,
} from '../src/graph-paper.ts';

const area = (a: number) => AREAS.reduce((b, x) => (Math.abs(Math.log(x / a)) < Math.abs(Math.log(b / a)) ? x : b));
const sheet = (s: Partial<Settings>) => buildGrid({ ...DEFAULTS, ...s });

test('cell areas are Human Scale Numbers from 1 mm² to 10 cm²', () => {
  assert.equal(AREAS.length, 31);
  assert.deepEqual(AREAS.slice(0, 11), [1, 1.25, 1.6, 2, 2.5, 3.2, 4, 5, 6.4, 8, 10]);
  assert.equal(AREAS[AREAS.length - 1], 1000);
  for (let i = 3; i < AREAS.length; i++) {
    // Every third step doubles (6.4 → 12.5 is HSN's one rounding).
    assert.ok(Math.abs(AREAS[i] / AREAS[i - 3] - 2) < 0.05, `${AREAS[i - 3]} → ${AREAS[i]}`);
  }
  for (const v of [25, 50, 100]) assert.ok(AREAS.includes(v));
  // An area from an older link is read as the nearest value.
  assert.equal(parseSettings(new URLSearchParams('area=35')).area, 32);
  assert.equal(parseSettings(new URLSearchParams('area=6.25')).area, 6.4);
  assert.equal(parseSettings(new URLSearchParams('area=800')).area, 800);
});

test('the default sheet is the first sheet of the old generator', () => {
  assert.equal(buildGrid(DEFAULTS).name, 'square_grid_24x36x50mm2');
});

test('old A4 sheets that fill the page come out the same', () => {
  const same: [string, Partial<Settings>][] = [
    ['square_grid_24x36x50mm2', { grid: 'square', area: area(50), group: 6 }],
    ['square_grid_54x36x25mm2', { grid: 'square', area: area(25), group: 6 }],
    ['square_grid_40x25x50mm2', { grid: 'square', area: area(50), group: 5 }],
    ['rectangular_grid_64x16x50mm2', { grid: 'rect', area: area(50), group: 4 }],
    ['hexagonal_grid_24x16x100mm2', { grid: 'hex', area: area(100), group: 4 }],
  ];
  for (const [name, s] of same) assert.equal(sheet(s).name, name);
});

const ALLOWED = new Set([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30, 40, 60]);
const allowed = (n: number) => ALLOWED.has(n) || (n >= 60 && n % 30 === 0);

test('polar rings: the same sequence at every size, squarest allowed counts', () => {
  assert.equal(polarRings(1, 12).rings.map((r) => r.sectors).join(' '), '6 12 20 24 30 40 40 60 60 60 60 90');
  for (const part of PARTS) {
    const span = 2 * Math.PI / part;
    const { centre, rings } = polarRings(part, 60);
    // The centre field and every larger cell have the same area (1 in these units).
    assert.ok(Math.abs(span / 2 * centre ** 2 - 1) < 1e-9);
    let r = centre;
    for (const ring of rings) {
      assert.ok(allowed(ring.sectors), `${part}: ${ring.sectors} is not allowed`);
      assert.ok(Math.abs(ring.from - r) < 1e-12);
      assert.ok(Math.abs(span / 2 * (ring.to ** 2 - ring.from ** 2) - ring.sectors) < 1e-9);
      // Depth : width stays near square; the jumps 40 → 60 → 90 cost the most.
      const q = (ring.to - ring.from) / (span * (ring.from + ring.to) / 2 / ring.sectors);
      assert.ok(q > 0.66 && q < 1.5, `${part}: ring of ${ring.sectors} at ${ring.from.toFixed(1)} is ${q.toFixed(2)}`);
      r = ring.to;
    }
  }
  // On a sheet: the same sequence (rings in mm), each larger cell k² cells of the chosen area.
  for (const [a, k, part] of [[50, 3, 1], [8, 5, 2], [25, 4, 3], [4, 2, 4]]) {
    const g = sheet({ grid: 'polar', area: area(a), group: k, part });
    const seq = polarRings(part, g.rings!.length).rings;
    const span = 2 * Math.PI / part;
    g.rings!.forEach((ring, i) => {
      assert.equal(ring.sectors, seq[i].sectors);
      assert.ok(Math.abs(span / 2 * (ring.to ** 2 - ring.from ** 2) / ring.sectors - k * k * area(a)) < 1e-6);
    });
    assert.equal(g.cells, g.majors * k * k);
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
  { label: 'polar ½', grid: 'polar', extra: { part: 2 } },
  { label: 'polar ⅓', grid: 'polar', extra: { part: 3 } },
  { label: 'polar ¼', grid: 'polar', extra: { part: 4 } },
];

for (const { label: variant, grid, extra } of variants) {
  test(`${variant}: every area and larger cell stays within the margin`, () => {
    const cases: Partial<Settings>[] = [];
    // Every area with a few larger cells, every larger cell with a few areas (all of both is slow).
    const groups = GROUPS[grid];
    const someGroups = [groups[0], groups[Math.floor(groups.length / 2)], groups[groups.length - 1]];
    for (const a of AREAS) for (const group of someGroups) cases.push({ area: a, group });
    for (const group of groups) for (const a of [4, 32, 250]) cases.push({ area: a, group });
    // Paper, orientation and margin on a few sizes; small cells on large paper are slow.
    for (const paper of papers) {
      for (const landscape of [false, true]) {
        cases.push({ paper, landscape, area: area(50), group: groups[1], margin: MARGINS[landscape ? 1 : 0] });
        cases.push({ paper, landscape, area: area(200), group: groups[2] });
      }
    }
    for (const c of cases) {
      const s: Settings = { ...DEFAULTS, ...c, ...extra, grid };
      const g = buildGrid(s);
      const label = `${variant} ${s.paper}${s.landscape ? ' landscape' : ''} ${s.area.toFixed(1)} mm² /${s.group}`;
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

test('parts of the circle: names, straight edges along the page', () => {
  const names = PARTS.map((part) => sheet({ grid: 'polar', part, group: 3, area: area(50) }).name.split('_')[0]);
  assert.deepEqual(names, ['polar', 'semicircle', 'sector', 'quadrant']);
  const vertical = (d: string) => /M(-?[\d.]+) (-?[\d.]+)L\1 /.test(d);
  const horizontal = (d: string) => /M(-?[\d.]+) (-?[\d.]+)L(-?[\d.]+) \2(?![\d.])/.test(d);
  for (const part of [2, 3]) {
    // Portrait: the straight edge on the long side, so vertical; landscape: horizontal.
    assert.ok(vertical(sheet({ grid: 'polar', part, group: 3, area: area(50) }).major), `${part} portrait`);
    assert.ok(horizontal(sheet({ grid: 'polar', part, group: 3, area: area(50), landscape: true }).major), `${part} landscape`);
  }
  const q = sheet({ grid: 'polar', part: 4, group: 3, area: area(50) }).major;
  assert.ok(vertical(q) && horizontal(q), 'a quarter has both');
  // The circle: the centre field is the only cell at the centre of the page, rings around it.
  const full = sheet({ grid: 'polar', group: 3, area: area(50) });
  assert.equal(full.rings![0].sectors, 6);
  assert.ok(full.majors > 1 + 6 + 12 + 20);
});

test('too small a page for the centre field gives no polar grid', () => {
  const g = sheet({ grid: 'polar', area: 1000, group: 10 });
  assert.equal(g.fits, false);
  assert.equal(g.majors, 0);
});

test('kagome: hexagons with triangles, whole larger cells, no three lines in a point', () => {
  const g = sheet({ grid: 'kagome', area: area(50), group: 3 });
  assert.equal(g.name, 'kagome_grid_78x9x50mm2');
  // The hexagon has the area of the setting, as in the hexagonal grid.
  assert.ok(Math.abs(3 * Math.sqrt(3) / 2 * g.cell.a ** 2 - area(50)) < 1e-9);
  const parse = (d: string) => d.match(/M[^M]+/g)!.map((m) => m.slice(1).split(/[ L]/).map(Number));
  const minor = parse(g.minor), major = parse(g.major);
  // Whole larger cells: every thin line ends on a dark one (the outline or a line inside).
  const onSeg = (x: number, y: number, [ax, ay, bx, by]: number[]) => {
    const t = ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2);
    return t > -1e-6 && t < 1 + 1e-6 && Math.hypot(ax + t * (bx - ax) - x, ay + t * (by - ay) - y) < 1e-3;
  };
  for (const [x1, y1, x2, y2] of minor) {
    for (const [x, y] of [[x1, y1], [x2, y2]]) assert.ok(major.some((m) => onSeg(x, y, m)), `thin line ends off the outline at ${x},${y}`);
  }
  // No three lines meet in a point (that would be the triangular grid).
  const segs = minor.concat(major);
  const meet = new Map<string, number>();
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const [ax, ay, bx, by] = segs[i], [cx, cy, dx, dy] = segs[j];
      const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
      if (Math.abs(den) < 1e-9) continue;
      const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den;
      const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
      if (t < 1e-9 || t > 1 - 1e-9 || u < 1e-9 || u > 1 - 1e-9) continue;
      const key = `${Math.round((ax + t * (bx - ax)) * 100)},${Math.round((ay + t * (by - ay)) * 100)}`;
      meet.set(key, (meet.get(key) ?? 0) + 1);
    }
  }
  assert.ok(meet.size > 100);
  for (const [at, pairs] of meet) assert.equal(pairs, 1, `more than two lines meet at ${at}`);
  // No sharp teeth: a corner of the outline where exactly two dark lines end, with no other dark
  // line through it, is a corner of the outline; at a lone large triangle it would be 60°.
  const ends = new Map<string, { x: number; y: number; dirs: number[] }>();
  for (const [x1, y1, x2, y2] of major) {
    for (const [x, y, ox, oy] of [[x1, y1, x2, y2], [x2, y2, x1, y1]]) {
      const id = `${Math.round(x * 20)},${Math.round(y * 20)}`;
      const e = ends.get(id) ?? { x, y, dirs: [] };
      e.dirs.push(Math.atan2(oy - y, ox - x));
      ends.set(id, e);
    }
  }
  let corners = 0;
  for (const { x, y, dirs } of ends.values()) {
    if (dirs.length !== 2 || major.some((m) => onSeg(x, y, m) && !(Math.hypot(m[0] - x, m[1] - y) < 1e-2 || Math.hypot(m[2] - x, m[3] - y) < 1e-2))) continue;
    corners++;
    const angle = Math.abs(((dirs[0] - dirs[1] + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    assert.ok(Math.abs(angle - Math.PI / 3) > 1e-3, `a sharp 60° tooth at ${x}, ${y}`);
  }
  assert.ok(corners > 4);
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
    { ...DEFAULTS, grid: 'hex', area: area(12.5), group: 3, paper: 'a3', landscape: true, ink: 'green', margin: 15, caption: false },
    { ...DEFAULTS, grid: 'polar', area: area(35), group: 5, ink: 'blue' },
    { ...DEFAULTS, grid: 'tri', area: area(6.25), group: 1, paper: 'letter' },
    { ...DEFAULTS, grid: 'rect', area: area(800), group: 2, ink: '1f3a7a' },
    { ...DEFAULTS, grid: 'polar', part: 3, group: 8, area: area(100) },
    { ...DEFAULTS, grid: 'polar', part: 2, group: 1, landscape: true },
    { ...DEFAULTS, grid: 'polar', part: 4, group: 10, area: area(2) },
    { ...DEFAULTS, grid: 'kagome', area: area(25), group: 7, paper: 'a3' },
  ];
  for (const s of samples) assert.deepEqual(parseSettings(new URLSearchParams(settingsQuery(s))), s);
  // Areas are written rounded in the link and read back as the nearest step.
  for (const a of AREAS) assert.equal(parseSettings(new URLSearchParams(settingsQuery({ ...DEFAULTS, area: a }))).area, a);
});

test('parts of the circle in the link', () => {
  assert.equal(settingsQuery({ ...DEFAULTS, grid: 'polar', group: 3, part: 3 }), 'grid=polar&part=3');
  assert.equal(settingsQuery({ ...DEFAULTS, grid: 'polar', group: 3, part: 1 }), 'grid=polar');
  // No part: the whole circle; an unknown one too.
  assert.equal(parseSettings(new URLSearchParams('grid=polar')).part, 1);
  assert.equal(parseSettings(new URLSearchParams('grid=polar&part=5')).part, 1);
  // Links before 1.5: `sectors` is gone (the grid chooses), the group means k now.
  const old = parseSettings(new URLSearchParams('grid=polar&sectors=10&group=8'));
  assert.deepEqual(old, { ...DEFAULTS, grid: 'polar', group: 8 });
  assert.equal(parseSettings(new URLSearchParams('grid=polar&group=12')).group, groupFor('polar', 0));
});

test('links from before 1.4: a turned grid becomes turned paper', () => {
  assert.equal(parseSettings(new URLSearchParams('grid=tri&turn=1')).landscape, true);
  assert.equal(parseSettings(new URLSearchParams('grid=tri&turn=1&landscape=1')).landscape, false);
});

test('a colour of ones own: minor lines half-way to white', () => {
  assert.deepEqual(inkColors('1f3a7a'), { major: '#1f3a7a', minor: '#8f9dbd' });
  assert.equal(parseSettings(new URLSearchParams('ink=%231F3A7A')).ink, '1f3a7a');
  assert.equal(parseSettings(new URLSearchParams('ink=red')).ink, DEFAULTS.ink);
  assert.ok(renderSheet({ ...DEFAULTS, ink: 'c0ffee' }).includes('stroke="#c0ffee"'));
});

test('triangles: no larger triangle held by one side only', () => {
  for (const landscape of [false, true]) {
    for (const group of [1, 3, 5]) {
      const g = sheet({ grid: 'tri', area: area(50), group, landscape });
      // Cells per larger one stay whole; the count drops a little against an unpruned sheet.
      assert.equal(g.cells, g.majors * group * group);
    }
  }
});

test('unknown link parameters fall back to defaults', () => {
  const s = parseSettings(new URLSearchParams('grid=spiral&area=-3&group=11&paper=b5&ink=red&margin=3'));
  assert.deepEqual(s, DEFAULTS);
  assert.equal(parseSettings(new URLSearchParams('grid=tri&group=6')).group, 6);
  assert.equal(parseSettings(new URLSearchParams('grid=kagome&group=6')).group, groupFor('kagome', 6));
});

test('switching grids keeps k where the grid offers it (kagome: odd k)', () => {
  assert.equal(groupFor('kagome', 3), 3);
  assert.equal(groupFor('kagome', 6), 3);
  assert.equal(groupFor('kagome', 1), 1);
  assert.equal(groupFor('tri', 4), 4);
  assert.equal(groupFor('hex', 6), 6);
  assert.equal(groupFor('polar', 4), 4);
  assert.equal(groupFor('square', 10), 10);
});
