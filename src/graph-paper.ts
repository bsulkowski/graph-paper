// Graph paper: grids of equal-area cells drawn as an SVG sheet ready to print.
// Pure functions with no DOM access: the same code runs in Node (tests, a static site build)
// and in the browser (the generator at bsulkowski.pl/graph-paper).
//
// Successor of an older generator that produced 17 A4 sheets with hard-coded sizes. Kept from it:
// cells measured by area, a larger cell grouping several small ones, the polar grid of equal-area
// rings, line colours and widths, the caption with the sheet name. New: every size is computed
// for the chosen paper, the grid fills the page in whole larger cells.

export type Lang = 'en' | 'pl';

// Shown discreetly under the sheet. The link parameters (see parseSettings) are the promise:
// an old link keeps meaning the same grid; the drawing details may improve.
export const TOOL_VERSION = '1.5';

export type GridType = 'square' | 'rect' | 'tri' | 'hex' | 'kagome' | 'polar';
export type Paper = 'a4' | 'a5' | 'a3' | 'letter';
export type Preset = 'grey' | 'blue' | 'green' | 'sepia';
export type Ink = Preset | string;  // a preset, or a colour of one's own as six hex digits (1f3a7a)

export interface Settings {
  grid: GridType;
  area: number;      // mm² of one small cell, a value of AREAS
  group: number;     // larger cell: k × k small cells (kagome: every k-th line)
  part: number;      // polar: 1 = the whole circle, 2, 3, 4 = its half, third, quarter
  paper: Paper;
  landscape: boolean;
  margin: number;    // mm, on every side; the caption sits inside the bottom margin
  ink: Ink;
  caption: boolean;
}

export const GRIDS: GridType[] = ['square', 'rect', 'tri', 'hex', 'kagome', 'polar'];

// Cell areas follow Human Scale Numbers (github.com/bsulkowski/human-scale-numbers):
// 1, 1.25, 1.6, 2, 2.5, 3.2, 4, 5, 6.4, 8, 10, … — every third step doubles, every tenth is ×10.
// From 1 mm² (millimetre paper) to 1000 mm² (10 cm²); 25 mm² is the 5 mm square, 100 mm² the 1 cm one.
const HSN = [1, 1.25, 1.6, 2, 2.5, 3.2, 4, 5, 6.4, 8];
export const AREAS: number[] = [1, 10, 100].flatMap((m) => HSN.map((v) => Number((v * m).toPrecision(4)))).concat(1000);

// The larger cell: how many times its side is the small one's.
const UP_TO_10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const GROUPS: Record<GridType, number[]> = {
  square: UP_TO_10,
  rect: UP_TO_10,
  tri: UP_TO_10,
  hex: UP_TO_10,
  kagome: [1, 3, 5, 7, 9],
  polar: UP_TO_10,
};
// The polar grid on the whole circle, or on its half, third or quarter.
export const PARTS = [1, 2, 3, 4];

export const PAPERS: Record<Paper, { label: string; width: number; height: number }> = {
  a4: { label: 'A4', width: 210, height: 297 },
  a5: { label: 'A5', width: 148, height: 210 },
  a3: { label: 'A3', width: 297, height: 420 },
  letter: { label: 'Letter', width: 215.9, height: 279.4 },
};
export const MARGINS = [7, 10, 15, 20];

// Minor and major line colours; grey is the one of the old sheets.
export const INKS: Record<Preset, { minor: string; major: string }> = {
  grey: { minor: '#bbbbbb', major: '#777777' },
  blue: { minor: '#a3b6de', major: '#4d6aae' },
  green: { minor: '#a9d0b0', major: '#4f8c5d' },
  sepia: { minor: '#d8c3a8', major: '#8b5e3c' },
};

/** Major and minor colours: a preset's pair, or one's own colour with the minor lines half-way to white. */
export function inkColors(ink: Ink): { minor: string; major: string } {
  if (ink in INKS) return INKS[ink as Preset];
  const c = /^[0-9a-f]{6}$/i.test(ink) ? ink.toLowerCase() : '777777';
  const minor = [0, 2, 4].map((i) => Math.round((parseInt(c.slice(i, i + 2), 16) + 255) / 2).toString(16).padStart(2, '0')).join('');
  return { minor: `#${minor}`, major: `#${c}` };
}

const GROUP_DEFAULT: Record<GridType, number> = { square: 6, rect: 4, tri: 5, hex: 4, kagome: 3, polar: 3 };

export const DEFAULTS: Settings = {
  grid: 'square',
  area: 50,
  group: 6,
  part: 1,
  paper: 'a4',
  landscape: false,
  margin: 7,
  ink: 'grey',
  caption: true,
};

export const SITE_URL = 'bsulkowski.pl/graph-paper';

// ---------------------------------------------------------------------------------------------
// Settings ⇄ link parameters

const nearest = (list: number[], v: number, log = false) =>
  list.reduce((best, x) => (Math.abs(log ? Math.log(x / v) : x - v) < Math.abs(log ? Math.log(best / v) : best - v) ? x : best));

/** The larger cell to use when switching grids: k carries over if that grid offers it (kagome: odd k). */
export function groupFor(grid: GridType, group: number): number {
  return GROUPS[grid].includes(group) ? group : GROUP_DEFAULT[grid];
}

