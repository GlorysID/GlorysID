#!/usr/bin/env node
/**
 * generate-assets.mjs — POKÉDEX // TRAINER PROFILE asset factory
 * ----------------------------------------------------------------
 * Zero-dependency Node script. Generates hand-drawn pixel-art SVGs
 * (rect grids from string maps) with internal CSS @keyframes + SMIL
 * animation into ../assets. All animation lives INSIDE the SVG files,
 * so it survives GitHub's <img> embedding (no scripts, no external
 * fonts, no external anything).
 *
 * Run:  node scripts/generate-assets.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets');

/* ------------------------------------------------------------------ */
/*  PALETTE — deep night navy + FireRed/LeafGreen primaries            */
/* ------------------------------------------------------------------ */
const C = {
  bg0: '#0b0d17', bg1: '#10121f', bg2: '#1a1c2c', bg3: '#24273d',
  line: '#3a3f5c', lineSoft: '#2a2e45',
  yellow: '#ffcb05', yellowHi: '#ffe27a', yellowDim: '#c9a227',
  red: '#ee1515', redHi: '#ff6b6b', redDim: '#8f1d1d',
  blue: '#3b4cca', blueHi: '#7c8ff0', blueDim: '#2a348f',
  white: '#f4f4f8', cream: '#fff6d8',
  grass1: '#1d3a2a', grass2: '#2f5d3a', grass3: '#4a8a52',
  star: '#fff3b0', ember: '#ff9d47',
  ink: '#05060a',
};

const MONO = `ui-monospace,'Cascadia Mono','Lucida Console',Consolas,Menlo,monospace`;

/* ------------------------------------------------------------------ */
/*  tiny helpers                                                       */
/* ------------------------------------------------------------------ */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');

/**
 * Render a string-map sprite as one merged <path> per colour.
 * map: array of row strings. palette: { char: fill }.
 * Any char not in the palette is skipped (transparent).
 * Horizontal same-colour runs are merged into single rects.
 */
function px(map, palette, { x = 0, y = 0, s = 1, cls = '', opacity = 1 } = {}) {
  const byColor = {};
  for (let r = 0; r < map.length; r++) {
    const row = map[r];
    let c = 0;
    while (c < row.length) {
      const ch = row[c];
      const fill = palette[ch];
      if (!fill) { c++; continue; }
      let w = 1;
      while (c + w < row.length && row[c + w] === ch) w++;
      (byColor[fill] ||= []).push([c, r, w]);
      c += w;
    }
  }
  const parts = Object.entries(byColor).map(([fill, runs]) => {
    const d = runs.map(([rx, ry, rw]) => `M${x + rx * s} ${y + ry * s}h${rw * s}v${s}h${-rw * s}z`).join('');
    return `<path d="${d}" fill="${fill}"/>`;
  });
  const attrs = (cls ? ` class="${cls}"` : '') + (opacity !== 1 ? ` opacity="${opacity}"` : '');
  return `<g${attrs}>${parts.join('')}</g>`;
}

