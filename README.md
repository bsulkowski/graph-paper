# Graph Paper

*Also available in Polish: [README](README_PL.md)*

Printable grid paper — square, rectangular, triangular, hexagonal and polar — with cells
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
| Polar | a piece of a ring, the same area everywhere | *g* cells; how many larger cells make a ring is set separately |

Hexagons do not tile into hexagons, so the outline of a larger hexagon crosses small cells:
it shows the scale rather than a group of whole cells.

In the polar grid every cell has the same area, from the centre to the edge. The number of
sectors grows outward in steps, wherever the cells would otherwise get too wide, and the
circles and spokes of the larger cells always run along those of the small ones.

The area grows by √2 per step, from 6.25 to 800 mm², so every second step doubles it:
25 mm² is the usual 5 mm square, 100 mm² the 1 cm square.

## Sheet names

Every sheet has a name such as `square_grid_24x36x50mm2`: the grid, the number of larger cells
on the sheet, the cells in each of them and the area of one cell. It is printed in the bottom
left corner and used as the file name.

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

Install from GitHub: `npm install github:bsulkowski/graph-paper#v1.0.0`. The package ships
the TypeScript source, so a bundler has to compile it (Vite does; in an Astro or Vite SSR
build, add `graph-paper` to `ssr.noExternal`).

### Compatibility

The link parameters are a promise: their names and meaning do not change, so a link saved
today opens the same grid later. A new option comes as a new parameter whose default draws
what was drawn before. The placement of the grid on the page may still improve.

`TOOL_VERSION` follows that: a new option → 1.1, a fix in the drawing → 1.0.1.

## Tests

```sh
npm test            # geometry, margins on every paper, polar zones, link parameters
npm run examples    # redraw examples/
```

## Licence

[MIT](LICENSE) — Bartosz Sułkowski.