/** Reads settings from link parameters; anything missing or unknown falls back to the default. */
export function parseSettings(params: URLSearchParams): Settings {
  const s: Settings = { ...DEFAULTS };
  const grid = params.get('grid');
  if (grid && (GRIDS as string[]).includes(grid)) s.grid = grid as GridType;
  const num = (key: string) => {
    const v = Number(params.get(key));
    return params.has(key) && Number.isFinite(v) && v > 0 ? v : null;
  };
  const area = num('area');
  if (area !== null) s.area = nearest(AREAS, area, true);
  const group = num('group');
  s.group = group !== null && GROUPS[s.grid].includes(group) ? group : GROUP_DEFAULT[s.grid];
  // Polar links before 1.5 also had `sectors` (larger cells in a ring), now chosen by the grid.
  const part = num('part');
  s.part = part !== null && PARTS.includes(part) ? part : 1;
  const paper = params.get('paper');
  if (paper && paper in PAPERS) s.paper = paper as Paper;
  const margin = num('margin');
  if (margin !== null && MARGINS.includes(margin)) s.margin = margin;
  const ink = params.get('ink')?.replace(/^#/, '');
  if (ink && (ink in INKS || /^[0-9a-f]{6}$/i.test(ink))) s.ink = ink.toLowerCase();
  // Before 1.4 a grid could be turned on the page; turning the page instead draws the same.
  s.landscape = (params.get('landscape') === '1') !== (params.get('turn') === '1');
  s.caption = params.get('caption') !== '0';
  return s;
}

/** Link parameters for the settings; defaults are left out, so the default sheet has a bare link. */
export function settingsQuery(s: Settings): string {
  const p = new URLSearchParams();
  if (s.grid !== DEFAULTS.grid) p.set('grid', s.grid);
  if (s.area !== DEFAULTS.area) p.set('area', areaLabel(s.area));
  if (s.group !== GROUP_DEFAULT[s.grid]) p.set('group', String(s.group));
  if (s.grid === 'polar' && s.part !== 1) p.set('part', String(s.part));
  if (s.paper !== DEFAULTS.paper) p.set('paper', s.paper);
  if (s.landscape) p.set('landscape', '1');
  if (s.margin !== DEFAULTS.margin) p.set('margin', String(s.margin));
  if (s.ink !== DEFAULTS.ink) p.set('ink', s.ink);
  if (!s.caption) p.set('caption', '0');
  return p.toString();
}


/** Area as written in the sheet name and the link: whole mm², or two digits below 10 (6.3, 8.8). */
export function areaLabel(area: number): string {
  return String(Number(area.toPrecision(4)));
}

// ---------------------------------------------------------------------------------------------
// Geometry

type Seg = [number, number, number, number];

export interface Grid {
  width: number;           // paper, mm
  height: number;
  minor: string;           // SVG path data, small cells
  major: string;           // SVG path data, larger cells
  name: string;            // as in the old generator: <grid>_grid_<majors>x<cells per major>x<area>mm2
  majors: number;          // larger cells on the sheet
  cells: number;           // small cells on the sheet
  perMajor: number;
  cell: { a: number; b?: number };  // see cellSides
  rings?: { from: number; to: number; sectors: number }[];  // polar rings drawn (some may be partial), radii in mm
  extent: [number, number, number, number];  // bbox of all lines: x0, y0, x1, y1
  fits: boolean;           // false: not even one larger cell fits on the paper
}

const EPS = 1e-6;
const SQRT3 = Math.sqrt(3);
const mod = (a: number, k: number) => ((a % k) + k) % k;

function fmt(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
}

function segPath(segs: Seg[]): string {
  return segs.map(([x1, y1, x2, y2]) => `M${fmt(x1)} ${fmt(y1)}L${fmt(x2)} ${fmt(y2)}`).join('');
}

function polyPath(lines: number[][]): string {
  return lines.map((pts) => {
    let d = `M${fmt(pts[0])} ${fmt(pts[1])}L`;
    for (let i = 2; i < pts.length; i += 2) d += `${i > 2 ? ' ' : ''}${fmt(pts[i])} ${fmt(pts[i + 1])}`;
    return d;
  }).join('');
}

// A number naming a point to 0.001 mm (coordinates stay well within ±500 mm).
const pointKey = (x: number, y: number) => (Math.round(x * 1e3) + 5e5) * 1e6 + Math.round(y * 1e3) + 5e5;
const cellKey = (p: number, q: number) => (p + 1e5) * 1e6 + q + 1e5;

// Joins segments sharing an end into polylines, so a honeycomb is a few zigzags, not thousands of pieces.
function chain(segs: Seg[]): number[][] {
  const key = pointKey;
  const at = new Map<number, number[]>();
  segs.forEach(([x1, y1, x2, y2], i) => {
    for (const k of [key(x1, y1), key(x2, y2)]) {
      const list = at.get(k);
      if (list) list.push(i); else at.set(k, [i]);
    }
  });
  const used = new Uint8Array(segs.length);
  const extend = (x: number, y: number, push: (x: number, y: number) => void) => {
    for (;;) {
      const next = (at.get(key(x, y)) ?? []).find((i) => !used[i]);
      if (next === undefined) return;
      used[next] = 1;
      const [x1, y1, x2, y2] = segs[next];
      const forward = key(x1, y1) === key(x, y);
      [x, y] = forward ? [x2, y2] : [x1, y1];
      push(x, y);
    }
  };
  const lines: number[][] = [];
  segs.forEach(([x1, y1, x2, y2], i) => {
    if (used[i]) return;
    used[i] = 1;
    const ahead = [x1, y1, x2, y2];
    const behind: number[] = [];
    extend(x2, y2, (x, y) => ahead.push(x, y));
    extend(x1, y1, (x, y) => behind.push(y, x));
    lines.push(behind.reverse().concat(ahead));
  });
  return lines;
}

// Runs of consecutive integer positions on one lattice line: [first, last] inclusive.
function runs(positions: Set<number>): [number, number][] {
  const sorted = [...positions].sort((a, b) => a - b);
  const out: [number, number][] = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    if (last && p === last[1] + 1) last[1] = p; else out.push([p, p]);
  }
  return out;
}

interface Box { hw: number; hh: number }  // half-width and half-height of the area for the grid

interface Raw {
  minor: Seg[] | number[][];
  major: Seg[] | number[][];
  chained?: boolean;
  majors: number;
  cells: number;
  perMajor: number;
}

function squareLike(box: Box, w: number, h: number, k: number): Raw | null {
  const cols = Math.floor((2 * box.hw + EPS) / (k * w));
  const rows = Math.floor((2 * box.hh + EPS) / (k * h));
  if (cols < 1 || rows < 1) return null;
  const nx = cols * k, ny = rows * k;
  const x0 = -nx * w / 2, y0 = -ny * h / 2;
  const minor: Seg[] = [], major: Seg[] = [];
  for (let i = 0; i <= nx; i++) {
    const x = x0 + i * w;
    (k > 1 && i % k === 0 ? major : minor).push([x, y0, x, -y0]);
  }
  for (let j = 0; j <= ny; j++) {
    const y = y0 + j * h;
    (k > 1 && j % k === 0 ? major : minor).push([x0, y, -x0, y]);
  }
  return { minor, major, majors: cols * rows, cells: nx * ny, perMajor: k * k };
}

// Tries placements of the larger-cell lattice on the page and keeps the one fitting the most cells.
function bestPlacement<T>(steps: number, count: (u: number, v: number) => { n: number; keep: T }): T | null {
  let best: { n: number; keep: T } | null = null;
  for (let a = 0; a < steps; a++) {
    for (let b = 0; b < steps; b++) {
      const r = count(a / steps, b / steps);
      if (r.n > 0 && (!best || r.n > best.n)) best = r;
    }
  }
  return best ? best.keep : null;
}