const svgOpen = (w, h, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"${extra}>`;

const styleBlock = (css) => `<style><![CDATA[\n${css.trim()}\n]]></style>`;

/* deterministic pseudo-random */
function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/*  SHARED PIXEL SPRITES                                               */
/* ------------------------------------------------------------------ */

/* Pokéball, 12x12 grid: red top, white bottom, dark band + button */
const POKEBALL2 = [
  '...RRRRRR...',
  '..RRRRRRRR..',
  '.RRRRRRRRRR.',
  'RRRRRRRRRRRR',
  'RRRRRRRRRRRR',
  'KKKKKKKKKKKK',
  'KKKKKWWKKKKK',
  'KKKKWBWBKKKK',
  'KKKKKWWKKKKK',
  'WWWWWWWWWWWW',
  '.WWWWWWWWWW.',
  '..WWWWWWWW..',
];
const POKEBALL2_PAL = { R: C.red, K: C.ink, W: C.white, B: C.blue };

/* Pikachu — 16x16, facing right. Two walk frames share the body;
   legs/tail swap via separate overlays. */
const PIKA_BODY = [
  '................',
  '.K..........K...',
  '.KK........KK...',
  '.KBK......KBK...',
  '.KBBK....KBBK...',
  '..KBBBBBBBBK....',
  '..KBBBBBBBBK....',
  '.KBBBBBBBBBBK...',
  '.KBRBBBBBBRBK...',
  '.KBBKBBBBKBBK...',
  '..KBBBKKBBBK....',
  '..KBBBBBBBBK....',
  '.KBBBBBBBBBBK...',
  '.KBBBBBBBBBBK...',
  '..KBBBBBBBBK....',
  '................',
];
const PIKA_PAL = { K: C.ink, B: C.yellow, R: C.redHi };
const PIKA_LEGS_A = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '...KK....KK.....',
];
const PIKA_LEGS_B = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..KK......KK....',
];
const PIKA_TAIL = [
  '............KK..',
  '...........KBBK.',
  '..........KBBK..',
  '.........KBBK...',
  '........KBBBK...',
  '.......KBBBK....',
  '......KBBBK.....',
  '.....KBBBK......',
  '....KBBBK.......',
  '...KBBBK........',
  '..KBBBK.........',
  '.KBBBK..........',
  '.KBBK...........',
  '..KK............',
  '................',
  '................',
];

/* Star sparkle, 5x5 */
const SPARK = ['..Y..', '.Y.Y.', 'YYYYY', '.Y.Y.', '..Y..'];
const SPARK_PAL = { Y: C.star };

/* Heart, 7x6 */
const HEART = ['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'];
const HEART_PAL = { R: C.redHi };

