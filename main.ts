// world-news-17-nov-2026 v3: renders a 1024x1024 illustrated poster summing up
// Tuesday 17 November 2026's world news as a PNG, drawn entirely in code
// (Node 22, standard library only). 47 stories: 13 illustrated panels, a
// dot-grid world map with the 13 big stories numbered, a 34-item "also on
// Tuesday" list, a field breakdown, and a date-check footer.
// Deterministic: no clock, no randomness, no network. Run it with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// It writes entry.png to MAKEFUN_OUTPUT_DIR (or /output in the grader container).

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// 5x7 bitmap font, written by hand. Each glyph is 7 rows of 5 cells ('#' on).
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  a: ['.....', '.....', '.###.', '....#', '.####', '#...#', '.###.'],
  b: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '####.'],
  c: ['.....', '.....', '.####', '#....', '#....', '#....', '.####'],
  d: ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####'],
  e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
  f: ['..##.', '.#..#', '.#...', '###..', '.#...', '.#...', '.#...'],
  g: ['.....', '.....', '.####', '#...#', '#...#', '.####', '....#', '.###.'],
  h: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#'],
  i: ['..#..', '.....', '.##..', '..#..', '..#..', '..#..', '.###.'],
  j: ['...#.', '.....', '..##.', '...#.', '...#.', '...#.', '...#.', '.##..'],
  k: ['#....', '#....', '#..#.', '#.#..', '##...', '#.#..', '#..#.'],
  l: ['.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  n: ['.....', '.....', '####.', '#...#', '#...#', '#...#', '#...#'],
  o: ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
  p: ['.....', '.....', '####.', '#...#', '#...#', '####.', '#....', '#....'],
  q: ['.....', '.....', '.####', '#...#', '#...#', '.####', '....#', '....#'],
  r: ['.....', '.....', '#.##.', '##..#', '#....', '#....', '#....'],
  s: ['.....', '.....', '.####', '#....', '.###.', '....#', '####.'],
  t: ['.#...', '.#...', '###..', '.#...', '.#...', '.#...', '..##.'],
  u: ['.....', '.....', '#...#', '#...#', '#...#', '#...#', '.###.'],
  v: ['.....', '.....', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  w: ['.....', '.....', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  x: ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  y: ['.....', '.....', '#...#', '#...#', '.####', '....#', '.###.'],
  z: ['.....', '.....', '#####', '...#.', '..#..', '.#...', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '"': ['.#.#.', '.#.#.', '.#.#.', '.....', '.....', '.....', '.....'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '(': ['...##', '..#..', '.#...', '.#...', '.#...', '..#..', '...##'],
  ')': ['##...', '..#..', '...#.', '...#.', '...#.', '..#..', '##...'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.#...'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '&': ['.###.', '#...#', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#..##'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
};

// ---------------------------------------------------------------------------
// Canvas: a plain RGB byte buffer, 1024x1024.
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

function fill(r: number, g: number, b: number): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = r;
    px[i * 3 + 1] = g;
    px[i * 3 + 2] = b;
  }
}

function rect(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
    }
  }
}

// Filled circle (scanline). Deterministic.
function circle(cx: number, cy: number, r: number, c: [number, number, number]): void {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    rect(cx - dx, cy + dy, 2 * dx + 1, 1, c);
  }
}

// Bresenham line, thickness w (square brush).
function line(x0: number, y0: number, x1: number, y1: number, c: [number, number, number], w = 1): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  const half = Math.floor(w / 2);
  for (;;) {
    rect(x - half, y - half, w, w, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

// Filled polygon (scanline, even-odd). Points are [x, y] pairs.
function poly(pts: [number, number][], c: [number, number, number]): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(H - 1, Math.ceil(maxY)); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(Math.round(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0)));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      rect(xs[k], y, xs[k + 1] - xs[k], 1, c);
    }
  }
}

function textWidth(s: string, scale: number): number {
  let w = 0;
  for (const ch of s) {
    void ch;
    w += 6 * scale;
  }
  return w === 0 ? 0 : w - scale;
}