// Larger triangles held to the rest by one side only stick out as sharp teeth: drop them,
// again until none is left (dropping one can expose another). Up (I, J) shares its sides with
// down (I, J−1), (I−1, J) and (I, J); down (I, J) with up (I, J), (I+1, J) and (I, J+1).
function pruneTriangles(list: [number, number, 0 | 1][]): [number, number, 0 | 1][] {
  const key = (I: number, J: number, kind: number) => `${I},${J},${kind}`;
  const kept = new Set(list.map(([I, J, kind]) => key(I, J, kind)));
  const sides = ([I, J, kind]: [number, number, 0 | 1]) => (kind === 0
    ? [key(I, J - 1, 1), key(I - 1, J, 1), key(I, J, 1)]
    : [key(I, J, 0), key(I + 1, J, 0), key(I, J + 1, 0)]);
  for (let changed = true; changed;) {
    changed = false;
    for (const t of list) {
      const id = key(...t);
      if (kept.has(id) && sides(t).filter((n) => kept.has(n)).length < 2) {
        kept.delete(id);
        changed = true;
      }
    }
  }
  return list.filter((t) => kept.has(key(...t)));
}

// Triangles with vertical lines (the old sheets); vertex (i, j) of the small lattice is at
// x = j·h, y = i·s + j·s/2. Three line families: j = const (vertical), i = const, i + j = const.
function triangular(box: Box, area: number, k: number): Raw | null {
  const s = 2 * Math.sqrt(area / SQRT3);
  const h = s * SQRT3 / 2;
  const v = (i: number, j: number, ox: number, oy: number): [number, number] => [j * h + ox, i * s + j * s / 2 + oy];
  const inside = (p: [number, number]) => Math.abs(p[0]) <= box.hw + EPS && Math.abs(p[1]) <= box.hh + EPS;

  // Larger triangles: up (I, J) = V(I,J) V(I+1,J) V(I,J+1); down = V(I+1,J) V(I+1,J+1) V(I,J+1).
  const majors = (ox: number, oy: number) => {
    const out: [number, number, 0 | 1][] = [];
    const J0 = Math.floor((-box.hw - ox) / (k * h)) - 1, J1 = Math.ceil((box.hw - ox) / (k * h)) + 1;
    for (let J = J0; J <= J1; J++) {
      const I0 = Math.floor((-box.hh - oy - k * J * s / 2) / (k * s)) - 1;
      const I1 = Math.ceil((box.hh - oy - k * J * s / 2) / (k * s)) + 1;
      for (let I = I0; I <= I1; I++) {
        const V = (a: number, b: number) => v(k * a, k * b, ox, oy);
        if (inside(V(I, J)) && inside(V(I + 1, J)) && inside(V(I, J + 1))) out.push([I, J, 0]);
        if (inside(V(I + 1, J)) && inside(V(I + 1, J + 1)) && inside(V(I, J + 1))) out.push([I, J, 1]);
      }
    }
    return pruneTriangles(out);
  };
  const placed = bestPlacement(k * s < 8 ? 3 : 8, (a, b) => {
    const ox = a * k * h, oy = b * k * s;
    const list = majors(ox, oy);
    return { n: list.length, keep: { list, ox, oy } };
  });
  if (!placed) return null;
  const { list, ox, oy } = placed;

  // Small triangles inside each larger one, as unit segments on the three line families.
  const lines = { V: new Map<number, Set<number>>(), A: new Map<number, Set<number>>(), B: new Map<number, Set<number>>() };
  const add = (fam: keyof typeof lines, line: number, pos: number) => {
    let set = lines[fam].get(line);
    if (!set) lines[fam].set(line, (set = new Set()));
    set.add(pos);
  };
  const up = (i: number, j: number) => { add('V', j, i); add('A', i, j); add('B', i + j + 1, j); };
  const down = (i: number, j: number) => { add('A', i + 1, j); add('V', j + 1, i); add('B', i + j + 1, j); };
  for (const [I, J, kind] of list) {
    for (let a = 0; a < k; a++) {
      for (let b = 0; b < k; b++) {
        const i = k * I + a, j = k * J + b;
        if (kind === 0) {
          if (a + b <= k - 1) up(i, j);
          if (a + b <= k - 2) down(i, j);
        } else {
          if (a + b >= k - 1) down(i, j);
          if (a + b >= k) up(i, j);
        }
      }
    }
  }
  const minor: Seg[] = [], major: Seg[] = [];
  const emit = (line: number, p: [number, number], q: [number, number]) =>
    (k > 1 && mod(line, k) === 0 ? major : minor).push([p[0], p[1], q[0], q[1]]);
  for (const [j, set] of lines.V) for (const [a, b] of runs(set)) emit(j, v(a, j, ox, oy), v(b + 1, j, ox, oy));
  for (const [i, set] of lines.A) for (const [a, b] of runs(set)) emit(i, v(i, a, ox, oy), v(i, b + 1, ox, oy));
  for (const [c, set] of lines.B) for (const [a, b] of runs(set)) emit(c, v(c - a, a, ox, oy), v(c - b - 1, b + 1, ox, oy));
  return { minor, major, majors: list.length, cells: list.length * k * k, perMajor: k * k };
}

// Directions to look around a point on an outline; none of them runs along an edge.
const PROBES = Array.from({ length: 12 }, (_, n) => [Math.cos(n * Math.PI / 6 + 0.1), Math.sin(n * Math.PI / 6 + 0.1)]);