/* ------------------------------------------------------------------ */
/*  1. BANNER — 1012x220 night scene                                   */
/* ------------------------------------------------------------------ */
function banner() {
  const W = 1012, H = 220;
  const rand = rng(20260818);

  /* stars */
  const stars = [];
  for (let i = 0; i < 46; i++) {
    const sx = Math.round(rand() * (W - 8)) + 4;
    const sy = Math.round(rand() * 118) + 6;
    const size = rand() > 0.82 ? 3 : 2;
    const delay = (rand() * 4).toFixed(2);
    const dur = (2.4 + rand() * 2.6).toFixed(2);
    stars.push(
      `<rect class="tw" x="${sx}" y="${sy}" width="${size}" height="${size}" fill="${rand() > 0.5 ? C.star : C.white}" style="animation-delay:${delay}s;animation-duration:${dur}s"/>`
    );
  }

  /* far skyline (dark shapes) */
  const skyline = [];
  let bx = -10;
  while (bx < W + 20) {
    const bw = 26 + Math.floor(rand() * 5) * 12;
    const bh = 22 + Math.floor(rand() * 4) * 14;
    skyline.push(`<rect x="${bx}" y="${168 - bh}" width="${bw}" height="${bh}" fill="${C.bg2}"/>`);
    /* lit windows */
    const cols = Math.floor(bw / 12);
    const rows = Math.floor(bh / 14);
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        if (rand() > 0.78) {
          const wx = bx + 5 + cx * 12;
          const wy = 168 - bh + 5 + cy * 14;
          const lit = rand() > 0.5 ? C.yellowDim : C.blueDim;
          skyline.push(`<rect class="win" x="${wx}" y="${wy}" width="4" height="6" fill="${lit}" style="animation-delay:${(rand() * 6).toFixed(2)}s"/>`);
        }
      }
    }
    bx += bw + 6 + Math.floor(rand() * 3) * 8;
  }

  /* drifting pixel clouds */
  const cloud = (x, y, s, cls) => {
    const m = [
      '...CCCCC....',
      '..CCCCCCCC..',
      '.CCCCCCCCCC.',
      'CCCCCCCCCCCC',
    ];
    return px(m, { C: C.bg3 }, { x, y, s, cls });
  };

  /* tall grass strip */
  const grass = [];
  for (let gx = 0; gx < W; gx += 8) {
    const h1 = 8 + Math.floor(rand() * 3) * 4;
    grass.push(`<rect x="${gx}" y="${H - h1}" width="4" height="${h1}" fill="${C.grass1}"/>`);
    if (rand() > 0.5) grass.push(`<rect x="${gx + 4}" y="${H - h1 + 4}" width="4" height="${h1 - 4}" fill="${C.grass2}"/>`);
  }
  for (let gx = 0; gx < W; gx += 16) {
    grass.push(`<rect x="${gx + 2}" y="${H - 16 - Math.floor(rand() * 2) * 4}" width="4" height="8" fill="${C.grass3}"/>`);
  }

  /* walking pikachu: body + tail bob, legs swap via steps() opacity */
  const pikachu = `
  <g class="walker">
    <g transform="translate(0,0)">
      ${px(PIKA_TAIL, PIKA_PAL, { x: 0, y: 0, s: 3, cls: 'tail' })}
      ${px(PIKA_BODY, PIKA_PAL, { x: 0, y: 0, s: 3 })}
      ${px(PIKA_LEGS_A, PIKA_PAL, { x: 0, y: 0, s: 3, cls: 'legsA' })}
      ${px(PIKA_LEGS_B, PIKA_PAL, { x: 0, y: 0, s: 3, cls: 'legsB' })}
    </g>
  </g>`;

  /* floating pokeball */
  const ball = `
  <g class="ball-float">
    ${px(POKEBALL2, POKEBALL2_PAL, { x: 0, y: 0, s: 3 })}
    <g class="ball-shine">${px([
      '.W....',
      'W.....',
    ], { W: C.white }, { x: 6, y: 6, s: 3 })}</g>
  </g>`;

  const css = `
    .px-text { font-family: ${MONO}; font-weight: 700; }
    .tw { animation: twinkle 3s steps(2) infinite; }
    @keyframes twinkle { 0%,100% { opacity: .25 } 50% { opacity: 1 } }
    .win { animation: winflicker 7s steps(2) infinite; }
    @keyframes winflicker { 0%,92%,100% { opacity: 1 } 94%,96% { opacity: .2 } }
    .cloud-a { animation: drift-a 46s linear infinite; }
    .cloud-b { animation: drift-b 64s linear infinite; }
    @keyframes drift-a { from { transform: translateX(-160px) } to { transform: translateX(1180px) } }
    @keyframes drift-b { from { transform: translateX(1180px) } to { transform: translateX(-220px) } }
    .walker { animation: walk-x 26s linear infinite; }
    @keyframes walk-x { from { transform: translateX(-70px) } to { transform: translateX(1090px) } }
    .tail { animation: tail-bob .5s steps(2) infinite; transform-box: fill-box; transform-origin: center bottom; }
    @keyframes tail-bob { 0%,100% { transform: rotate(0deg) } 50% { transform: rotate(-4deg) } }
    .legsA { animation: stepA .44s steps(1) infinite; }
    .legsB { animation: stepB .44s steps(1) infinite; }
    @keyframes stepA { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
    @keyframes stepB { 0%,49% { opacity: 0 } 50%,100% { opacity: 1 } }
    .ball-float { animation: bob 3.2s ease-in-out infinite; }
    @keyframes bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-9px) } }
    .ball-shine { animation: shineblink 3.2s steps(2) infinite; }
    @keyframes shineblink { 0%,70%,100% { opacity: 1 } 75%,90% { opacity: 0 } }
    .title-glow { animation: glowpulse 4s ease-in-out infinite; }
    @keyframes glowpulse { 0%,100% { opacity: .55 } 50% { opacity: .95 } }
    .cursor { animation: blink 1s steps(1) infinite; }
    @keyframes blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
    .spark1 { animation: sparkle 2.6s steps(2) infinite; }
    .spark2 { animation: sparkle 2.6s steps(2) infinite .9s; }
    .spark3 { animation: sparkle 2.6s steps(2) infinite 1.7s; }
    @keyframes sparkle { 0%,100% { opacity: 0 } 40%,60% { opacity: 1 } }
  `;

  return `${svgOpen(W, H)}
<title>Anjali Saputra — Pokémon trainer banner</title>
<desc>Animated pixel night scene: twinkling stars, drifting clouds, city skyline, a walking Pikachu and a floating Pokéball under the trainer's name.</desc>
${styleBlock(css)}
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.bg0}"/>
    <stop offset=".62" stop-color="${C.bg1}"/>
    <stop offset="1" stop-color="${C.bg2}"/>
  </linearGradient>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.bg2}"/>
    <stop offset="1" stop-color="${C.bg0}"/>
  </linearGradient>
</defs>

<!-- sky -->
<rect width="${W}" height="${H}" fill="url(#sky)"/>

<!-- stars -->
<g>${stars.join('')}</g>

<!-- moon -->
<g>
  <rect x="866" y="22" width="26" height="26" fill="${C.cream}" opacity=".9"/>
  <rect x="860" y="28" width="38" height="14" fill="${C.cream}" opacity=".9"/>
  <rect x="866" y="20" width="26" height="4" fill="${C.cream}" opacity=".55"/>
  <rect x="872" y="30" width="6" height="6" fill="${C.bg2}" opacity=".35"/>
  <rect x="882" y="38" width="4" height="4" fill="${C.bg2}" opacity=".3"/>
</g>

<!-- clouds -->
<g class="cloud-a" opacity=".8">${cloud(0, 34, 4)}</g>
<g class="cloud-b" opacity=".55">${cloud(0, 72, 3)}</g>

<!-- skyline -->
<g>${skyline.join('')}</g>

<!-- ground -->
<rect y="168" width="${W}" height="${H - 168}" fill="url(#ground)"/>
<rect y="168" width="${W}" height="3" fill="${C.line}"/>

<!-- tall grass -->
<g>${grass.join('')}</g>

<!-- walking pikachu -->
<g transform="translate(0,158)">${pikachu}</g>

<!-- floating pokeball -->
<g transform="translate(70,116)">${ball}</g>

<!-- sparkles near title -->
<g transform="translate(300,40)">${px(SPARK, SPARK_PAL, { s: 3, cls: 'spark1' })}</g>
<g transform="translate(672,26)">${px(SPARK, SPARK_PAL, { s: 2, cls: 'spark2' })}</g>
<g transform="translate(784,56)">${px(SPARK, SPARK_PAL, { s: 2, cls: 'spark3' })}</g>

<!-- title block -->
<g>
  <text class="px-text title-glow" x="330" y="98" font-size="42" letter-spacing="6" fill="${C.yellow}" opacity=".35">ANJALI SAPUTRA</text>
  <text class="px-text" x="328" y="96" font-size="42" letter-spacing="6" fill="${C.yellow}">ANJALI SAPUTRA</text>
  <rect x="330" y="112" width="352" height="4" fill="${C.red}"/>
  <rect x="330" y="112" width="88" height="4" fill="${C.white}"/>
  <text class="px-text" x="330" y="140" font-size="14" letter-spacing="4" fill="${C.blueHi}">POKÉDEX NO. 001 — TRAINER</text>
  <text class="px-text" x="330" y="162" font-size="11" letter-spacing="3" fill="${C.white}" opacity=".72">AUTOMATION SPECIALIST · NIGHT-TYPE · INDONESIA</text>
  <rect class="cursor" x="782" y="150" width="8" height="13" fill="${C.yellow}"/>
</g>

<!-- corner pokeball deco -->
<g transform="translate(946,178)" opacity=".9">${px(POKEBALL2, POKEBALL2_PAL, { s: 2 })}</g>

<!-- scanlines -->
<rect width="${W}" height="${H}" fill="url(#scan)" opacity=".12"/>
<defs>
  <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
    <rect width="4" height="2" fill="${C.ink}"/>
  </pattern>
</defs>

<!-- frame -->
<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" fill="none" stroke="${C.line}" stroke-width="3"/>
<rect x="6.5" y="6.5" width="10" height="10" fill="${C.yellow}"/>
<rect x="${W - 16.5}" y="6.5" width="10" height="10" fill="${C.yellow}"/>
<rect x="6.5" y="${H - 16.5}" width="10" height="10" fill="${C.yellow}"/>
<rect x="${W - 16.5}" y="${H - 16.5}" width="10" height="10" fill="${C.yellow}"/>
</svg>`;
}

