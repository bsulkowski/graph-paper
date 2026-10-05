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
export const TOOL_VERSION = '1.1';

export type GridType = 'square' | 'rect' | 'tri' | 'hex' | 'polar';
export type Paper = 'a4' | 'a5' | 'a3' | 'letter';
export type Ink = 'grey' | 'blue' | 'green' | 'sepia';

export interface Settings {
  grid: GridType;
  area: number;      // mm² of one small cell, a value of AREAS
  group: number;     // larger cell: k × k small cells (square, rect, tri, hex) or g cells (polar)
  sectors: number;   // polar: larger cells in one ring (in its third for part 3)
  part: number;      // polar: 1 = the whole circle, 3 = a third of it (a 120° sector)
  turn: boolean;     // rect, tri, hex: rotated by 90°
  paper: Paper;
  landscape: boolean;
  margin: number;    // mm, on every side; the caption sits inside the bottom margin
  ink: Ink;
  caption: boolean;
}

export const GRIDS: GridType[] = ['square', 'rect', 'tri', 'hex', 'polar'];

// Cell areas grow by √2: every second step doubles the area, so 25 mm² (5 mm squares)
// and 100 mm² (1 cm squares) are both on the scale, and so are the sheets of the old generator.
export const AREAS: number[] = Array.from({ length: 15 }, (_, i) => 25 * 2 ** ((i - 4) / 2));

export const GROUPS: Record<GridType, number[]> = {
  square: [1, 2, 3, 4, 5, 6, 8, 10],
  rect: [1, 2, 3, 4, 5, 6, 8],
  tri: [1, 2, 3, 4, 5, 6],
  hex: [1, 2, 3, 4, 5],
  polar: [4, 6, 8, 9, 12, 16, 24],
};
export const SECTORS = [6, 8, 10, 12, 16];
export const PARTS = [1, 3];
// Larger cells along the arc of a third: 4 there is 12 around the whole circle.
export const SECTORS_THIRD = [2, 3, 4, 6, 8];
const SECTORS_DEFAULT: Record<number, number> = { 1: 12, 3: 4 };
export const sectorsOf = (part: number) => (part === 3 ? SECTORS_THIRD : SECTORS);

export const PAPERS: Record<Paper, { label: string; width: number; height: number }> = {
  a4: { label: 'A4', width: 210, height: 297 },
  a5: { label: 'A5', width: 148, height: 210 },
  a3: { label: 'A3', width: 297, height: 420 },
  letter: { label: 'Letter', width: 215.9, height: 279.4 },
};
export const MARGINS = [7, 10, 15, 20];

// Minor and major line colours; grey is the one of the old sheets.
export const INKS: Record<Ink, { minor: string; major: string }> = {
  grey: { minor: '#bbbbbb', major: '#777777' },
  blue: { minor: '#a3b6de', major: '#4d6aae' },
  green: { minor: '#a9d0b0', major: '#4f8c5d' },
  sepia: { minor: '#d8c3a8', major: '#8b5e3c' },
};

const GROUP_DEFAULT: Record<GridType, number> = { square: 6, rect: 4, tri: 5, hex: 4, polar: 8 };