// Flat-topped hexagons (the old sheets). A larger hexagon has k times the radius, k² times the area,
// and its centre on a small one; hexagons do not tile into hexagons, so its outline crosses
// small cells. Small cells are drawn where their centre lies in a larger one and they fit
// on the page whole.
function hexagonal(box: Box, area: number, k: number): Raw | null {
  const r = Math.sqrt(2 * area / (3 * SQRT3));
  const R = k * r;
  const centre = (p: number, q: number, rad: number, ox: number, oy: number): [number, number] =>
    [1.5 * rad * p + ox, SQRT3 / 2 * rad * (p + 2 * q) + oy];
  const fits = (cx: number, cy: number, rad: number) =>
    Math.abs(cx) + rad <= box.hw + EPS && Math.abs(cy) + SQRT3 / 2 * rad <= box.hh + EPS;

  const majors = (ox: number, oy: number) => {
    const out: [number, number][] = [];
    const P = Math.ceil(box.hw / (1.5 * R)) + 2;
    for (let p = -P; p <= P; p++) {
      const Q = Math.ceil(box.hh / (SQRT3 * R)) + Math.abs(p) + 2;
      for (let q = -Q; q <= Q; q++) {
        const [cx, cy] = centre(p, q, R, ox, oy);
        if (fits(cx, cy, R)) out.push([p, q]);
      }
    }
    return out;
  };
  // Small cells hardly change their count with the placement: fewer tries keep the slider quick.
  const placed = bestPlacement(R < 6 ? 3 : 8, (a, b) => {
    // A period of the larger lattice: 1.5R across, √3·R down.
    const ox = a * 1.5 * R, oy = b * SQRT3 * R + a * SQRT3 / 2 * R;
    const list = majors(ox, oy);
    return { n: list.length, keep: { list, ox, oy } };
  });
  if (!placed) return null;
  const { list, ox, oy } = placed;

  const unit = [0, 1, 2, 3, 4, 5].map((n) => [Math.cos(n * Math.PI / 3), Math.sin(n * Math.PI / 3)]);
  const edges = (cells: [number, number, number][]) => {
    const seen = new Set<number>();
    const out: Seg[] = [];
    for (const [cx, cy, rad] of cells) {
      for (let n = 0; n < 6; n++) {
        const x1 = cx + rad * unit[n][0], y1 = cy + rad * unit[n][1];
        const x2 = cx + rad * unit[(n + 1) % 6][0], y2 = cy + rad * unit[(n + 1) % 6][1];
        const id = pointKey((x1 + x2) / 2, (y1 + y2) / 2);
        if (seen.has(id)) continue;
        seen.add(id);
        out.push([x1, y1, x2, y2]);
      }
    }
    return out;
  };

  // The larger cell a point lies in (cube rounding of axial coordinates), and whether it is kept.
  const kept = new Set(list.map(([p, q]) => cellKey(p, q)));
  const keptAt = (x: number, y: number) => {
    const fp = (x - ox) / (1.5 * R);
    const fq = ((y - oy) / (SQRT3 / 2 * R) - fp) / 2;
    const fs = -fp - fq;
    let p = Math.round(fp), q = Math.round(fq);
    const s = Math.round(fs);
    const dp = Math.abs(p - fp), dq = Math.abs(q - fq), ds = Math.abs(s - fs);
    if (dp > dq && dp > ds) p = -q - s; else if (dq > ds) q = -p - s;
    return kept.has(cellKey(p, q));
  };
  const small = new Map<number, [number, number, number]>();
  const rejected = new Set<number>();
  const d = R * 1e-3;
  for (const [P, Q] of k > 1 ? list : []) {
    for (let dp = -k; dp <= k; dp++) {
      for (let dq = Math.max(-k, -dp - k); dq <= Math.min(k, -dp + k); dq++) {
        const p = k * P + dp, q = k * Q + dq;
        const id = cellKey(p, q);
        if (small.has(id) || rejected.has(id)) continue;
        const [x, y] = centre(p, q, r, ox, oy);
        // A small cell belongs to the grid if it fits on the page and its centre lies inside
        // the area of larger cells: every point just around the centre is in a kept one.
        // So a centre on an outline between two larger cells counts, one on the outer edge
        // or in a notch does not (the small cell would stick out by half).
        if (!(fits(x, y, r) && PROBES.every(([c, s]) => keptAt(x + d * c, y + d * s)))) {
          rejected.add(id);
          continue;
        }
        small.set(id, [x, y, r]);
      }
    }
  }
  if (k === 1) for (const [p, q] of list) small.set(cellKey(p, q), [...centre(p, q, r, ox, oy), r]);
  const minor = chain(edges([...small.values()]));
  const major = k > 1 ? chain(edges(list.map(([p, q]) => [...centre(p, q, R, ox, oy), R] as [number, number, number]))) : [];
  return { minor, major, chained: true, majors: list.length, cells: small.size, perMajor: k * k };
}

/**
 * Kagome (trihexagonal) grid: regular hexagons with a triangle at each corner, every line
 * running straight through. It is three families of parallel lines like the triangular grid,
 * one of them moved by half the spacing, so no three lines meet in a point. The area is that of
 * the hexagon (the same hexagon as in the hexagonal grid); each triangle is a sixth of it.
 *
 * The larger cell is every k-th line (k odd), so the dark lines form a kagome k times as large,
 * with a small hexagon in the middle of each large one. As in the other grids the sheet holds
 * whole larger cells: the large hexagons that fit, and the large triangles that fit next to them;
 * the edge follows their outline. Several placements are tried, the one covering most wins.
 */