/* ------------------------------------------------------------------ */
/*  2. DIVIDER — 1012x28                                               */
/* ------------------------------------------------------------------ */
function divider() {
  const W = 1012, H = 28;
  const dashes = [];
  for (let x = 8; x < W - 8; x += 24) {
    dashes.push(`<rect x="${x}" y="12" width="12" height="4" fill="${C.line}"/>`);
  }
  const css = `
    .march { animation: march 1.1s steps(6) infinite; }
    @keyframes march { from { transform: translateX(0) } to { transform: translateX(24px) } }
    .roll { animation: roll-x 13s linear infinite; }
    @keyframes roll-x { from { transform: translateX(-30px) } to { transform: translateX(1042px) } }
    .spin { animation: spin 1.1s steps(8) infinite; transform-box: fill-box; transform-origin: center; }
    @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
    .dspark1 { animation: dsparkle 2.2s steps(2) infinite; }
    .dspark2 { animation: dsparkle 2.2s steps(2) infinite .7s; }
    .dspark3 { animation: dsparkle 2.2s steps(2) infinite 1.4s; }
    @keyframes dsparkle { 0%,100% { opacity: .15 } 45%,60% { opacity: 1 } }
  `;
  return `${svgOpen(W, H)}
<title>section divider</title>
${styleBlock(css)}
<rect width="${W}" height="${H}" fill="${C.bg1}"/>
<g class="march">${dashes.join('')}</g>
<rect x="0" y="12" width="8" height="4" fill="${C.red}"/>
<rect x="${W - 8}" y="12" width="8" height="4" fill="${C.red}"/>
<g transform="translate(236,2)">${px(SPARK, { Y: C.yellow }, { s: 2, cls: 'dspark1' })}</g>
<g transform="translate(500,14)">${px(SPARK, { Y: C.blueHi }, { s: 2, cls: 'dspark2' })}</g>
<g transform="translate(764,2)">${px(SPARK, { Y: C.yellow }, { s: 2, cls: 'dspark3' })}</g>
<g class="roll"><g class="spin">${px(POKEBALL2, POKEBALL2_PAL, { x: 0, y: 2, s: 2 })}</g></g>
</svg>`;
}

