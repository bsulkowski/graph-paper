# Graph Paper

*Also available in Polish: [README](README_PL.md)*

Printable grid paper — square, rectangular, triangular, hexagonal, kagome and polar — with cells
measured by area. Draw a sheet in the browser at **[bsulkowski.pl/graph-paper](https://bsulkowski.pl/graph-paper)**;
this repository holds the code that draws it.

## The idea

The size of a cell is given as its area, not its side. 50 mm² squares and 50 mm² hexagons
divide the page into cells of the same size, so changing the grid does not change the scale.
Every few cells are joined into a larger cell with a darker line, for counting and measuring
without a ruler, and the grid fills the page with whole larger cells.

| Grid | Cell | Larger cell |
|---|---|---|
| Square | a square | *k* × *k* squares |
| Rectangular | a rectangle with sides 1 : √2, like an A sheet | *k* × *k* rectangles |
| Triangular | an equilateral triangle | a triangle with side *k*, made of *k*² cells |
| Hexagonal | a regular hexagon | a hexagon with *k*² times the area, centred on a small one |
| Kagome | a regular hexagon, with a triangle of a sixth of its area at each corner | every *k*-th line (*k* odd, up to 9): the same pattern *k* times larger |
| Polar | a piece of a ring, the same area everywhere | a piece of a ring of *k* × *k* cells, close to a square; a whole field in the centre |
| Polar, ½, ⅓ or ¼ of a circle | the same, on a part of the circle | the same |

In every grid but kagome *k* goes from 1 to 10. Turning the paper turns the grid with it: a landscape
sheet of tall rectangles is a portrait sheet of wide ones, seen from the side.

Larger triangles held to the rest by one side only would stick out as sharp teeth, so they are
left off, in the triangular grid and in kagome alike; the edge keeps only blunt corners.

Hexagons do not tile into hexagons, so the outline of a larger hexagon crosses small cells:
it shows the scale rather than a group of whole cells.

Kagome (trihexagonal) is the triangular grid with one of its three families of lines moved
by half the spacing: no three lines meet any more, so every crossing opens into a small
triangle and hexagons appear between them. Every line runs straight through, which
makes it good for ornaments and star patterns, weaving and embroidery, and boards where the
hexagons are spaces and the triangles junctions. The area is that of the hexagon, so the
hexagons are those of the hexagonal grid at the same setting. As everywhere else the sheet
holds whole larger cells — the large hexagons that fit and the large triangles beside them —
so the edge has the notches of their outline.

The polar grid is **experimental**: its drawing and link parameters may still change.

The polar grid has a field in the centre, left whole, and rings of larger cells around it.
Every larger cell has the area of the centre field, and each ring takes as many of them as
makes them closest to squares, out of 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30, 40, 60, 90,
120, 150 … (the divisors of 120, then multiples of 30), so the spokes fall at simple angles.
Around the whole circle the rings hold 6, 12, 20, 24, 30, 40, 40, 60 … larger cells at every
size; the size only decides how many rings fit. A larger cell is split into *k* × *k* small
ones — *k* along the arc and *k* rings of equal area across — so every small cell has the
chosen area. Beyond the last whole ring the larger cells that fit on the page are drawn too,
as long as they touch a cell of the ring inside and have a neighbour in their own ring.

The polar grid can also be drawn on half, a third or a quarter of the circle: a half and a
third with a straight edge along the long side of the page, a quarter in a corner. The count in
a ring is then along the arc of that part. A part suits diagrams that widen from one point,
such as a fan chart of ancestors, and a single sheet rolls into a cone.

The area is chosen from [Human Scale Numbers](https://github.com/bsulkowski/human-scale-numbers)
— 1, 1.25, 1.6, 2, 2.5, 3.2, 4, 5, 6.4, 8, 10 … — from 1 mm² (millimetre paper) to 10 cm².
Every third step doubles the area and every tenth multiplies it by ten: 25 mm² is the usual
5 mm square, 100 mm² the 1 cm square.

## Sheet names

Every sheet has a name such as `square_grid_24x36x50mm2`: the grid, the number of larger cells
on the sheet, the cells in each of them and the area of one cell. It is printed in the bottom
left corner and used as the file name. On a part of the circle the polar grid is called
`semicircle_grid_…`, `sector_grid_…` (a third) or `quadrant_grid_…`; the field in the centre
counts as one larger cell.

Ready-made A4 sheets are in [`examples/`](examples).

## Using the code

One TypeScript module, [`src/graph-paper.ts`](src/graph-paper.ts), with no dependencies and no
DOM access. It runs in the browser and in Node ≥ 22.12 (with `--experimental-strip-types`).

```ts
import { DEFAULTS, buildGrid, renderSheet, parseSettings, settingsQuery } from 'graph-paper';

const settings = { ...DEFAULTS, grid: 'hex', area: 50, group: 3, landscape: true };
const grid = buildGrid(settings);        // name, counts, SVG path data; grid.fits is false if nothing fits
const svg = renderSheet(settings, grid);  // <svg …> sized in millimetres

settingsQuery(settings);                  // 'grid=hex&group=3&landscape=1' — defaults are left out
parseSettings(new URLSearchParams('grid=hex&group=3&landscape=1'));  // the same settings back
```

Install from GitHub: `npm install github:bsulkowski/graph-paper`, or with `#<commit>` at the end
to pin a version. The package ships
the TypeScript source, so a bundler has to compile it (Vite does; in an Astro or Vite SSR
build, add `graph-paper` to `ssr.noExternal`).

### Compatibility

The link parameters are a promise: their names and meaning do not change, so a link saved
today opens the same grid later. A new option comes as a new parameter whose default draws
what was drawn before. The placement of the grid on the page may still improve.

`TOOL_VERSION` follows that: a new option → 1.1, a fix in the drawing → 1.0.1.

- **1.5** — the polar grid anew: a whole field in the centre, rings of near-square larger cells
  of *k* × *k* small ones (`group` is *k* now, `sectors` from an older link is ignored); also on
  half and a quarter of the circle (`part=2`, `part=4`).
- **1.4** — larger cells from 1 to 10 (kagome: odd, up to 9); a colour of one's own for the
  lines (`ink=1f3a7a`); no more turning the grid on the page (`turn=1` from an older link turns
  the paper instead); larger triangles held by one side only are left off.
- **1.3** — cell areas from Human Scale Numbers, 1 mm² to 10 cm² (an `area` from an older link
  is read as the nearest value); the kagome grid holds whole larger cells like the others.
- **1.2** — the kagome grid (`grid=kagome`).
- **1.1** — the polar grid on a third of the circle (`part=3`).
- **1.0** — the first version.

## Tests

```sh
npm test            # geometry, margins on every paper, polar rings, link parameters
npm run examples    # redraw examples/
```

## Licence

[MIT](LICENSE) — Bartosz Sułkowski.