function kagome(box: Box, area: number, k: number): Raw | null {
  const a = Math.sqrt(2 * area / (3 * SQRT3));
  const A = k * a;
  const d = a * SQRT3;  // spacing of the lines in each family
  const DIRS = [0, 1, 2, 3, 4, 5].map((j) => [Math.cos(j * Math.PI / 3), Math.sin(j * Math.PI / 3)]);
  const TRI = [0, 1, 2, 3, 4, 5].map((j) => [Math.cos(Math.PI / 6 + j * Math.PI / 3), Math.sin(Math.PI / 6 + j * Math.PI / 3)]);
  const inBox = (x: number, y: number) => Math.abs(x) <= box.hw + EPS && Math.abs(y) <= box.hh + EPS;
  // Flat-topped hexagon of side s at c; a triangle of side s on edge j of a hexagon at c.
  const hexCorners = (cx: number, cy: number, side: number) => DIRS.map(([x, y]) => [cx + side * x, cy + side * y]);
  const triCentre = (cx: number, cy: number, side: number, j: number) =>
    [cx + 2 * side / SQRT3 * TRI[j][0], cy + 2 * side / SQRT3 * TRI[j][1]];
  const triCorners = (cx: number, cy: number, side: number, j: number) => {
    // Its far corner points away from the hexagon; the other two are the hexagon's corners j, j+1.
    const [tx, ty] = triCentre(cx, cy, side, j);
    return [[cx + side * DIRS[j][0], cy + side * DIRS[j][1]], [cx + side * DIRS[(j + 1) % 6][0], cy + side * DIRS[(j + 1) % 6][1]],
      [tx + side / SQRT3 * TRI[j][0], ty + side / SQRT3 * TRI[j][1]]];
  };

  // Large cells for a placement of the lattice: hexagon centres o + 2A(u, 0) + 2A·v(½, √3/2).
  const largeCells = (ox: number, oy: number) => {
    const hexes: [number, number][] = [];
    const tris = new Map<number, [number, number, number]>();  // key → centre x, y, and hexagon side-index
    const V = Math.ceil((box.hh + Math.abs(oy)) / (SQRT3 * A)) + 1;
    for (let v = -V; v <= V; v++) {
      const U = Math.ceil((box.hw + Math.abs(ox)) / (2 * A)) + Math.abs(v) + 1;
      for (let u = -U; u <= U; u++) {
        const cx = ox + 2 * A * u + A * v, cy = oy + SQRT3 * A * v;
        if (Math.abs(cx) + A > box.hw + EPS || Math.abs(cy) + SQRT3 / 2 * A > box.hh + EPS) continue;
        hexes.push([cx, cy]);
        for (let j = 0; j < 6; j++) {
          const [tx, ty] = triCentre(cx, cy, A, j);
          const key = pointKey(tx, ty);
          if (!tris.has(key) && triCorners(cx, cy, A, j).every(([x, y]) => inBox(x, y))) tris.set(key, [tx, ty, j]);
        }
      }
    }
    // A large triangle touches three large hexagons; with only one of them on the sheet it is
    // a sharp tooth on the edge, so it goes. With two it fills a notch between them, and stays.
    const hexKeys = new Set(hexes.map(([x, y]) => pointKey(x, y)));
    for (const [key, [tx, ty, j]] of tris) {
      const around = [j, j + 2, j + 4].map((n) => {
        const t = Math.PI / 6 + (n % 6) * Math.PI / 3 + Math.PI;  // from the triangle back to a hexagon
        return pointKey(tx + 2 * A / SQRT3 * Math.cos(t), ty + 2 * A / SQRT3 * Math.sin(t));
      });
      if (around.filter((h) => hexKeys.has(h)).length < 2) tris.delete(key);
    }
    return { hexes, tris };
  };
  // Small cells fill the page alike wherever the lattice starts; large ones are worth placing.
  const placed = bestPlacement(A < 3 ? 1 : A < 6 ? 3 : 8, (pu, pv) => {
    const ox = 2 * A * pu + A * pv, oy = SQRT3 * A * pv;
    const cells = largeCells(ox, oy);
    return { n: cells.hexes.length * 6 + cells.tris.size, keep: { ox, oy, ...cells } };
  });
  if (!placed || placed.hexes.length === 0) return null;
  const { ox, oy, hexes, tris } = placed;

  // Is a point inside one of the chosen large cells? Its nearest large-hexagon centre (cube
  // rounding of lattice coordinates) is either the hexagon it lies in or the one whose
  // neighbouring triangle holds it.
  const hexSet = new Set(hexes.map(([x, y]) => pointKey(x, y)));
  const insideHex = (x: number, y: number, cx: number, cy: number, side: number) => {
    const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
    return dy <= SQRT3 / 2 * side + EPS && SQRT3 * dx + dy <= SQRT3 * side + EPS;
  };
  const inTri = (x: number, y: number, c: number[][]) => {
    const side = (p: number[], q: number[]) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
    const s0 = side(c[0], c[1]), s1 = side(c[1], c[2]), s2 = side(c[2], c[0]);
    return (s0 >= -EPS && s1 >= -EPS && s2 >= -EPS) || (s0 <= EPS && s1 <= EPS && s2 <= EPS);
  };
  // Points at a large hexagon's corner are as near the next centre as their own, so the nearest
  // centre and its six neighbours are all tried.
  const NEAR = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
  const covered = (x: number, y: number) => {
    const fv = (y - oy) / (SQRT3 * A), fu = (x - ox - A * fv) / (2 * A), fw = -fu - fv;
    let u = Math.round(fu), v = Math.round(fv);
    const w = Math.round(fw);
    const du = Math.abs(u - fu), dv = Math.abs(v - fv), dw = Math.abs(w - fw);
    if (du > dv && du > dw) u = -v - w; else if (dv > dw) v = -u - w;
    for (const [a1, b1] of NEAR) {
      const cx = ox + 2 * A * (u + a1) + A * (v + b1), cy = oy + SQRT3 * A * (v + b1);
      if (insideHex(x, y, cx, cy, A)) return hexSet.has(pointKey(cx, cy));
      for (let j = 0; j < 6; j++) {
        if (inTri(x, y, triCorners(cx, cy, A, j))) {
          const [tx, ty] = triCentre(cx, cy, A, j);
          return tris.has(pointKey(tx, ty));
        }
      }
    }
    return false;
  };

  // Small cells whose centre is covered, collected as pieces of the lines they lie on. Every
  // small edge lies on one line of one family; pieces on the same line are merged into runs.
  const fam = [Math.PI / 2, Math.PI / 2 + 2 * Math.PI / 3, Math.PI / 2 + 4 * Math.PI / 3]
    .map((t) => ({ nx: Math.cos(t), ny: Math.sin(t) }));
  const pieces = new Map<string, { f: number; i: number; spans: [number, number][] }>();
  const addEdge = (x1: number, y1: number, x2: number, y2: number) => {
    const mx = (x1 + x2) / 2 - ox, my = (y1 + y2) / 2 - oy;
    // The family whose normal is perpendicular to the edge.
    const f = fam.findIndex(({ nx, ny }) => Math.abs(nx * (x2 - x1) + ny * (y2 - y1)) < 1e-6 * a);
    const { nx, ny } = fam[f];
    const i = Math.round((nx * mx + ny * my) / d - 0.5);
    const t1 = -ny * (x1 - ox) + nx * (y1 - oy), t2 = -ny * (x2 - ox) + nx * (y2 - oy);
    const id = `${f}:${i}`;
    let line = pieces.get(id);
    if (!line) pieces.set(id, (line = { f, i, spans: [] }));
    line.spans.push(t1 < t2 ? [t1, t2] : [t2, t1]);
  };
  let cells = 0;
  const V = Math.ceil((box.hh + Math.abs(oy)) / (SQRT3 * a)) + 2;
  for (let v = -V; v <= V; v++) {
    const U = Math.ceil((box.hw + Math.abs(ox)) / (2 * a)) + Math.abs(v) + 2;
    for (let u = -U; u <= U; u++) {
      const cx = ox + 2 * a * u + a * v, cy = oy + SQRT3 * a * v;
      if (Math.abs(cx) > box.hw + 2 * a || Math.abs(cy) > box.hh + 2 * a) continue;
      if (covered(cx, cy)) {
        cells++;
        const c = hexCorners(cx, cy, a);
        for (let n = 0; n < 6; n++) addEdge(c[n][0], c[n][1], c[(n + 1) % 6][0], c[(n + 1) % 6][1]);
      }
      // Each hexagon owns the triangles on its edges 0 and 1; the rest belong to its neighbours.
      for (const j of [0, 1]) {
        const [tx, ty] = triCentre(cx, cy, a, j);
        if (!covered(tx, ty)) continue;
        const c = triCorners(cx, cy, a, j);
        for (let n = 0; n < 3; n++) addEdge(c[n][0], c[n][1], c[(n + 1) % 3][0], c[(n + 1) % 3][1]);
      }
    }
  }

  // Lines i ≡ (k−1)/2 (mod k) are the large kagome, which has a hexagon where the small one does.
  const minor: Seg[] = [], major: Seg[] = [];
  for (const { f, i, spans } of pieces.values()) {
    const { nx, ny } = fam[f];
    const c = d * (i + 0.5);
    const isMajor = k > 1 && mod(i - (k - 1) / 2, k) === 0;
    spans.sort((p, q) => p[0] - q[0]);
    const runs: [number, number][] = [];
    for (const [t0, t1] of spans) {
      const last = runs[runs.length - 1];
      if (last && t0 <= last[1] + 1e-6 * a) last[1] = Math.max(last[1], t1); else runs.push([t0, t1]);
    }
    for (const [t0, t1] of runs) {
      (isMajor ? major : minor).push([ox + nx * c - ny * t0, oy + ny * c + nx * t0, ox + nx * c - ny * t1, oy + ny * c + nx * t1]);
    }
  }
  return { minor, major, majors: hexes.length, cells, perMajor: k * k };
}

