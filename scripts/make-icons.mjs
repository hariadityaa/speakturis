// Generates PNG icons with no dependencies. Run: npm run icons
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};

// Teal speech bubble on near-black. `scale` shrinks the artwork so maskable icons keep a safe zone.
function icon(size, scale) {
  const bg = [8, 32, 36];
  const fg = [94, 234, 212];
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const cx = size / 2;
  const cy = size * 0.47;
  const rx = size * 0.3 * scale;
  const ry = size * 0.22 * scale;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const inEllipse = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
      // tail: small triangle under the bubble, bottom-left
      const ty = (y - (cy + ry * 0.7)) / (ry * 0.9);
      const tx = (x - (cx - rx * 0.45)) / (rx * 0.3);
      const inTail = ty >= 0 && ty <= 1 && tx >= 0 && tx <= 1 - ty;
      const px = inEllipse || inTail ? fg : bg;
      raw.set(px, y * (size * 3 + 1) + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', icon(192, 1));
writeFileSync('public/icons/icon-512.png', icon(512, 1));
writeFileSync('public/icons/maskable-512.png', icon(512, 0.72));
console.log('icons written');
