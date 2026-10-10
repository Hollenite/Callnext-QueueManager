import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public");

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x, y, size);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function iconPaint(x, y, size) {
  const ink = [18, 38, 58, 255];
  const porcelain = [244, 246, 248, 255];
  const ticket = [200, 30, 30, 255];
  const cx = (x + 0.5) / size;
  const cy = (y + 0.5) / size;
  const dx = cx - 0.5;
  const dy = cy - 0.5;
  const r = Math.hypot(dx, dy);
  if (r > 0.48) return [0, 0, 0, 0];
  if (r > 0.42) return ink;
  if (r < 0.16) return ticket;
  return porcelain;
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "icon-192.png"), png(192, iconPaint));
writeFileSync(join(outDir, "icon-512.png"), png(512, iconPaint));
writeFileSync(join(outDir, "apple-touch-icon.png"), png(180, iconPaint));
console.log("Wrote public/icon-192.png, icon-512.png, apple-touch-icon.png");