// ---------------------------------------------------------------------------------------------
// Polar grid

// Larger cells allowed in a ring (along the arc of a half, third or quarter): the divisors of 120
// up to 60, then multiples of 30 — spokes at simple angles, many of them shared between rings.
const RING_COUNTS: number[] = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30, 40, 60]
  .concat(Array.from({ length: 98 }, (_, i) => 90 + 30 * i));

export interface PolarRing { from: number; to: number; sectors: number }

/**
 * Rings of the polar grid on a circle (part 1) or its half, third or quarter. Radii in units of
 * the side of a square as large as one larger cell: every larger cell has that area, the field in
 * the centre too. Each ring takes the allowed count of larger cells along its arc that makes them
 * squarest, so the sequence never depends on the size — the size only decides how many rings fit.
 * Around a whole circle: 6, 12, 20, 24, 30, 40, 40, 60, 60, 60, 60, 90, …
 */
export function polarRings(part: number, count: number): { centre: number; rings: PolarRing[] } {
  const span = 2 * Math.PI / part;
  const centre = Math.sqrt(2 / span);  // a sector of the centre: span / 2 · r² = 1
  const rings: PolarRing[] = [];
  for (let r = centre; rings.length < count; r = rings[rings.length - 1].to) rings.push(nextRing(span, r));
  return { centre, rings };
}

/** The ring from radius r: the allowed count giving the squarest larger cells (depth : width nearest 1). */
function nextRing(span: number, r: number): PolarRing {
  let best: PolarRing | null = null, bestQ = Infinity;
  for (const n of RING_COUNTS) {
    const to = Math.sqrt(r * r + 2 * n / span);  // the ring holds n larger cells
    const q = Math.abs(Math.log((to - r) / (span * (r + to) / 2 / n)));
    if (q < bestQ - 1e-12) { best = { from: r, to, sectors: n }; bestQ = q; }
    else if (q > bestQ) break;  // depth : width grows with n
  }
  return best!;
}

/**
 * Where the centre goes and the angle of the first straight edge. The circle is centred; a half
 * and a third lie with a straight edge along the side of the page that holds the larger one,
 * a quarter in the bottom left corner. Angles run clockwise on the page (y points down).
 */
function polarPlace(box: Box, part: number): { cx: number; cy: number; a0: number } {
  const { hw, hh } = box;
  if (part === 4) return { cx: -hw, cy: hh, a0: -Math.PI / 2 };
  if (part === 2) {
    return Math.min(2 * hw, hh) >= Math.min(hw, 2 * hh)
      ? { cx: -hw, cy: 0, a0: -Math.PI / 2 }    // straight edge on the left
      : { cx: 0, cy: hh, a0: -Math.PI };        // straight edge at the bottom
  }
  if (part === 3) {
    // The sector is 1.5 R along its straight edge and R across.
    const along = Math.min(2 * hw, 4 * hh / 3), across = Math.min(4 * hw / 3, 2 * hh);
    return along >= across
      ? { cx: -hw, cy: along / 4, a0: -Math.PI / 2 }     // edge on the left, from the apex up
      : { cx: -across / 4, cy: hh, a0: -2 * Math.PI / 3 };  // edge at the bottom, from the apex right
  }
  return { cx: 0, cy: 0, a0: -Math.PI / 2 };
}

/**
 * The polar grid: a field in the centre, then rings of near-square larger cells, each of k × k
 * small ones (k along the arc; the k rings inside cut it into equal areas, so every small cell has
 * the chosen area). The field in the centre stays whole. Beyond the last whole ring, larger cells
 * that fit on the page are drawn too, as long as they touch a drawn cell of the ring inside and
 * a neighbour in their own ring.
 */