export const DEFAULTS: Settings = {
  grid: 'square',
  area: 50,
  group: 6,
  sectors: 12,
  part: 1,
  turn: false,
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

/**
 * The larger cell to use when switching grids: k × k carries over between square, rect, tri
 * and hex if that grid offers it; polar counts cells differently and starts from its default.
 */
export function groupFor(grid: GridType, group: number, from: GridType = grid): number {
  const same = (grid === 'polar') === (from === 'polar');
  return same && GROUPS[grid].includes(group) ? group : GROUP_DEFAULT[grid];
}

/**
 * Larger cells in a ring when switching between the circle and its third: the same spacing
 * if that count is offered (12 around the circle = 4 along a third), else the default.
 */
export function sectorsFor(part: number, sectors: number, from: number = part): number {
  const carried = from === part ? sectors : from === 1 ? sectors / 3 : sectors * 3;
  return sectorsOf(part).includes(carried) ? carried : SECTORS_DEFAULT[part];
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
  s.part = params.get('part') === '3' ? 3 : 1;
  const sectors = num('sectors');
  s.sectors = sectors !== null && sectorsOf(s.part).includes(sectors) ? sectors : SECTORS_DEFAULT[s.part];
  const paper = params.get('paper');
  if (paper && paper in PAPERS) s.paper = paper as Paper;
  const margin = num('margin');
  if (margin !== null && MARGINS.includes(margin)) s.margin = margin;
  const ink = params.get('ink');
  if (ink && ink in INKS) s.ink = ink as Ink;
  s.turn = params.get('turn') === '1';
  s.landscape = params.get('landscape') === '1';
  s.caption = params.get('caption') !== '0';
  return s;
}

/** Link parameters for the settings; defaults are left out, so the default sheet has a bare link. */
export function settingsQuery(s: Settings): string {
  const p = new URLSearchParams();
  if (s.grid !== DEFAULTS.grid) p.set('grid', s.grid);
  if (s.area !== DEFAULTS.area) p.set('area', areaLabel(s.area));
  if (s.group !== GROUP_DEFAULT[s.grid]) p.set('group', String(s.group));
  if (s.grid === 'polar' && s.part === 3) p.set('part', '3');
  if (s.grid === 'polar' && s.sectors !== SECTORS_DEFAULT[s.part]) p.set('sectors', String(s.sectors));
  if (s.turn && turnable(s.grid)) p.set('turn', '1');
  if (s.paper !== DEFAULTS.paper) p.set('paper', s.paper);
  if (s.landscape) p.set('landscape', '1');
  if (s.margin !== DEFAULTS.margin) p.set('margin', String(s.margin));
  if (s.ink !== DEFAULTS.ink) p.set('ink', s.ink);
  if (!s.caption) p.set('caption', '0');
  return p.toString();
}

export const turnable = (grid: GridType) => grid === 'rect' || grid === 'tri' || grid === 'hex';

/** Area as written in the sheet name and the link: whole mm², or two digits below 10 (6.3, 8.8). */
export function areaLabel(area: number): string {
  return area >= 10 ? String(Math.round(area)) : String(Number(area.toPrecision(2)));
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
  rings?: { from: number; to: number; sectors: number }[];  // polar zones, radii in mm
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

function circlePath(radii: number[]): string {
  return radii.map((r) => {
    const R = fmt(r);
    return `M${R} 0A${R} ${R} 0 1 0 ${fmt(-r)} 0A${R} ${R} 0 1 0 ${R} 0`;
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
  minorCircles?: number[];
  majorCircles?: number[];
  arcs?: { minor: number[]; major: number[]; a0: number; span: number };  // radii of arcs around the origin
  chained?: boolean;
  majors: number;
  cells: number;
  perMajor: number;
  rings?: Grid['rings'];
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
    return out;
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
 * Rings of the polar grid. Radii in units where R² counts small cells times area/π, so a ring
 * from `from` to `to` holds `to − from` cells. Each ring is cut into `sectors` cells; the count
 * may only change where it divides the cells so far, and must divide one larger ring
 * (sectors × g), so the larger circles and spokes always run along small ones. Where it may
 * change, the count giving the squarest cells wins; at the centre, the one nearest to 12.
 * This reproduces the zones of the old sheets 36x8x100 and 50x12x50 exactly.
 */
export function polarRings(sectors: number, g: number, majorRings: number) {
  const P = sectors * g;
  const counts = [...new Set(Array.from({ length: g }, (_, i) => i + 1).filter((m) => g % m === 0).map((m) => sectors * m))]
    .sort((a, b) => a - b);
  const aspect = (B: number, n: number) => {
    const r1 = Math.sqrt(B), r2 = Math.sqrt(B + n);
    return Math.abs(Math.log((Math.PI * (r1 + r2) / n) / (r2 - r1)));
  };
  let n = counts.reduce((best, c) => (Math.abs(Math.log(c / 12)) < Math.abs(Math.log(best / 12)) ? c : best));
  const rings: { from: number; to: number; sectors: number }[] = [];
  for (let B = 0; B < majorRings * P; B += n) {
    if (B > 0) {
      n = counts.filter((c) => c >= n && B % c === 0)
        .reduce((best, c) => (aspect(B, c) < aspect(B, best) - 1e-12 ? c : best), n);
    }
    rings.push({ from: B, to: B + n, sectors: n });
  }
  return rings;
}

function polar(box: Box, area: number, M: number, g: number): Raw | null {
  const P = M * g;
  const rmax = Math.min(box.hw, box.hh);
  const J = Math.floor(Math.PI * rmax * rmax / (P * area) + 1e-9);
  if (J < 1) return null;
  const rings = polarRings(M, g, J);
  const rad = (B: number) => Math.sqrt(B * area / Math.PI);

  const minorCircles = rings.filter((ring) => ring.to % P !== 0).map((ring) => rad(ring.to));
  const majorCircles = Array.from({ length: J }, (_, j) => rad((j + 1) * P));

  // Spokes by exact angle (a/n in lowest terms), joined across rings with the same angle.
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const spokes = new Map<string, { angle: number; parts: [number, number][] }>();
  for (const ring of rings) {
    for (let a = 0; a < ring.sectors; a++) {
      if ((a * M) % ring.sectors === 0) continue;  // a major spoke
      const d = gcd(a, ring.sectors);
      const id = `${a / d}/${ring.sectors / d}`;
      let spoke = spokes.get(id);
      if (!spoke) spokes.set(id, (spoke = { angle: 2 * Math.PI * a / ring.sectors, parts: [] }));
      const last = spoke.parts[spoke.parts.length - 1];
      if (last && last[1] === ring.from) last[1] = ring.to; else spoke.parts.push([ring.from, ring.to]);
    }
  }
  const minor: Seg[] = [];
  for (const { angle, parts } of spokes.values()) {
    const c = Math.cos(angle), s = Math.sin(angle);
    for (const [b0, b1] of parts) minor.push([rad(b0) * c, rad(b0) * s, rad(b1) * c, rad(b1) * s]);
  }
  const outer = rad(J * P);
  const major: Seg[] = Array.from({ length: M }, (_, a) => {
    const angle = 2 * Math.PI * a / M;
    return [0, 0, outer * Math.cos(angle), outer * Math.sin(angle)] as Seg;
  });
  return {
    minor, major, minorCircles, majorCircles,
    majors: J * M, cells: J * P, perMajor: g,
    rings: mergeZones(rings).map((z) => ({ from: rad(z.from), to: rad(z.to), sectors: z.sectors })),
  };
}

/**
 * The polar grid on a third of the circle (120°). Rings and spokes as on a circle with three
 * times as many larger cells, so the zones follow the same rule. One straight edge runs along
 * the long side of the page: the sector is 1.5 R long that way and R across, which fits nearly
 * the largest sector a sheet can hold (the best tilt gains about 1.5% and looks crooked).
 */
function polarThird(box: Box, area: number, M: number, g: number): Raw | null {
  const span = 2 * Math.PI / 3;
  const along = Math.min(2 * box.hw, 2 * box.hh / 1.5);   // straight edge vertical
  const across = Math.min(2 * box.hw / 1.5, 2 * box.hh);  // straight edge horizontal
  const a0 = along >= across ? -Math.PI / 2 : -2 * Math.PI / 3;
  const rmax = Math.max(along, across);
  const P = 3 * M * g;  // cells in a larger ring of the whole circle; a third of them is drawn
  const J = Math.floor(Math.PI * rmax * rmax / (P * area) + 1e-9);
  if (J < 1) return null;
  const rings = polarRings(3 * M, g, J);
  const rad = (B: number) => Math.sqrt(B * area / Math.PI);
  const at = (r: number, angle: number): [number, number] => [r * Math.cos(angle), r * Math.sin(angle)];

  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const spokes = new Map<string, { angle: number; parts: [number, number][] }>();
  for (const ring of rings) {
    const n = ring.sectors / 3;
    for (let a = 1; a < n; a++) {
      if ((a * M) % n === 0) continue;  // a major spoke
      const d = gcd(a, n);
      const id = `${a / d}/${n / d}`;
      let spoke = spokes.get(id);
      if (!spoke) spokes.set(id, (spoke = { angle: a0 + span * a / n, parts: [] }));
      const last = spoke.parts[spoke.parts.length - 1];
      if (last && last[1] === ring.from) last[1] = ring.to; else spoke.parts.push([ring.from, ring.to]);
    }
  }
  const minor: Seg[] = [];
  for (const { angle, parts } of spokes.values()) {
    for (const [b0, b1] of parts) minor.push([...at(rad(b0), angle), ...at(rad(b1), angle)]);
  }
  const outer = rad(J * P);
  const major: Seg[] = Array.from({ length: M + 1 }, (_, a) => [0, 0, ...at(outer, a0 + span * a / M)] as Seg);
  return {
    minor, major,
    arcs: {
      minor: rings.filter((ring) => ring.to % P !== 0).map((ring) => rad(ring.to)),
      major: Array.from({ length: J }, (_, j) => rad((j + 1) * P)),
      a0, span,
    },
    majors: J * M, cells: J * M * g, perMajor: g,
    rings: mergeZones(rings).map((z) => ({ from: rad(z.from), to: rad(z.to), sectors: z.sectors / 3 })),
  };
}

function mergeZones(rings: { from: number; to: number; sectors: number }[]) {
  const zones: typeof rings = [];
  for (const ring of rings) {
    const last = zones[zones.length - 1];
    if (last && last.sectors === ring.sectors) last.to = ring.to; else zones.push({ ...ring });
  }
  return zones;
}

/** Side of a small cell in mm (square, tri, hex), width and height (rect); polar: side of a square of that area. */
export function cellSides(s: Pick<Settings, 'grid' | 'area' | 'turn'>): { a: number; b?: number } {
  const A = s.area;
  if (s.grid === 'rect') {
    const w = Math.sqrt(A / Math.SQRT2), h = Math.sqrt(A * Math.SQRT2);
    return s.turn ? { a: h, b: w } : { a: w, b: h };
  }
  if (s.grid === 'tri') return { a: 2 * Math.sqrt(A / SQRT3) };
  if (s.grid === 'hex') return { a: Math.sqrt(2 * A / (3 * SQRT3)) };
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
  square: 'square', rect: 'rectangular', tri: 'triangular', hex: 'hexagonal', polar: 'polar',
};

export function buildGrid(s: Settings): Grid {
  const paper = PAPERS[s.paper];
  const width = s.landscape ? paper.height : paper.width;
  const height = s.landscape ? paper.width : paper.height;
  const box: Box = { hw: width / 2 - s.margin, hh: height / 2 - s.margin };
  const turn = s.turn && turnable(s.grid);
  // A turned grid is built for the page turned sideways, then rotated back.
  const frame: Box = turn ? { hw: box.hh, hh: box.hw } : box;

  let raw: Raw | null = null;
  if (s.grid === 'square') raw = squareLike(frame, Math.sqrt(s.area), Math.sqrt(s.area), s.group);
  else if (s.grid === 'rect') {
    // Sides 1 : √2, like an A sheet; tall cells unless turned.
    raw = squareLike(frame, Math.sqrt(s.area / Math.SQRT2), Math.sqrt(s.area * Math.SQRT2), s.group);
  } else if (s.grid === 'tri') raw = triangular(frame, s.area, s.group);
  else if (s.grid === 'hex') raw = hexagonal(frame, s.area, s.group);
  else if (s.part === 3) raw = polarThird(frame, s.area, s.sectors, s.group);
  else raw = polar(frame, s.area, s.sectors, s.group);

  const perMajor = s.grid === 'polar' ? s.group : s.group * s.group;
  const kind = s.grid === 'polar' && s.part === 3 ? 'sector' : GRID_NAMES[s.grid];
  const name = (majors: number) => `${kind}_grid_${majors}x${perMajor}x${areaLabel(s.area)}mm2`;
  if (!raw) {
    return {
      width, height, minor: '', major: '', name: name(0), majors: 0, cells: 0, perMajor,
      cell: cellSides(s), extent: [0, 0, 0, 0], fits: false,
    };
  }

  // Centre the drawing on the page (placements of triangles and hexagons need not be symmetric),
  // then rotate a turned grid back: (x, y) → (−y, x).
  const polys = (raw.chained ? raw.minor.concat(raw.major) : (raw.minor as Seg[]).concat(raw.major as Seg[])) as number[][];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const pts of polys) {
    for (let i = 0; i < pts.length; i += 2) {
      x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]);
      y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]);
    }
  }
  if (raw.majorCircles?.length) {
    const r = Math.max(...raw.majorCircles);
    x0 = Math.min(x0, -r); x1 = Math.max(x1, r); y0 = Math.min(y0, -r); y1 = Math.max(y1, r);
  }
  if (raw.arcs?.major.length) {
    // The outer arc reaches furthest where it crosses an axis.
    const { a0, span } = raw.arcs;
    const r = Math.max(...raw.arcs.major);
    for (let q = Math.ceil(a0 / (Math.PI / 2) - 1e-9); q * Math.PI / 2 <= a0 + span + 1e-9; q++) {
      const x = r * Math.cos(q * Math.PI / 2), y = r * Math.sin(q * Math.PI / 2);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
  }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const place = (pts: number[]) => {
    const out = new Array<number>(pts.length);
    for (let i = 0; i < pts.length; i += 2) {
      const x = pts[i] - cx, y = pts[i + 1] - cy;
      if (turn) { out[i] = -y; out[i + 1] = x; } else { out[i] = x; out[i + 1] = y; }
    }
    return out;
  };
  const draw = (lines: number[][]) => (raw!.chained ? polyPath(lines.map(place)) : segPath(lines.map(place) as Seg[]));
  const arcs = (radii: number[] = []) => {
    if (!raw!.arcs) return '';
    const { a0, span } = raw!.arcs;
    return radii.map((r) => {
      const [xa, ya] = place([r * Math.cos(a0), r * Math.sin(a0)]);
      const [xb, yb] = place([r * Math.cos(a0 + span), r * Math.sin(a0 + span)]);
      return `M${fmt(xa)} ${fmt(ya)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(xb)} ${fmt(yb)}`;
    }).join('');
  };
  const minor = draw(raw.minor as number[][]) + circlePath(raw.minorCircles ?? []) + arcs(raw.arcs?.minor);
  const major = draw(raw.major as number[][]) + circlePath(raw.majorCircles ?? []) + arcs(raw.arcs?.major);
  const hx = (x1 - x0) / 2, hy = (y1 - y0) / 2;
  const extent: Grid['extent'] = turn ? [-hy, -hx, hy, hx] : [-hx, -hy, hx, hy];

  return {
    width, height, minor, major, name: name(raw.majors), majors: raw.majors, cells: raw.cells,
    perMajor: raw.perMajor, cell: cellSides(s), rings: raw.rings, extent, fits: true,
  };
}

/** The sheet as an SVG document fragment (starts with <svg); sized in millimetres. */
export function renderSheet(s: Settings, grid: Grid = buildGrid(s)): string {
  const { width: W, height: H } = grid;
  const ink = INKS[s.ink];
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