function drawText(s: string, x: number, y: number, scale: number, c: [number, number, number]): void {
  let cx = x;
  for (const ch of s) {
    const glyph = FONT[ch] ?? FONT['?'];
    const rows = glyph.length;
    for (let r = 0; r < rows; r++) {
      const row = glyph[r];
      for (let col = 0; col < 5; col++) {
        if (row[col] === '#') {
          rect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(s: string, cx: number, y: number, scale: number, c: [number, number, number]): void {
  drawText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}

// Greedy word wrap: returns lines that fit maxWidth px at the given scale.
function wrap(s: string, scale: number, maxWidth: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur === '' ? w : cur + ' ' + w;
    if (textWidth(test, scale) <= maxWidth) {
      cur = test;
    } else {
      if (cur !== '') lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// PNG encoder (filter 0, zlib level 9, CRC32). Deterministic.
// ---------------------------------------------------------------------------
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crcData = new Uint8Array(4 + data.length);
  crcData.set(out.subarray(4, 8 + data.length));
  dv.setUint32(8 + data.length, crc32(crcData));
  return out;
}

function encodePNG(): Uint8Array {
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W);
  dv.setUint32(4, H);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = new Uint8Array(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// The day's news: Tuesday 17 November 2026. 47 stories, each verified from
// at least two sources (wires: Reuters, AP, AFP, BBC, Al Jazeera, WHO, UN,
// PAHO, USGS, Le Monde, RNZ, SCMP, PTI). Wording is my own. Claims are
// marked as claims ("claims", "says"). The wrong-date Ebola item from v2
// (cases passing 11,000, first reported 10 Nov) is replaced by the WHO
// warning issued 17 Nov.
// ---------------------------------------------------------------------------
// Panels: 13 big stories. Row 1 (3 panels): head scale 3, max 2 lines in
// 304px (17 chars/line), sub scale 2, max 2 lines in 304px (25 chars/line).
// Rows 2-3 (5 panels each): head scale 2, max 2 lines in 176px (14 chars),
// fact scale 2, max 2 lines in 176px (14 chars). All strings below were
// checked against those limits by hand.
type Panel = { tag: string; color: [number, number, number]; head: string; sub: string; scene: number };

const PANELS: Panel[] = [
  { tag: 'UKRAINE', color: [232, 163, 61], head: 'KERCH BRIDGE ROAD SPAN FALLS', sub: 'Ukraine strike drops road arch; rail hit too.', scene: 1 },
  { tag: 'MIDDLE EAST', color: [217, 79, 61], head: 'IRAN DRONES TARGET US BASE', sub: 'US, Bahrain: drones downed; Iran claims hit.', scene: 2 },
  { tag: 'GAZA', color: [61, 184, 166], head: 'UN WARNS OF GAZA WINTER CRISIS', sub: '1.7M displaced; 1.4M face acute hunger.', scene: 3 },
  { tag: 'HEALTH', color: [222, 94, 94], head: 'WHO WARNS EBOLA SPREADS', sub: '11,000+ CASES; 5,400 DEAD', scene: 4 },
  { tag: 'UKRAINE', color: [232, 163, 61], head: 'KYIV BRIDGES HIT', sub: 'WATER, POWER, HEAT CUT', scene: 5 },
  { tag: 'TECH', color: [111, 191, 90], head: 'NVIDIA SALES DOUBLE', sub: 'REVENUE 115.8BN', scene: 6 },
  { tag: 'ASIA-PACIFIC', color: [91, 141, 239], head: 'QUAD LEADERS MEET IN MANILA', sub: 'MINERALS DEALS SIGNED', scene: 7 },
  { tag: 'WEATHER', color: [96, 196, 220], head: 'CYCLONE XAVIER HITS CAT 4', sub: 'GUSTS TO 240 KM/H', scene: 8 },
  { tag: 'SPORT', color: [240, 200, 60], head: 'BRAZIL 7-0 SINGAPORE', sub: 'VINI HAT-TRICK IN 21 MIN', scene: 9 },
  { tag: 'SPORT', color: [240, 200, 60], head: 'HAALAND BRACE SINKS DENMARK', sub: 'PENALTY 90+6; NORWAY THROUGH', scene: 10 },
  { tag: 'HEALTH', color: [222, 94, 94], head: 'MEASLES-FREE STATUS LOST', sub: 'US, MEXICO, BOLIVIA OUT', scene: 11 },
  { tag: 'OCEANIA', color: [96, 196, 220], head: 'DARWIN SHAKEN BY M6.6', sub: 'FELT FAR; NO TSUNAMI', scene: 12 },
  { tag: 'MARKETS', color: [155, 126, 222], head: 'DEUTSCHE BANK SHARES SLIDE', sub: 'DOWN 6 PCT ON LEAK REPORT', scene: 13 },
];

// 34 more stories from the same day, numbered 14-47, two columns of 17.
// Each line is at most 46 chars (scale 1 in a 278px column).
const MORE: string[] = [
  '14 Japan: Russian jets enter airspace',
  '15 Rwanda: five EU states plan return hub',
  '16 US tightens chip exports to China',
  '17 Mongolia: president to resign',
  '18 Serbia: student MPs take their seats',
  '19 Siberia: An-12 crash kills all 19',
  '20 Maputo: opposition leader on trial',
  '21 COP31: draft splits on fossil fuels',
  '22 France: 146,000 march in pay strike',
  '23 Gaza: truce at risk, board warns',
  '24 Knesset elects Kahana speaker 66-52',
  '25 Sozcu TV raided, taken off air',
  '26 UK sanctions 8 firms over Gaza war',
  '27 Leonid meteors peak tonight',
  '28 Dhaka: garment wage clashes',
  '29 Jericho: woman, 72, shot dead',
  '30 Russia claims 1,441 drones downed',
  '31 Prague: trains collide, 46 hurt',
  '32 Tusk survives no-confidence vote',
  '33 Moldova: 7 drones cross airspace',
  '34 Guinea: 224 sentenced in crackdown',
  '35 FIFA: Diallo runs for president',
  '36 Costa Rica reporter shot dead',
  '37 India beat Pakistan 2-1 in SAFF final',
  '38 Japan opens oil storage to ASEAN',
  '39 China cuts tariffs on Canada goods',
  '40 ASEAN, US agree anti-scam pact',
  '41 PNG PM tells Xi on Taiwan office',
  '42 N. Marianas weighs floating nuclear',
  "43 Fed's Cook refuses White House hearing",
  '44 Apple outage hits iCloud, Pay, App Store',
  '45 Akvan: Odisha starts evacuations',
  '46 Uttarakhand bus crash kills 8',
  '47 Macron, Malaysia upgrade ties',
];

// Field breakdown. Counts sum to 47.
const FIELDS: { name: string; n: number; color: [number, number, number] }[] = [
  { name: 'WAR & CONFLICT', n: 8, color: [217, 79, 61] },
  { name: 'DIPLOMACY', n: 8, color: [91, 141, 239] },
  { name: 'POLITICS', n: 7, color: [155, 126, 222] },
  { name: 'ECONOMY & MARKETS', n: 5, color: [111, 191, 90] },
  { name: 'DISASTERS & AID', n: 4, color: [96, 196, 220] },
  { name: 'ACCIDENTS', n: 3, color: [232, 163, 61] },
  { name: 'SPORT', n: 3, color: [240, 200, 60] },
  { name: 'ENVIRONMENT & SCIENCE', n: 3, color: [61, 184, 166] },
  { name: 'MEDIA & RIGHTS', n: 2, color: [222, 94, 94] },
  { name: 'LABOUR', n: 2, color: [240, 160, 90] },
  { name: 'HEALTH', n: 2, color: [222, 120, 180] },
];

// Dot-grid world map: land as [row, colStart, colEnd] runs on a 38x13 grid
// (10px cells; lon -180..180, lat 90..-56). Antarctica omitted.
const LAND: [number, number, number][] = [
  [0, 13, 15],
  [1, 2, 11], [1, 12, 16], [1, 23, 37],
  [2, 1, 12], [2, 13, 15], [2, 17, 22], [2, 23, 38],
  [3, 1, 12], [3, 17, 22], [3, 23, 38],
  [4, 2, 11], [4, 17, 37],
  [5, 3, 10], [5, 17, 37],
  [6, 4, 13], [6, 17, 36],
  [7, 5, 8], [7, 10, 14], [7, 18, 23], [7, 27, 34],
  [8, 10, 14], [8, 18, 23], [8, 28, 33],
  [9, 11, 14], [9, 19, 23], [9, 29, 33],
  [10, 11, 14], [10, 19, 22], [10, 29, 33],
  [11, 12, 14], [11, 20, 22], [11, 30, 32], [11, 35, 35],
  [12, 12, 13], [12, 20, 21], [12, 35, 35],
];

// Numbered dots for the 13 panel stories. lon/lat is the true place;
// dx/dy nudge the drawn dot so the four crowded European dots do not
// collide (a thin leader line links dot to true place).
const DOTS: { n: number; lon: number; lat: number; dx: number; dy: number }[] = [
  { n: 1, lon: 33, lat: 45, dx: 11, dy: 12 },
  { n: 2, lon: 50, lat: 26, dx: 9, dy: -6 },
  { n: 3, lon: 34, lat: 31, dx: 18, dy: 12 },
  { n: 4, lon: 25, lat: -2, dx: 0, dy: 0 },
  { n: 5, lon: 30, lat: 50, dx: 2, dy: -13 },
  { n: 6, lon: -122, lat: 37, dx: 0, dy: 0 },
  { n: 7, lon: 121, lat: 14, dx: 0, dy: 0 },
  { n: 8, lon: -160, lat: -21, dx: 0, dy: 0 },
  { n: 9, lon: -52, lat: -10, dx: 0, dy: 0 },
  { n: 10, lon: 12, lat: 55, dx: -7, dy: -13 },
  { n: 11, lon: -102, lat: 23, dx: 0, dy: 0 },
  { n: 12, lon: 130, lat: -12, dx: 0, dy: 0 },
  { n: 13, lon: 8, lat: 50, dx: -12, dy: 9 },
];

// ---------------------------------------------------------------------------
// Illustrated scenes, drawn in code (flat design). Each scene fills its
// panel image rect (x, y, w, h). No text inside scenes: all lettering is
// drawn by the layout code, so nothing can come out garbled.
// ---------------------------------------------------------------------------
function drawScene(id: number, x: number, y: number, w: number, h: number): void {
  const DARK: [number, number, number] = [38, 44, 56];
  if (id === 1) {
    // Kerch bridge: dusk sky, broken deck, smoke, span falling into the sea.
    rect(x, y, w, Math.floor(h * 0.62), [240, 170, 80]);
    rect(x, y + Math.floor(h * 0.62), w, h - Math.floor(h * 0.62), [28, 62, 110]);
    circle(x + Math.floor(w * 0.8), y + Math.floor(h * 0.22), 10, [250, 222, 120]);
    const dy = y + Math.floor(h * 0.52);
    rect(x, dy, Math.floor(w * 0.38), 5, DARK);
    rect(x + Math.floor(w * 0.62), dy, Math.floor(w * 0.38), 5, DARK);
    rect(x + Math.floor(w * 0.16), dy, 5, h - Math.floor(h * 0.52), DARK);
    rect(x + Math.floor(w * 0.8), dy, 5, h - Math.floor(h * 0.52), DARK);
    line(x + Math.floor(w * 0.04), dy, x + Math.floor(w * 0.5), y + Math.floor(h * 0.16), DARK, 3);
    line(x + Math.floor(w * 0.96), dy, x + Math.floor(w * 0.5), y + Math.floor(h * 0.16), DARK, 3);
    circle(x + Math.floor(w * 0.5), y + Math.floor(h * 0.3), 8, [200, 200, 200]);
    circle(x + Math.floor(w * 0.46), y + Math.floor(h * 0.2), 6, [220, 220, 220]);
    circle(x + Math.floor(w * 0.55), y + Math.floor(h * 0.18), 5, [230, 230, 230]);
    line(x + Math.floor(w * 0.5), dy, x + Math.floor(w * 0.54), y + Math.floor(h * 0.78), DARK, 4);
    circle(x + Math.floor(w * 0.55), y + Math.floor(h * 0.82), 6, [250, 150, 60]);
  } else if (id === 2) {
    // Drones over the Gulf at night.
    rect(x, y, w, h, [16, 22, 44]);
    rect(x, y + Math.floor(h * 0.72), w, h - Math.floor(h * 0.72), [20, 40, 70]);
    for (const [sx, sy] of [[0.2, 0.25], [0.5, 0.18], [0.75, 0.32], [0.35, 0.55], [0.65, 0.6]] as const) {
      circle(x + Math.floor(w * sx), y + Math.floor(h * sy), 1, [220, 225, 240]);
    }
    const drone = (cx: number, cy: number, burst: boolean): void => {
      rect(cx - 8, cy - 3, 16, 6, [200, 200, 200]);
      line(cx - 13, cy - 7, cx + 13, cy - 7, [160, 170, 190], 2);
      line(cx - 4, cy + 3, cx + 4, cy + 3, [120, 130, 150], 2);
      circle(cx, cy + 6, 2, [255, 80, 60]);
      if (burst) {
        circle(cx + 14, cy + 8, 6, [250, 160, 60]);
        circle(cx + 14, cy + 8, 3, [255, 220, 100]);
      }
    };
    line(x + Math.floor(w * 0.1), y + Math.floor(h * 0.2), x + Math.floor(w * 0.4), y + Math.floor(h * 0.35), [120, 140, 180], 1);
    line(x + Math.floor(w * 0.6), y + Math.floor(h * 0.15), x + Math.floor(w * 0.8), y + Math.floor(h * 0.3), [120, 140, 180], 1);
    drone(x + Math.floor(w * 0.32), y + Math.floor(h * 0.32), false);
    drone(x + Math.floor(w * 0.62), y + Math.floor(h * 0.22), true);
    drone(x + Math.floor(w * 0.82), y + Math.floor(h * 0.5), false);
  } else if (id === 3) {
    // Gaza winter: tents in the rain.
    rect(x, y, w, h, [120, 135, 155]);
    rect(x, y + Math.floor(h * 0.78), w, h - Math.floor(h * 0.78), [90, 80, 70]);
    const tent = (tx: number, tw: number, th: number, c: [number, number, number]): void => {
      poly([[tx, y + Math.floor(h * 0.78)], [tx + Math.floor(tw / 2), y + Math.floor(h * 0.78) - th], [tx + tw, y + Math.floor(h * 0.78)]], c);
      rect(tx + Math.floor(tw / 2) - 3, y + Math.floor(h * 0.78) - 10, 6, 10, [60, 55, 50]);
    };
    tent(x + Math.floor(w * 0.06), Math.floor(w * 0.3), Math.floor(h * 0.3), [210, 190, 150]);
    tent(x + Math.floor(w * 0.38), Math.floor(w * 0.26), Math.floor(h * 0.24), [190, 165, 120]);
    tent(x + Math.floor(w * 0.66), Math.floor(w * 0.3), Math.floor(h * 0.32), [205, 180, 140]);
    for (let i = 0; i < 12; i++) {
      const rx = x + 8 + i * Math.floor((w - 16) / 12);
      const ry = y + 6 + ((i * 17) % Math.floor(h * 0.6));
      line(rx, ry, rx - 3, ry + 9, [200, 215, 230], 1);
    }
    rect(x + Math.floor(w * 0.15), y + Math.floor(h * 0.86), Math.floor(w * 0.5), 4, [110, 140, 170]);
  } else if (id === 4) {
    // Ebola virus cluster.
    rect(x, y, w, h, [30, 16, 28]);
    const virus = (cx: number, cy: number, r: number, c: [number, number, number]): void => {
      for (let k = 0; k < 10; k++) {
        const a = (k * 36 * Math.PI) / 180;
        const ex = cx + Math.round(Math.cos(a) * (r + 5));
        const ey = cy + Math.round(Math.sin(a) * (r + 5));
        line(cx, cy, ex, ey, c, 2);
        circle(ex, ey, 2, c);
      }
      circle(cx, cy, r, c);
      circle(cx - Math.floor(r / 3), cy - Math.floor(r / 3), Math.floor(r / 4), [120, 30, 45]);
    };
    virus(x + Math.floor(w * 0.5), y + Math.floor(h * 0.48), 16, [190, 60, 90]);
    virus(x + Math.floor(w * 0.2), y + Math.floor(h * 0.78), 8, [160, 50, 75]);
    virus(x + Math.floor(w * 0.82), y + Math.floor(h * 0.22), 7, [160, 50, 75]);
  } else if (id === 5) {
    // Kyiv: two bridges over the river, missile trails, blasts.
    rect(x, y, w, h, [150, 180, 210]);
    rect(x, y + Math.floor(h * 0.66), w, h - Math.floor(h * 0.66), [40, 90, 150]);
    rect(x, y + Math.floor(h * 0.38), w, 5, [60, 60, 70]);
    rect(x, y + Math.floor(h * 0.54), w, 5, [80, 80, 90]);
    rect(x + Math.floor(w * 0.25), y + Math.floor(h * 0.38), 4, Math.floor(h * 0.28), [60, 60, 70]);
    rect(x + Math.floor(w * 0.7), y + Math.floor(h * 0.54), 4, Math.floor(h * 0.14), [80, 80, 90]);
    line(x + Math.floor(w * 0.9), y + Math.floor(h * 0.06), x + Math.floor(w * 0.68), y + Math.floor(h * 0.38), [255, 255, 255], 2);
    line(x + Math.floor(w * 0.75), y + Math.floor(h * 0.02), x + Math.floor(w * 0.45), y + Math.floor(h * 0.54), [255, 255, 255], 2);
    circle(x + Math.floor(w * 0.68), y + Math.floor(h * 0.36), 7, [250, 160, 60]);
    circle(x + Math.floor(w * 0.68), y + Math.floor(h * 0.36), 3, [255, 220, 100]);
    circle(x + Math.floor(w * 0.45), y + Math.floor(h * 0.52), 6, [250, 160, 60]);
    circle(x + Math.floor(w * 0.85), y + Math.floor(h * 0.1), 4, [220, 220, 220]);
  } else if (id === 6) {
    // Nvidia: rising bars and a chip.
    rect(x, y, w, h, [14, 24, 20]);
    for (let g = 1; g <= 3; g++) line(x, y + Math.floor((h * g) / 4), x + w, y + Math.floor((h * g) / 4), [40, 60, 45], 1);
    const bars = [0.22, 0.34, 0.46, 0.6, 0.78];
    for (let i = 0; i < bars.length; i++) {
      const bh = Math.floor(h * bars[i]);
      const bw = Math.floor(w / 8);
      rect(x + Math.floor(w * 0.08) + i * Math.floor(w * 0.18), y + h - bh - 6, bw, bh, i === bars.length - 1 ? [120, 230, 120] : [60, 200, 90]);
    }
    line(x + Math.floor(w * 0.1), y + Math.floor(h * 0.3), x + Math.floor(w * 0.85), y + Math.floor(h * 0.12), [200, 240, 200], 2);
    poly([[x + Math.floor(w * 0.85), y + Math.floor(h * 0.12)], [x + Math.floor(w * 0.78), y + Math.floor(h * 0.1)], [x + Math.floor(w * 0.83), y + Math.floor(h * 0.2)]], [200, 240, 200]);
    rect(x + Math.floor(w * 0.72), y + Math.floor(h * 0.3), 16, 16, [30, 35, 45]);
    rect(x + Math.floor(w * 0.72) + 4, y + Math.floor(h * 0.3) + 4, 8, 8, [60, 200, 90]);
  } else if (id === 7) {
    // Quad: four flags over Manila.
    rect(x, y, w, h, [170, 200, 235]);
    rect(x, y + Math.floor(h * 0.8), w, h - Math.floor(h * 0.8), [120, 150, 90]);
    const poleXs = [0.14, 0.38, 0.62, 0.86];
    for (const pxf of poleXs) {
      line(x + Math.floor(w * pxf), y + Math.floor(h * 0.18), x + Math.floor(w * pxf), y + Math.floor(h * 0.82), [60, 60, 60], 2);
    }
    // US: red with white stripes.
    rect(x + Math.floor(w * 0.14) + 2, y + Math.floor(h * 0.2), 22, 13, [180, 60, 60]);
    for (let s = 0; s < 3; s++) rect(x + Math.floor(w * 0.14) + 2, y + Math.floor(h * 0.2) + 3 + s * 4, 22, 1, [245, 245, 245]);
    // Japan: white with red disc.
    rect(x + Math.floor(w * 0.38) + 2, y + Math.floor(h * 0.2), 22, 13, [245, 245, 245]);
    circle(x + Math.floor(w * 0.38) + 13, y + Math.floor(h * 0.2) + 6, 4, [200, 40, 50]);
    // India: saffron, white, green bands.
    rect(x + Math.floor(w * 0.62) + 2, y + Math.floor(h * 0.2), 22, 13, [255, 153, 51]);
    rect(x + Math.floor(w * 0.62) + 2, y + Math.floor(h * 0.2) + 4, 22, 5, [245, 245, 245]);
    rect(x + Math.floor(w * 0.62) + 2, y + Math.floor(h * 0.2) + 9, 22, 4, [19, 136, 8]);
    // Australia: blue with stars.
    rect(x + Math.floor(w * 0.86) + 2, y + Math.floor(h * 0.2), 22, 13, [40, 60, 140]);
    circle(x + Math.floor(w * 0.86) + 7, y + Math.floor(h * 0.2) + 4, 1, [255, 255, 255]);
    circle(x + Math.floor(w * 0.86) + 17, y + Math.floor(h * 0.2) + 9, 1, [255, 255, 255]);
  } else if (id === 8) {
    // Cyclone Xavier: spiral over the ocean.
    rect(x, y, w, h, [25, 70, 110]);
    const cx = x + Math.floor(w * 0.5);
    const cy = y + Math.floor(h * 0.52);
    for (const r of [34, 26, 18]) {
      circle(cx, cy, r, [200, 220, 240]);
      circle(cx, cy, r - 3, [25, 70, 110]);
    }
    circle(cx, cy, 8, [15, 40, 70]);
    for (let i = 0; i < 8; i++) {
      const rx = x + 6 + i * Math.floor((w - 12) / 8);
      line(rx, y + 4 + ((i * 13) % 20), rx - 3, y + 14 + ((i * 13) % 20), [180, 210, 235], 1);
    }
  } else if (id === 9) {
    // Brazil 7-0: pitch, goal, ball.
    rect(x, y, w, h, [50, 160, 80]);
    line(x, y + Math.floor(h / 2), x + w, y + Math.floor(h / 2), [240, 240, 240], 2);
    circle(x + Math.floor(w / 2), y + Math.floor(h / 2), 12, [240, 240, 240]);
    circle(x + Math.floor(w / 2), y + Math.floor(h / 2), 10, [50, 160, 80]);
    rect(x + w - 14, y + Math.floor(h * 0.25), 10, Math.floor(h * 0.5), [240, 240, 240]);
    rect(x + w - 12, y + Math.floor(h * 0.25) + 2, 6, Math.floor(h * 0.5) - 4, [50, 160, 80]);
    circle(x + Math.floor(w * 0.66), y + Math.floor(h * 0.55), 9, [245, 245, 245]);
    circle(x + Math.floor(w * 0.66), y + Math.floor(h * 0.55), 3, [30, 30, 30]);
    line(x + Math.floor(w * 0.5), y + Math.floor(h * 0.55), x + Math.floor(w * 0.58), y + Math.floor(h * 0.55), [240, 240, 240], 2);
    line(x + Math.floor(w * 0.46), y + Math.floor(h * 0.48), x + Math.floor(w * 0.54), y + Math.floor(h * 0.48), [240, 240, 240], 2);
  } else if (id === 10) {
    // Haaland: stadium lights, pitch, ball at the goal.
    rect(x, y, w, h, [20, 30, 50]);
    rect(x, y + Math.floor(h * 0.62), w, h - Math.floor(h * 0.62), [40, 140, 70]);
    circle(x + Math.floor(w * 0.12), y + Math.floor(h * 0.14), 5, [255, 250, 200]);
    circle(x + Math.floor(w * 0.88), y + Math.floor(h * 0.14), 5, [255, 250, 200]);
    line(x + Math.floor(w * 0.12), y + Math.floor(h * 0.16), x + Math.floor(w * 0.3), y + Math.floor(h * 0.6), [200, 210, 230], 1);
    line(x + Math.floor(w * 0.88), y + Math.floor(h * 0.16), x + Math.floor(w * 0.7), y + Math.floor(h * 0.6), [200, 210, 230], 1);
    rect(x + w - 16, y + Math.floor(h * 0.3), 12, Math.floor(h * 0.4), [240, 240, 240]);
    rect(x + w - 14, y + Math.floor(h * 0.3) + 2, 8, Math.floor(h * 0.4) - 4, [20, 30, 50]);
    circle(x + Math.floor(w * 0.6), y + Math.floor(h * 0.68), 8, [245, 245, 245]);
    circle(x + Math.floor(w * 0.6), y + Math.floor(h * 0.68), 3, [30, 30, 30]);
    circle(x + Math.floor(w * 0.6), y + Math.floor(h * 0.3), 6, [250, 200, 60]);
    for (let k = 0; k < 6; k++) {
      const a = (k * 60 * Math.PI) / 180;
      line(x + Math.floor(w * 0.6), y + Math.floor(h * 0.3), x + Math.floor(w * 0.6) + Math.round(Math.cos(a) * 11), y + Math.floor(h * 0.3) + Math.round(Math.sin(a) * 11), [250, 200, 60], 1);
    }
  } else if (id === 11) {
    // Measles virus cluster.
    rect(x, y, w, h, [120, 30, 40]);
    const virus = (cx: number, cy: number, r: number): void => {
      for (let k = 0; k < 8; k++) {
        const a = (k * 45 * Math.PI) / 180;
        const ex = cx + Math.round(Math.cos(a) * (r + 4));
        const ey = cy + Math.round(Math.sin(a) * (r + 4));
        line(cx, cy, ex, ey, [230, 120, 130], 2);
        circle(ex, ey, 2, [230, 120, 130]);
      }
      circle(cx, cy, r, [230, 120, 130]);
    };
    virus(x + Math.floor(w * 0.5), y + Math.floor(h * 0.42), 13);
    virus(x + Math.floor(w * 0.22), y + Math.floor(h * 0.75), 8);
    virus(x + Math.floor(w * 0.8), y + Math.floor(h * 0.72), 7);
    for (const [sx, sy] of [[0.15, 0.2], [0.85, 0.25], [0.3, 0.9]] as const) {
      circle(x + Math.floor(w * sx), y + Math.floor(h * sy), 2, [200, 90, 100]);
    }
  } else if (id === 12) {
    // Darwin quake: seismograph trace, buildings, crack.
    rect(x, y, w, h, [25, 28, 40]);
    rect(x + Math.floor(w * 0.12), y + Math.floor(h * 0.3), Math.floor(w * 0.2), Math.floor(h * 0.5), [90, 100, 120]);
    rect(x + Math.floor(w * 0.4), y + Math.floor(h * 0.2), Math.floor(w * 0.2), Math.floor(h * 0.6), [110, 120, 140]);
    rect(x + Math.floor(w * 0.68), y + Math.floor(h * 0.38), Math.floor(w * 0.2), Math.floor(h * 0.42), [90, 100, 120]);
    for (const [wx, wy] of [[0.16, 0.4], [0.24, 0.4], [0.44, 0.3], [0.52, 0.3], [0.72, 0.48], [0.8, 0.48]] as const) {
      rect(x + Math.floor(w * wx), y + Math.floor(h * wy), 4, 4, [200, 200, 120]);
    }
    const trace: [number, number][] = [
      [0, 0.55], [0.1, 0.55], [0.16, 0.35], [0.2, 0.75], [0.24, 0.45], [0.3, 0.6],
      [0.38, 0.55], [0.44, 0.3], [0.48, 0.8], [0.52, 0.45], [0.6, 0.55], [0.68, 0.4],
      [0.72, 0.7], [0.78, 0.5], [0.86, 0.55], [1, 0.55],
    ];
    for (let i = 0; i + 1 < trace.length; i++) {
      line(x + Math.floor(w * trace[i][0]), y + Math.floor(h * trace[i][1]), x + Math.floor(w * trace[i + 1][0]), y + Math.floor(h * trace[i + 1][1]), [120, 230, 120], 2);
    }
    line(x + Math.floor(w * 0.55), y + h - 1, x + Math.floor(w * 0.5), y + Math.floor(h * 0.82), [220, 180, 60], 2);
    line(x + Math.floor(w * 0.5), y + Math.floor(h * 0.82), x + Math.floor(w * 0.58), y + Math.floor(h * 0.86), [220, 180, 60], 2);
  } else if (id === 13) {
    // Deutsche Bank: document, falling red arrow, coins.
    rect(x, y, w, h, [20, 24, 44]);
    rect(x + Math.floor(w * 0.22), y + Math.floor(h * 0.14), Math.floor(w * 0.44), Math.floor(h * 0.62), [235, 240, 245]);
    rect(x + Math.floor(w * 0.22), y + Math.floor(h * 0.14), Math.floor(w * 0.44), 6, [180, 60, 60]);
    for (let i = 0; i < 4; i++) {
      rect(x + Math.floor(w * 0.28), y + Math.floor(h * 0.3) + i * 9, Math.floor(w * 0.32), 3, [140, 150, 165]);
    }
    line(x + Math.floor(w * 0.78), y + Math.floor(h * 0.12), x + Math.floor(w * 0.78), y + Math.floor(h * 0.62), [220, 70, 70], 3);
    poly([[x + Math.floor(w * 0.78), y + Math.floor(h * 0.78)], [x + Math.floor(w * 0.7), y + Math.floor(h * 0.62)], [x + Math.floor(w * 0.86), y + Math.floor(h * 0.62)]], [220, 70, 70]);
    circle(x + Math.floor(w * 0.14), y + Math.floor(h * 0.82), 7, [232, 192, 90]);
    circle(x + Math.floor(w * 0.24), y + Math.floor(h * 0.86), 7, [232, 192, 90]);
    circle(x + Math.floor(w * 0.19), y + Math.floor(h * 0.76), 7, [240, 205, 110]);
  }
}

const BG: [number, number, number] = [13, 21, 38];
const HEADER_BG: [number, number, number] = [11, 18, 32];
const CELL_BG: [number, number, number] = [22, 35, 61];
const GOLD: [number, number, number] = [232, 192, 90];
const WHITE: [number, number, number] = [240, 244, 250];
const SUB_GRAY: [number, number, number] = [184, 196, 216];
const FOOT_GRAY: [number, number, number] = [159, 176, 200];

function render(): void {
  fill(BG[0], BG[1], BG[2]);

  // Header band.
  rect(0, 0, W, 104, HEADER_BG);
  drawTextCentered('THE WORLD IN ONE DAY', W / 2, 8, 2, GOLD);
  drawTextCentered('TUESDAY, 17 NOVEMBER 2026', W / 2, 28, 5, WHITE);
  drawTextCentered('47 STORIES - 7 REGIONS - 11 FIELDS - ALL FROM TUESDAY', W / 2, 68, 2, SUB_GRAY);
  drawTextCentered('EUROPE 13 - ASIA 13 - AMERICAS 6 - MIDDLE EAST 5 - AFRICA 4 - OCEANIA 4 - GLOBAL 2', W / 2, 86, 2, SUB_GRAY);
  rect(0, 104, W, 4, GOLD);

  // Panel rows: row 1 has 3 large panels, rows 2-3 have 5 panels each.
  const margin = 20;
  const row1Y = 112;
  const row1H = 192;
  const row1W = 320;
  const row1G = 12;
  const row23Y = [316, 482];
  const row23H = 154;
  const row23W = 188;
  const row23G = 11;
  for (let i = 0; i < PANELS.length; i++) {
    const p = PANELS[i];
    let x: number;
    let y: number;
    let pw: number;
    let ph: number;
    let imgH: number;
    let big: boolean;
    if (i < 3) {
      x = margin + i * (row1W + row1G);
      y = row1Y;
      pw = row1W;
      ph = row1H;
      imgH = 96;
      big = true;
    } else {
      const j = i - 3;
      const row = Math.floor(j / 5);
      const col = j % 5;
      x = margin + col * (row23W + row23G);
      y = row23Y[row];
      pw = row23W;
      ph = row23H;
      imgH = 80;
      big = false;
    }
    rect(x, y, pw, ph, CELL_BG);
    drawScene(p.scene, x, y, pw, imgH);
    // Tag chip (top-left of the image) and number badge (top-right).
    const tagW = textWidth(p.tag, 2) + 10;
    rect(x + 5, y + 5, tagW, 18, [10, 14, 24]);
    drawText(p.tag, x + 10, y + 8, 2, p.color);
    circle(x + pw - 14, y + 14, 10, GOLD);
    const numS = String(i + 1);
    drawText(numS, x + pw - 14 - Math.floor(textWidth(numS, 1) / 2), y + 11, 1, [13, 21, 38]);
    if (big) {
      const headLines = wrap(p.head, 3, pw - 16);
      let hy = y + 104;
      for (const ln of headLines) {
        drawText(ln, x + 8, hy, 3, WHITE);
        hy += 24;
      }
      const subLines = wrap(p.sub, 2, pw - 16);
      let sy = y + 156;
      for (const ln of subLines) {
        drawText(ln, x + 8, sy, 2, SUB_GRAY);
        sy += 17;
      }
    } else {
      const headLines = wrap(p.head, 2, pw - 12);
      let hy = y + 84;
      for (const ln of headLines) {
        drawText(ln, x + 6, hy, 2, WHITE);
        hy += 17;
      }
      const subLines = wrap(p.sub, 2, pw - 12);
      let sy = y + 122;
      for (const ln of subLines) {
        drawText(ln, x + 6, sy, 2, SUB_GRAY);
        sy += 17;
      }
    }
  }

  // Bottom row A: world map (left) + "also on Tuesday" list (right).
  const boxAY = 648;
  const boxAH = 200;
  rect(margin, boxAY, 400, boxAH, CELL_BG);
  drawText('WHERE THE BIG STORIES HAPPENED', margin + 8, boxAY + 8, 2, GOLD);
  const mapX = margin + 10;
  const mapY = boxAY + 28;
  for (const [row, c0, c1] of LAND) {
    for (let col = c0; col <= c1; col++) {
      circle(mapX + col * 10 + 5, mapY + row * 10 + 5, 2, [120, 140, 170]);
    }
  }
  for (const d of DOTS) {
    const tx = mapX + Math.round(((d.lon + 180) * 380) / 360);
    const ty = mapY + Math.round(((90 - d.lat) * 130) / 180);
    const dx2 = tx + d.dx;
    const dy2 = ty + d.dy;
    if (d.dx !== 0 || d.dy !== 0) line(tx, ty, dx2, dy2, [150, 160, 180], 1);
    circle(dx2, dy2, 7, [217, 79, 61]);
    const ns = String(d.n);
    drawText(ns, dx2 - Math.floor(textWidth(ns, 1) / 2), dy2 - 3, 1, WHITE);
  }
  drawText('RED DOTS: THE 13 BIG STORIES, NUMBERED AS ABOVE', margin + 8, boxAY + 184, 1, FOOT_GRAY);

  rect(436, boxAY, 568, boxAH, CELL_BG);
  drawText('ALSO ON TUESDAY 17 NOVEMBER', 444, boxAY + 8, 2, GOLD);
  const colX = [444, 728];
  for (let i = 0; i < MORE.length; i++) {
    const col = i < 17 ? 0 : 1;
    const row = i % 17;
    const x = colX[col];
    const yy = boxAY + 32 + row * 10;
    const s = MORE[i];
    const sp = s.indexOf(' ');
    const num = s.slice(0, sp);
    const rest = s.slice(sp);
    drawText(num, x, yy, 1, GOLD);
    drawText(rest, x + textWidth(num + ' ', 1), yy, 1, WHITE);
  }

  // Bottom row B: field breakdown (left) + date-check footer (right).
  const boxBY = 860;
  const boxBH = 164;
  rect(margin, boxBY, 400, boxBH, CELL_BG);
  drawText('STORIES BY FIELD', margin + 8, boxBY + 8, 2, GOLD);
  for (let i = 0; i < FIELDS.length; i++) {
    const f = FIELDS[i];
    const ry = boxBY + 30 + i * 12;
    drawText(f.name, margin + 8, ry, 1, FOOT_GRAY);
    const barW = Math.round((f.n / 8) * 170);
    rect(margin + 158, ry + 1, barW, 7, f.color);
    drawText(String(f.n), margin + 158 + barW + 6, ry, 1, GOLD);
  }

  rect(436, boxBY, 568, boxBH, CELL_BG);
  drawText('DATE CHECK', 444, boxBY + 8, 2, GOLD);
  const footLines = [
    'Left out - first reported before 17 Nov:',
    'Ebola 11,000 cases (10 Nov), Fela Kuti',
    'Hall of Fame (14 Nov), Haiti (15 Nov),',
    'Hormuz (15-16 Nov), California waves.',
    'Every story here happened or was first',
    'reported on Tue 17 Nov 2026. Claims are',
    'marked as claims.',
  ];
  let fy = boxBY + 30;
  for (const ln of footLines) {
    drawText(ln, 444, fy, 2, FOOT_GRAY);
    fy += 17;
  }
  drawText('Sources: Reuters, AP, AFP, BBC, Al Jazeera, WHO, UN, PAHO, USGS, Le Monde, RNZ, SCMP.', 444, boxBY + 150, 1, FOOT_GRAY);
}

function main(): void {
  render();
  const png = encodePNG();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.png'), png);
  console.log(`wrote entry.png: ${png.length} bytes, ${W}x${H}`);
}

main();