function polarGrid(box: Box, area: number, k: number, part: number) {
  const side = Math.sqrt(k * k * area);
  const span = 2 * Math.PI / part, whole = part === 1;
  const { cx, cy, a0 } = polarPlace(box, part);
  const angle = (f: number) => a0 + span * f;  // f: fraction of the span
  const inside = (r: number, t: number) => {
    const x = cx + r * Math.cos(t), y = cy + r * Math.sin(t);
    return Math.abs(x) <= box.hw + EPS && Math.abs(y) <= box.hh + EPS;
  };
  // Points bounding a piece of a ring: its corners and the outer arc where it crosses an axis.
  const outline = (r1: number, r2: number, f1: number, f2: number) => {
    const t1 = angle(f1), t2 = angle(f2);
    const pts: [number, number][] = [[r2, t1], [r2, t2]];
    if (r1 > 0) pts.push([r1, t1], [r1, t2]); else pts.push([0, 0]);
    for (let q = Math.ceil(t1 / (Math.PI / 2) + 1e-9); q * Math.PI / 2 < t2 - 1e-9; q++) pts.push([r2, q * Math.PI / 2]);
    return pts;
  };
  const fits = (pts: [number, number][]) => pts.every(([r, t]) => inside(r, t));

  const r0 = polarRings(part, 0).centre * side;
  const centrePts = outline(whole ? r0 : 0, r0, 0, 1).concat(whole ? [[r0, 0], [r0, Math.PI / 2], [r0, Math.PI], [r0, -Math.PI / 2]] : []);
  if (!fits(centrePts)) return null;

  // Rings while any cell of one still fits and touches the ring inside.
  const reach = Math.hypot(2 * box.hw, 2 * box.hh);
  const rings: PolarRing[] = [];
  const kept: Uint8Array[] = [];
  for (let i = 0; ; i++) {
    const ring = nextRing(span, i > 0 ? rings[i - 1].to : r0 / side);
    if (ring.from * side > reach) break;
    const n = ring.sectors, keep = new Uint8Array(n);
    const prev = kept[i - 1], pn = i > 0 ? rings[i - 1].sectors : 0;
    for (let j = 0; j < n; j++) {
      let touches = i === 0;
      for (let q = Math.floor(j * pn / n); !touches && q < Math.ceil((j + 1) * pn / n - 1e-9); q++) touches = prev[q] === 1;
      if (touches && fits(outline(ring.from * side, ring.to * side, j / n, (j + 1) / n))) keep[j] = 1;
    }
    // A cell with no neighbour in its ring would stick out alone like a tooth: left off.
    const on = (j: number) => (whole ? keep[(j + n) % n] : j >= 0 && j < n ? keep[j] : 0) === 1;
    const lone = Array.from({ length: n }, (_, j) => on(j) && !on(j - 1) && !on(j + 1));
    lone.forEach((l, j) => { if (l && n > 1) keep[j] = 0; });
    const any = keep.some((v) => v === 1);
    if (!any) break;
    rings.push(ring); kept.push(keep);
  }

  // Extent of the drawing, then everything moves so that it is centred on the page.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const extend = (pts: [number, number][]) => {
    for (const [r, t] of pts) {
      const x = cx + r * Math.cos(t), y = cy + r * Math.sin(t);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
  };
  extend(centrePts);
  rings.forEach((ring, i) => kept[i].forEach((on, j) => {
    if (on) extend(outline(ring.from * side, ring.to * side, j / ring.sectors, (j + 1) / ring.sectors));
  }));
  const ox = cx - (x0 + x1) / 2, oy = cy - (y0 + y1) / 2;
  const at = (r: number, f: number) => `${fmt(ox + r * Math.cos(angle(f)))} ${fmt(oy + r * Math.sin(angle(f)))}`;

  // Arcs: unions of fractions [f1, f2] at a radius; a whole circle is two halves.
  const arcPath = (r: number, spans: [number, number][]) => {
    spans.sort((p, q) => p[0] - q[0]);
    const runs: [number, number][] = [];
    for (const [f1, f2] of spans) {
      const last = runs[runs.length - 1];
      if (last && f1 <= last[1] + 1e-9) last[1] = Math.max(last[1], f2); else runs.push([f1, f2]);
    }
    if (whole && runs.length > 1 && runs[0][0] < 1e-9 && runs[runs.length - 1][1] > 1 - 1e-9) {
      runs[0][0] = runs.pop()![0] - 1;  // joins across the first spoke
    }
    const R = fmt(r);
    return runs.map(([f1, f2]) => {
      const pieces = Math.ceil((f2 - f1) * span / (Math.PI * 0.9) - 1e-9);
      let d = `M${at(r, f1)}`;
      for (let p = 1; p <= pieces; p++) d += `A${R} ${R} 0 0 1 ${at(r, f1 + (f2 - f1) * p / pieces)}`;
      return d;
    }).join('');
  };
  // Spokes: radial pieces by exact angle (a fraction in lowest terms), joined where they meet.
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const spokeMap = () => new Map<string, { f: number; parts: [number, number][] }>();
  const addSpoke = (map: ReturnType<typeof spokeMap>, a: number, b: number, r1: number, r2: number) => {
    if (whole) a %= b;
    const d = gcd(a, b) || 1, id = `${a / d}/${b / d}`;
    let spoke = map.get(id);
    if (!spoke) map.set(id, (spoke = { f: a / b, parts: [] }));
    spoke.parts.push([r1, r2]);
  };
  const spokePath = (map: ReturnType<typeof spokeMap>) => {
    let d = '';
    for (const { f, parts } of map.values()) {
      parts.sort((p, q) => p[0] - q[0]);
      const runs: [number, number][] = [];
      for (const [r1, r2] of parts) {
        const last = runs[runs.length - 1];
        if (last && r1 <= last[1] + 1e-9) last[1] = Math.max(last[1], r2); else runs.push([r1, r2]);
      }
      for (const [r1, r2] of runs) d += `M${at(r1, f)}L${at(r2, f)}`;
    }
    return d;
  };

  const majorSpokes = spokeMap(), minorSpokes = spokeMap();
  let major = '', minor = '';
  if (!whole) { addSpoke(majorSpokes, 0, 1, 0, r0); addSpoke(majorSpokes, 1, 1, 0, r0); }
  let inner: [number, number][] = [[0, 1]];  // outer edges of the ring inside (the centre: all of it)
  let r = r0;
  let majors = 1;
  rings.forEach((ring, i) => {
    const n = ring.sectors, keep = kept[i];
    const r1 = ring.from * side, r2 = ring.to * side;
    const cells: [number, number][] = [];
    keep.forEach((on, j) => { if (on) cells.push([j / n, (j + 1) / n]); });
    majors += cells.length;
    major += arcPath(r, inner.concat(cells.map((c) => [...c] as [number, number])));
    for (let e = 0; e <= n; e++) {
      if (whole && e === n) break;
      const left = whole ? keep[(e + n - 1) % n] : e > 0 ? keep[e - 1] : 0;
      if (left || (e < n && keep[e])) addSpoke(majorSpokes, e, n, r1, r2);
    }
    for (let m = 1; m < k; m++) minor += arcPath(Math.sqrt(r1 * r1 + m / k * (r2 * r2 - r1 * r1)), cells.map((c) => [...c] as [number, number]));
    keep.forEach((on, j) => {
      if (on) for (let m = 1; m < k; m++) addSpoke(minorSpokes, j * k + m, n * k, r1, r2);
    });
    inner = cells; r = r2;
  });
  major += arcPath(r, inner.map((c) => [...c] as [number, number]));
  major += spokePath(majorSpokes);
  minor += spokePath(minorSpokes);
  const hx = (x1 - x0) / 2, hy = (y1 - y0) / 2;
  return {
    minor, major, majors, cells: majors * k * k,
    rings: rings.map((ring) => ({ from: ring.from * side, to: ring.to * side, sectors: ring.sectors })),
    centre: r0, extent: [-hx, -hy, hx, hy] as [number, number, number, number],
  };
}

