#!/usr/bin/env node
/**
 * Generate placeholder PNGs for Take-the-Tour modal (H2, Sprint 004).
 * Uses only Node built-ins (Buffer + zlib). One-shot, safe to delete/re-run.
 *
 * Each placeholder is a solid-color PNG at the aspect ratio of the viewport
 * each tour step documents (per Operator Ruling A-7, Sprint 004 Wave 3a).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC table for PNG chunks
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/**
 * Write a solid-color PNG of width x height in RGB.
 * Color given as [r,g,b]. Uses filter type 0 (None) per scanline.
 */
function writeSolidPng(filePath, width, height, [r, g, b]) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR: 13 bytes
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);       // bit depth
  ihdr.writeUInt8(2, 9);       // color type 2 = RGB
  ihdr.writeUInt8(0, 10);      // compression
  ihdr.writeUInt8(0, 11);      // filter
  ihdr.writeUInt8(0, 12);      // interlace

  // IDAT: scanlines, each prefixed by filter byte 0
  const rowLen = 1 + width * 3;
  const raw = Buffer.alloc(rowLen * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowLen] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const o = y * rowLen + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const idat = zlib.deflateSync(raw);

  const png = Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  fs.writeFileSync(filePath, png);
}

// Each placeholder is a tiny representation — real dimensions are documented
// in-code (A-7 annotation). We render at 1/10 scale so the PNG bytes stay small
// while preserving aspect ratio. CSS will scale to container at runtime.
const SCALE = 0.1;

const PLACEHOLDERS = [
  // BROWSE deck
  { file: 'browse-step-1-placeholder.png', viewport: 'desktop',  w: 1440, h: 900, color: [0xEE, 0xEE, 0xEE] },
  { file: 'browse-step-2-placeholder.png', viewport: 'slideout', w:  560, h: 900, color: [0xE4, 0xE8, 0xEE] },
  { file: 'browse-step-3-placeholder.png', viewport: 'desktop',  w: 1440, h: 900, color: [0xEE, 0xEE, 0xEE] },
  { file: 'browse-step-4-placeholder.png', viewport: 'desktop',  w: 1440, h: 900, color: [0xEE, 0xEE, 0xEE] },
  { file: 'browse-step-5-placeholder.png', viewport: 'desktop',  w: 1440, h: 900, color: [0xEE, 0xEE, 0xEE] },
  // GRITFIT deck
  { file: 'gritfit-step-1-placeholder.png', viewport: 'desktop',  w: 1440, h: 900, color: [0xEE, 0xEE, 0xEE] },
  { file: 'gritfit-step-2-placeholder.png', viewport: 'desktop',  w: 1440, h: 900, color: [0xEE, 0xEE, 0xEE] },
  { file: 'gritfit-step-3-placeholder.png', viewport: 'desktop',  w: 1440, h: 900, color: [0xEE, 0xEE, 0xEE] },
  { file: 'gritfit-step-4-placeholder.png', viewport: 'slideout', w:  560, h: 900, color: [0xE4, 0xE8, 0xEE] },
  { file: 'gritfit-step-5-placeholder.png', viewport: 'desktop',  w: 1440, h: 900, color: [0xEE, 0xEE, 0xEE] },
];

const outDir = path.resolve(__dirname, '..', 'public', 'tour');
fs.mkdirSync(outDir, { recursive: true });

for (const p of PLACEHOLDERS) {
  const renderW = Math.max(1, Math.round(p.w * SCALE));
  const renderH = Math.max(1, Math.round(p.h * SCALE));
  const target = path.join(outDir, p.file);
  writeSolidPng(target, renderW, renderH, p.color);
  console.log(`wrote ${p.file} (${renderW}x${renderH} @ 1:10 scale; target ${p.w}x${p.h} ${p.viewport})`);
}
