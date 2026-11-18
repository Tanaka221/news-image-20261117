// world-news-17-nov-2026: renders a 1024x1024 poster summing up Tuesday 17 November
// 2026's world news as a PNG, drawn entirely in code (Node 22, standard library only).
// 18 stories: 6 main panels plus a 12-item "also on Tuesday" list.
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
// The day's news: Tuesday 17 November 2026. Six main stories, across regions
// and fields, each as reported that day. Subs are kept to two wrapped lines
// inside a 200px cell, so wording is kept to what was reported, tightly.
// ---------------------------------------------------------------------------
type Story = { tag: string; color: [number, number, number]; head: string; sub: string };

const STORIES: Story[] = [
  {
    tag: 'UKRAINE',
    color: [232, 163, 61],
    head: 'KERCH BRIDGE ROAD SPAN FALLS',
    sub: 'Ukraine strike drops road arch into the strait; rail line hit too.',
  },
  {
    tag: 'MIDDLE EAST',
    color: [217, 79, 61],
    head: 'IRAN DRONES TARGET US BASE IN BAHRAIN',
    sub: 'Bahrain and US say drones downed; Iran claims a hit. No damage.',
  },
  {
    tag: 'GAZA',
    color: [61, 184, 166],
    head: 'UN WARNS OF GAZA WINTER EMERGENCY',
    sub: 'UN: 1.7M displaced; 1.4M face acute hunger.',
  },
  {
    tag: 'ASIA-PACIFIC',
    color: [91, 141, 239],
    head: 'RUSSIAN PLANES ENTER JAPANESE AIRSPACE',
    sub: 'Tokyo scrambles jets, protests after planes cross its airspace.',
  },
  {
    tag: 'EUROPE',
    color: [155, 126, 222],
    head: 'FIVE EU STATES PLAN RWANDA RETURN HUB',
    sub: 'Five EU states plan a return hub in Rwanda for rejected asylum seekers.',
  },
  {
    tag: 'TECH & TRADE',
    color: [111, 191, 90],
    head: 'US TIGHTENS CHIP EXPORTS TO CHINA',
    sub: 'New rule closes a loophole on data centres renting power to China.',
  },
];

// Twelve more stories from the same day, each verified from at least two
// sources (wires: Reuters, AP, AFP, BBC, Al Jazeera, WHO, UN, PAHO, USGS).
// One line each, numbered 7-18, shown in two columns. Wording is my own.
// Sources per item: 7 MLQ/The Hindu (Quad met in Manila, Trump says mineral
// deals signed); 8 UN News + Reuters (WHO: 11,000+ cases, 5,400 deaths);
// 9 PAHO + Reuters (US, Mexico, Bolivia lose measles-free status);
// 10 Nvidia release + Motley Fool (revenue $115.8bn, doubled);
// 11 Montsame + AP/AFP (Khurelsukh says he will resign, denies graft claim);
// 12 Reuters (Student List, 140 of 250 seats, sworn in 17 Nov);
// 13 Reuters + AP (Defence Ministry: all 19 killed, fault suspected);
// 14 AP + Al Jazeera (Mondlane trial opens in Maputo, 5 charges, denies all);
// 15 Le Monde + Guardian live (first draft splits over fossil fuels);
// 16 Le Monde + AFP (Interior Ministry 146,000; CGT over 500,000);
// 17 AP + Reuters (Board of Peace report to UN Security Council, 17 Nov);
// 18 USGS + BMKG/Bureau of Meteorology (M6.6, felt in Darwin, no tsunami).
const MORE: string[] = [
  '7 Quad: leaders meet in Manila',
  '8 Congo: Ebola cases pass 11,000',
  '9 Measles: 3 nations lose free status',
  '10 Nvidia: sales double to 115.8bn',
  '11 Mongolia: president to resign',
  '12 Serbia: student MPs take their seats',
  '13 Siberia: An-12 crash kills all 19',
  '14 Maputo: opposition leader on trial',
  '15 COP31: draft splits on fossil fuels',
  '16 France: 146,000 march in pay strike',
  '17 Gaza: truce at risk, board warns',
  '18 Darwin: M6.6 quake felt; no tsunami',
];

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
  rect(0, 0, W, 144, HEADER_BG);
  drawTextCentered('THE WORLD IN ONE DAY', W / 2, 22, 3, GOLD);
  drawTextCentered('TUESDAY, 17 NOVEMBER 2026', W / 2, 54, 6, WHITE);
  drawTextCentered('18 STORIES - 6 CONTINENTS - ALL FROM TUESDAY', W / 2, 112, 2, SUB_GRAY);
  rect(0, 140, W, 4, GOLD);

  // Story grid: 2 columns x 3 rows.
  const margin = 24;
  const gutter = 14;
  const cellW = Math.floor((W - margin * 2 - gutter) / 2);
  const cellH = 200;
  const y0 = 156;
  for (let i = 0; i < STORIES.length; i++) {
    const s = STORIES[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (cellW + gutter);
    const y = y0 + row * (cellH + gutter);
    rect(x, y, cellW, cellH, CELL_BG);
    rect(x, y, 10, cellH, s.color);
    // Tag + story number + accent underline.
    drawText(s.tag, x + 28, y + 18, 2, s.color);
    drawText(String(i + 1), x + cellW - 40, y + 16, 3, s.color);
    rect(x + 28, y + 38, 48, 3, s.color);
    // Headline, wrapped, scale 4.
    const headLines = wrap(s.head, 4, cellW - 28 - 24);
    let hy = y + 48;
    for (const ln of headLines) {
      drawText(ln, x + 28, hy, 4, WHITE);
      hy += 32;
    }
    // Sub, wrapped, scale 2.
    const subLines = wrap(s.sub, 2, cellW - 28 - 24);
    let sy = hy + 10;
    for (const ln of subLines) {
      drawText(ln, x + 28, sy, 2, SUB_GRAY);
      sy += 17;
    }
  }

  // Also-on-Tuesday list: 12 more stories, 2 columns x 6 rows.
  drawText('ALSO ON TUESDAY 17 NOVEMBER', margin, 800, 2, GOLD);
  rect(margin, 820, W - margin * 2, 2, GOLD);
  const colX = [margin, margin + cellW + gutter];
  for (let i = 0; i < MORE.length; i++) {
    const col = i < 6 ? 0 : 1;
    const row = i % 6;
    const x = colX[col];
    const y = 832 + row * 19;
    const s = MORE[i];
    const sp = s.indexOf(' ');
    const num = s.slice(0, sp);
    const rest = s.slice(sp);
    drawText(num, x, y, 2, GOLD);
    drawText(rest, x + textWidth(num + ' ', 2), y, 2, WHITE);
  }

  // Footer.
  drawTextCentered('Every story here happened or was first reported on Tuesday 17 November 2026.', W / 2, 956, 2, FOOT_GRAY);
  drawTextCentered('Contested claims are marked as claims.', W / 2, 974, 2, FOOT_GRAY);
  drawTextCentered('Sources: Reuters, AP, AFP, BBC, Al Jazeera, WHO, UN, PAHO, USGS, Le Monde, Nvidia.', W / 2, 992, 2, FOOT_GRAY);
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