/** Side of a small cell in mm (square, tri, hex), width and height (rect); polar: side of a square of that area. */
export function cellSides(s: Pick<Settings, 'grid' | 'area'>): { a: number; b?: number } {
  const A = s.area;
  if (s.grid === 'rect') return { a: Math.sqrt(A / Math.SQRT2), b: Math.sqrt(A * Math.SQRT2) };
  if (s.grid === 'tri') return { a: 2 * Math.sqrt(A / SQRT3) };
  if (s.grid === 'hex' || s.grid === 'kagome') return { a: Math.sqrt(2 * A / (3 * SQRT3)) };
  return { a: Math.sqrt(A) };
}

/** Plural form index: en one/other, pl one/few/many (1 pole, 2 pola, 5 pól). */
export function plural(lang: Lang, n: number): number {
  if (n === 1) return 0;
  if (lang === 'en') return 1;
  const d = n % 10, t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? 1 : 2;
}

const GRID_NAMES: Record<GridType, string> = {
  kagome: 'kagome',
  square: 'square', rect: 'rectangular', tri: 'triangular', hex: 'hexagonal', polar: 'polar',
};
// The polar grid on a part of the circle.
const PART_NAMES: Record<number, string> = { 1: 'polar', 2: 'semicircle', 3: 'sector', 4: 'quadrant' };

export function buildGrid(s: Settings): Grid {
  const paper = PAPERS[s.paper];
  const width = s.landscape ? paper.height : paper.width;
  const height = s.landscape ? paper.width : paper.height;
  const box: Box = { hw: width / 2 - s.margin, hh: height / 2 - s.margin };

  const perMajor = s.group * s.group;
  const kind = s.grid === 'polar' ? PART_NAMES[s.part] : GRID_NAMES[s.grid];
  const name = (majors: number) => `${kind}_grid_${majors}x${perMajor}x${areaLabel(s.area)}mm2`;
  const none: Grid = {
    width, height, minor: '', major: '', name: name(0), majors: 0, cells: 0, perMajor,
    cell: cellSides(s), extent: [0, 0, 0, 0], fits: false,
  };

  if (s.grid === 'polar') {
    const p = polarGrid(box, s.area, s.group, s.part);
    if (!p) return none;
    return {
      width, height, minor: p.minor, major: p.major, name: name(p.majors), majors: p.majors, cells: p.cells,
      perMajor, cell: cellSides(s), rings: p.rings, extent: p.extent, fits: true,
    };
  }

  let raw: Raw | null = null;
  if (s.grid === 'square') raw = squareLike(box, Math.sqrt(s.area), Math.sqrt(s.area), s.group);
  // Sides 1 : √2, like an A sheet; turning the page gives wide cells.
  else if (s.grid === 'rect') raw = squareLike(box, Math.sqrt(s.area / Math.SQRT2), Math.sqrt(s.area * Math.SQRT2), s.group);
  else if (s.grid === 'tri') raw = triangular(box, s.area, s.group);
  else if (s.grid === 'hex') raw = hexagonal(box, s.area, s.group);
  else raw = kagome(box, s.area, s.group);
  if (!raw) return none;

  // Centre the drawing on the page (placements of triangles and hexagons need not be symmetric).
  const polys = (raw.chained ? raw.minor.concat(raw.major) : (raw.minor as Seg[]).concat(raw.major as Seg[])) as number[][];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const pts of polys) {
    for (let i = 0; i < pts.length; i += 2) {
      x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]);
      y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]);
    }
  }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const place = (pts: number[]) => {
    const out = new Array<number>(pts.length);
    for (let i = 0; i < pts.length; i += 2) { out[i] = pts[i] - cx; out[i + 1] = pts[i + 1] - cy; }
    return out;
  };
  const draw = (lines: number[][]) => (raw!.chained ? polyPath(lines.map(place)) : segPath(lines.map(place) as Seg[]));
  const hx = (x1 - x0) / 2, hy = (y1 - y0) / 2;

  return {
    width, height, minor: draw(raw.minor as number[][]), major: draw(raw.major as number[][]),
    name: name(raw.majors), majors: raw.majors, cells: raw.cells,
    perMajor: raw.perMajor, cell: cellSides(s), extent: [-hx, -hy, hx, hy], fits: true,
  };
}

/** The sheet as an SVG document fragment (starts with <svg); sized in millimetres. */
export function renderSheet(s: Settings, grid: Grid = buildGrid(s)): string {
  const { width: W, height: H } = grid;
  const ink = inkColors(s.ink);
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${fmt(W)}mm" height="${fmt(H)}mm" viewBox="${fmt(-W / 2)} ${fmt(-H / 2)} ${fmt(W)} ${fmt(H)}">`,
    `<title>${grid.name}</title>`,
    `<g fill="none" stroke-linecap="round" stroke-linejoin="round">`,
    grid.minor && `<path stroke="${ink.minor}" stroke-width="0.1" d="${grid.minor}"/>`,
    grid.major && `<path stroke="${ink.major}" stroke-width="0.2" d="${grid.major}"/>`,
    `</g>`,
  ];
  if (s.caption) {
    // Baseline 3 mm below the grid area, inside the bottom margin.
    const y = fmt(H / 2 - s.margin + 3);
    const x = fmt(W / 2 - s.margin);
    parts.push(
      `<g fill="${ink.minor}" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-size="2.5">`,
      `<text x="${fmt(-W / 2 + s.margin)}" y="${y}">${grid.name}</text>`,
      `<text x="${x}" y="${y}" text-anchor="end">${SITE_URL}</text>`,
      `</g>`,
    );
  }
  parts.push('</svg>');
  return parts.filter(Boolean).join('');
}