/* ------------------------------------------------------------------ */
/*  3. FOOTER — 1012x170                                               */
/* ------------------------------------------------------------------ */
function footer() {
  const W = 1012, H = 170;
  const rand = rng(777);
  const embers = [];
  for (let i = 0; i < 16; i++) {
    const ex = 30 + Math.round(rand() * (W - 60));
    const delay = (rand() * 7).toFixed(2);
    const dur = (5 + rand() * 4).toFixed(2);
    const size = rand() > 0.6 ? 4 : 3;
    const col = rand() > 0.5 ? C.ember : C.yellow;
    embers.push(
      `<rect class="ember" x="${ex}" y="${H - 14}" width="${size}" height="${size}" fill="${col}" style="animation-delay:${delay}s;animation-duration:${dur}s"/>`
    );
  }
  const stars = [];
  for (let i = 0; i < 14; i++) {
    const sx = Math.round(rand() * (W - 10)) + 4;
    const sy = Math.round(rand() * 46) + 6;
    stars.push(
      `<rect class="tw" x="${sx}" y="${sy}" width="2" height="2" fill="${C.star}" style="animation-delay:${(rand() * 4).toFixed(2)}s"/>`
    );
  }
  const css = `
    .px-text { font-family: ${MONO}; font-weight: 700; }
    .tw { animation: twinkle 3.4s steps(2) infinite; }
    @keyframes twinkle { 0%,100% { opacity: .2 } 50% { opacity: 1 } }
    .ember { animation: rise 6s linear infinite; }
    @keyframes rise {
      0% { transform: translateY(0); opacity: 0 }
      12% { opacity: 1 }
      80% { opacity: .9 }
      100% { transform: translateY(-128px); opacity: 0 }
    }
    .cursor { animation: blink 1s steps(1) infinite; }
    @keyframes blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
    .ball-wiggle { animation: wiggle 2.8s steps(2) infinite; transform-box: fill-box; transform-origin: center bottom; }
    @keyframes wiggle { 0%,100% { transform: rotate(0deg) } 25% { transform: rotate(-14deg) } 75% { transform: rotate(12deg) } }
    .heart-beat { animation: beat 1.6s steps(2) infinite; }
    @keyframes beat { 0%,100% { opacity: .75 } 50% { opacity: 1 } }
  `;
  return `${svgOpen(W, H)}
<title>footer — gotta commit em all</title>
<desc>Animated pixel footer with rising embers, twinkling stars and a blinking cursor.</desc>
${styleBlock(css)}
<rect width="${W}" height="${H}" fill="${C.bg0}"/>
<g>${stars.join('')}</g>
<rect y="${H - 12}" width="${W}" height="12" fill="${C.bg2}"/>
<rect y="${H - 12}" width="${W}" height="3" fill="${C.line}"/>
<g>${embers.join('')}</g>

<g transform="translate(120,58)"><g class="ball-wiggle">${px(POKEBALL2, POKEBALL2_PAL, { s: 3 })}</g></g>

<text class="px-text" x="${W / 2}" y="76" font-size="26" letter-spacing="5" fill="${C.yellow}" text-anchor="middle">GOTTA COMMIT &#8217;EM ALL!</text>
<g>
  <text class="px-text" x="${W / 2}" y="108" font-size="13" letter-spacing="4" fill="${C.blueHi}" text-anchor="middle">CONTINUE? &#8734;</text>
  <rect class="cursor" x="${W / 2 + 74}" y="96" width="9" height="14" fill="${C.yellow}"/>
</g>
<text class="px-text" x="${W / 2}" y="138" font-size="10" letter-spacing="3" fill="${C.white}" opacity=".6" text-anchor="middle">ANJALI SAPUTRA · GLORYSID · MADE WITH</text>
<g class="heart-beat" transform="translate(${W / 2 + 148},128)">${px(HEART, HEART_PAL, { s: 2 })}</g>

<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" fill="none" stroke="${C.line}" stroke-width="3"/>
</svg>`;
}

/* ------------------------------------------------------------------ */
/*  4. SECTION PLATES — 1012x64 headers                                */
/* ------------------------------------------------------------------ */
function plate({ num, title, accent = C.yellow, tag = '' }) {
  const W = 1012, H = 64;
  const css = `
    .px-text { font-family: ${MONO}; font-weight: 700; }
    .plate-ball { animation: pbob 2.6s ease-in-out infinite; }
    @keyframes pbob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
    .plate-spark { animation: psparkle 2.4s steps(2) infinite; }
    @keyframes psparkle { 0%,100% { opacity: .2 } 50% { opacity: 1 } }
    .cursor { animation: blink 1.1s steps(1) infinite; }
    @keyframes blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
  `;
  return `${svgOpen(W, H)}
<title>${esc(title)}</title>
${styleBlock(css)}
<rect width="${W}" height="${H}" fill="${C.bg1}"/>
<rect x="0" y="0" width="14" height="${H}" fill="${accent}"/>
<rect x="14" y="0" width="6" height="${H}" fill="${C.ink}"/>
<rect x="20" y="${H / 2 - 2}" width="120" height="4" fill="${C.line}"/>
<g transform="translate(44,14)"><g class="plate-ball">${px(POKEBALL2, POKEBALL2_PAL, { s: 3 })}</g></g>
<text class="px-text" x="104" y="30" font-size="11" letter-spacing="3" fill="${accent}">${esc(num)}</text>
<text class="px-text" x="104" y="50" font-size="20" letter-spacing="4" fill="${C.white}">${esc(title)}</text>
${tag ? `<text class="px-text" x="${W - 24}" y="40" font-size="10" letter-spacing="3" fill="${C.blueHi}" text-anchor="end" opacity=".85">${esc(tag)}</text>` : ''}
<g class="plate-spark" transform="translate(${W - 190},10)">${px(SPARK, { Y: accent }, { s: 2 })}</g>
<rect class="cursor" x="${W - 20}" y="${H / 2 - 6}" width="6" height="12" fill="${accent}"/>
<rect x="0" y="${H - 4}" width="${W}" height="4" fill="${C.bg2}"/>
<rect x="0" y="${H - 4}" width="220" height="4" fill="${accent}" opacity=".8"/>
</svg>`;
}

/* ------------------------------------------------------------------ */
/*  5. TRAINER PORTRAIT — 240x240                                      */
/* ------------------------------------------------------------------ */
function portrait() {
  const W = 240, H = 240;
  /* 16x16 trainer head, pixel scale 12 */
  const HEAD = [
    '....KKKKKKKK....',
    '..KKRRRRRRRRKK..',
    '.KRRRRRRRRRRRRK.',
    '.KRRRKKKKKKRRRK.',
    'KRRKKKKKKKKKKRRK',
    'KKKKKKKKKKKKKKKK',
    '..KKSSSSSSSSKK..',
    '..KSSSSSSSSSSK..',
    '..KSKKSSSSKKSK..',
    '..KSKKSSSSKKSK..',
    '..KSSSSSSSSSSK..',
    '..KSSSKKKKSSSK..',
    '...KSSSSSSSSK...',
    '....KKKKKKKK....',
    '......KKKK......',
    '................',
  ];
  const HEAD_PAL = { K: C.ink, R: C.red, S: '#f2c99b' };
  const css = `
    .scan-band { animation: scanmove 3.6s linear infinite; }
    @keyframes scanmove { from { transform: translateY(-40px) } to { transform: translateY(260px) } }
    .blink-eye { animation: eyeblink 4.2s steps(1) infinite; opacity: 0; }
    @keyframes eyeblink { 0%,93%,100% { opacity: 0 } 94%,97% { opacity: 1 } }
    .corner-pulse { animation: cpulse 2.2s steps(2) infinite; }
    @keyframes cpulse { 0%,100% { opacity: .5 } 50% { opacity: 1 } }
    .px-text { font-family: ${MONO}; font-weight: 700; }
  `;
  return `${svgOpen(W, H)}
<title>trainer portrait</title>
${styleBlock(css)}
<rect width="${W}" height="${H}" fill="${C.bg0}"/>
<rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="${C.bg2}"/>
<rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="none" stroke="${C.line}" stroke-width="2"/>
${px(HEAD, HEAD_PAL, { x: 24, y: 26, s: 12 })}
<g class="blink-eye">
  <rect x="60" y="122" width="24" height="24" fill="#f2c99b"/>
  <rect x="132" y="122" width="24" height="24" fill="#f2c99b"/>
</g>
<rect class="scan-band" x="10" y="0" width="${W - 20}" height="10" fill="${C.blueHi}" opacity=".14"/>
<rect class="corner-pulse" x="14" y="14" width="14" height="4" fill="${C.yellow}"/>
<rect class="corner-pulse" x="14" y="14" width="4" height="14" fill="${C.yellow}"/>
<rect class="corner-pulse" x="${W - 28}" y="${H - 18}" width="14" height="4" fill="${C.yellow}"/>
<rect class="corner-pulse" x="${W - 18}" y="${H - 28}" width="4" height="14" fill="${C.yellow}"/>
<text class="px-text" x="${W / 2}" y="${H - 20}" font-size="10" letter-spacing="3" fill="${C.yellow}" text-anchor="middle">TRAINER · LV.100</text>
</svg>`;
}

/* ------------------------------------------------------------------ */
/*  6. INTRO ACCENT — 460x36 animated underline for the typing hero    */
/* ------------------------------------------------------------------ */
function introAccent() {
  const W = 460, H = 36;

  /* base pixel dash line (sits low so the ball can rest on it) */
  const dashes = [];
  for (let x = 12; x < W - 12; x += 20) {
    dashes.push(`<rect x="${x}" y="26" width="10" height="4" fill="${C.lineSoft}"/>`);
  }

  /* travelling glint: a bright 3-dash segment sweeping across the line */
  const glint = [
    `<rect x="0" y="26" width="10" height="4" fill="${C.yellowDim}"/>`,
    `<rect x="20" y="26" width="10" height="4" fill="${C.yellow}"/>`,
    `<rect x="40" y="26" width="10" height="4" fill="${C.yellowHi}"/>`,
  ];

  const css = `
    .glint { animation: sweep 4.2s linear infinite; }
    @keyframes sweep { from { transform: translateX(-60px) } to { transform: translateX(${W + 10}px) } }
    .ball-bob { animation: bob 3.2s ease-in-out infinite; }
    @keyframes bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
    .spark-a { animation: twinkle 2.6s steps(2) infinite; }
    .spark-b { animation: twinkle 2.6s steps(2) infinite .85s; }
    .spark-c { animation: twinkle 2.6s steps(2) infinite 1.7s; }
    @keyframes twinkle { 0%,100% { opacity: .15 } 50% { opacity: 1 } }
  `;

  return `${svgOpen(W, H)}
<title>intro accent — pokéball resting on a pixel line</title>
<desc>A thin animated divider: a light glint sweeps along a dashed pixel line while a small Pokéball gently bobs at its centre.</desc>
${styleBlock(css)}
<rect width="${W}" height="${H}" fill="${C.bg1}"/>
<g>${dashes.join('')}</g>
<g class="glint">${glint.join('')}</g>
<rect x="0" y="26" width="8" height="4" fill="${C.red}"/>
<rect x="${W - 8}" y="26" width="8" height="4" fill="${C.red}"/>
<g transform="translate(${W / 2 - 12},2)"><g class="ball-bob">${px(POKEBALL2, POKEBALL2_PAL, { s: 2 })}</g></g>
<g transform="translate(96,6)">${px(SPARK, { Y: C.yellow }, { s: 2, cls: 'spark-a' })}</g>
<g transform="translate(352,8)">${px(SPARK, { Y: C.blueHi }, { s: 2, cls: 'spark-b' })}</g>
<g transform="translate(150,10)">${px(SPARK, { Y: C.star }, { s: 1, cls: 'spark-c' })}</g>
<rect x="0" y="0" width="${W}" height="2" fill="${C.lineSoft}" opacity=".6"/>
<rect x="0" y="${H - 2}" width="${W}" height="2" fill="${C.lineSoft}" opacity=".6"/>
</svg>`;
}

/* ------------------------------------------------------------------ */
/*  write everything                                                   */
/* ------------------------------------------------------------------ */
mkdirSync(OUT, { recursive: true });

const files = {
  'banner.svg': banner(),
  'divider.svg': divider(),
  'footer.svg': footer(),
  'plate-trainer-card.svg': plate({ num: 'TM.01', title: 'TRAINER CARD', accent: C.yellow, tag: 'SAVE DATA LOADED' }),
  'plate-party.svg': plate({ num: 'TM.02', title: 'PARTY', accent: C.red, tag: '6/6 READY' }),
  'plate-quest-log.svg': plate({ num: 'TM.03', title: 'QUEST LOG', accent: C.blueHi, tag: 'AUTO-SAVING...' }),
  'plate-skill-tree.svg': plate({ num: 'TM.04', title: 'SKILL TREE', accent: C.yellow, tag: 'ALL MOVES LEARNED' }),
  'plate-battle-stats.svg': plate({ num: 'TM.05', title: 'BATTLE STATS', accent: C.red, tag: 'LIVE FEED' }),
  'plate-coop.svg': plate({ num: 'TM.06', title: 'CO-OP LINK', accent: C.blueHi, tag: 'TRADE / BATTLE / CO-OP' }),
  'portrait.svg': portrait(),
  'intro-accent.svg': introAccent(),
};

for (const [name, content] of Object.entries(files)) {
  const p = join(OUT, name);
  writeFileSync(p, content, 'utf8');
  console.log(`  wrote assets/${name}  (${content.length} bytes)`);
}
console.log(`\nDone. ${Object.keys(files).length} SVG assets generated in ${OUT}`);
