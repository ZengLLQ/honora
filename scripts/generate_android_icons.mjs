import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// 1. Decode source app-icon.png
function decodePng(filePath) {
  const buf = fs.readFileSync(filePath);
  let offset = 8;
  let width = 0;
  let height = 0;
  const idatChunks = [];
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if (type === 'IHDR') {
      width = buf.readUInt32BE(offset + 8);
      height = buf.readUInt32BE(offset + 12);
    } else if (type === 'IDAT') {
      idatChunks.push(buf.subarray(offset + 8, offset + 8 + len));
    }
    offset += 12 + len;
  }
  const decomp = zlib.inflateSync(Buffer.concat(idatChunks));
  const raw = Buffer.alloc(width * height * 4);
  let srcPos = 0;
  let dstPos = 0;
  const stride = width * 4;
  for (let y = 0; y < height; y++) {
    const filter = decomp[srcPos++];
    for (let x = 0; x < stride; x++) {
      let val = decomp[srcPos++];
      const a = x >= 4 ? raw[dstPos - 4] : 0;
      const b = y > 0 ? raw[dstPos - stride] : 0;
      const c = x >= 4 && y > 0 ? raw[dstPos - stride - 4] : 0;
      if (filter === 1) val = (val + a) & 0xff;
      else if (filter === 2) val = (val + b) & 0xff;
      else if (filter === 3) val = (val + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        val = (val + pr) & 0xff;
      }
      raw[dstPos++] = val;
    }
  }
  return { width, height, data: raw };
}

// 2. Encode buffer to PNG
function createPng(width, height, rgbaBuffer) {
  function makeChunk(type, data) {
    const len = data.length;
    const typeBuf = Buffer.from(type, 'ascii');
    const chunk = Buffer.concat([typeBuf, data]);
    const crc = zlib.crc32(chunk);
    const header = Buffer.alloc(4);
    header.writeUInt32BE(len, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([header, chunk, crcBuf]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawScanlines[y * (1 + width * 4)] = 0;
    rgbaBuffer.copy(rawScanlines, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idatChunk = makeChunk('IDAT', zlib.deflateSync(rawScanlines));
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Bilinear / Area-average sampler for source emblem
const src = decodePng('app-icon.png');
// The emblem bounding box in app-icon.png is approximately [24, 24] to [1000, 1000]
const EMBLEM_MIN_X = 24;
const EMBLEM_MAX_X = 1000;
const EMBLEM_MIN_Y = 24;
const EMBLEM_MAX_Y = 1000;
const EMBLEM_W = EMBLEM_MAX_X - EMBLEM_MIN_X;
const EMBLEM_H = EMBLEM_MAX_Y - EMBLEM_MIN_Y;

function sampleEmblem(u, v) {
  // u, v in [0, 1]
  if (u < 0 || u > 1 || v < 0 || v > 1) return [0, 0, 0, 0];
  const sx = EMBLEM_MIN_X + u * EMBLEM_W;
  const sy = EMBLEM_MIN_Y + v * EMBLEM_H;

  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = Math.min(x0 + 1, src.width - 1);
  const y1 = Math.min(y0 + 1, src.height - 1);

  const fx = sx - x0;
  const fy = sy - y0;

  function getPixel(x, y) {
    const idx = (y * src.width + x) * 4;
    return [src.data[idx], src.data[idx + 1], src.data[idx + 2], src.data[idx + 3]];
  }

  const p00 = getPixel(x0, y0);
  const p10 = getPixel(x1, y0);
  const p01 = getPixel(x0, y1);
  const p11 = getPixel(x1, y1);

  const res = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const top = p00[c] * (1 - fx) + p10[c] * fx;
    const btm = p01[c] * (1 - fx) + p11[c] * fx;
    res[c] = Math.round(top * (1 - fy) + btm * fy);
  }
  return res;
}

// Generate Adaptive Foreground (108dp canvas, 48dp emblem)
function generateForeground(size) {
  const buf = Buffer.alloc(size * size * 4, 0);
  const emblemSize = Math.round((48 / 108) * size);
  const offsetX = (size - emblemSize) / 2;
  const offsetY = (size - emblemSize) / 2;

  // supersample 2x2 for smooth edges
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const px = x + (sx + 0.5) / 2;
          const py = y + (sy + 0.5) / 2;
          const u = (px - offsetX) / emblemSize;
          const v = (py - offsetY) / emblemSize;
          const [pr, pg, pb, pa] = sampleEmblem(u, v);
          r += pr * (pa / 255);
          g += pg * (pa / 255);
          b += pb * (pa / 255);
          a += pa;
        }
      }
      a /= 4;
      if (a > 0) {
        const outIdx = (y * size + x) * 4;
        buf[outIdx] = Math.min(255, Math.round((r / (a * 4)) * 255));
        buf[outIdx + 1] = Math.min(255, Math.round((g / (a * 4)) * 255));
        buf[outIdx + 2] = Math.min(255, Math.round((b / (a * 4)) * 255));
        buf[outIdx + 3] = Math.min(255, Math.round(a));
      }
    }
  }
  return createPng(size, size, buf);
}

// Generate Legacy Square Launcher Icon (48dp canvas, rounded rect with 44dp emblem)
function generateLauncher(size) {
  const buf = Buffer.alloc(size * size * 4, 0);
  const emblemSize = Math.round((44 / 48) * size);
  const offsetX = (size - emblemSize) / 2;
  const offsetY = (size - emblemSize) / 2;
  const cornerRadius = (6 / 48) * size;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const px = x + (sx + 0.5) / 2;
          const py = y + (sy + 0.5) / 2;

          // Check rounded rect clip for the card
          let inside = true;
          const minX = offsetX, maxX = offsetX + emblemSize;
          const minY = offsetY, maxY = offsetY + emblemSize;
          if (px < minX || px > maxX || py < minY || py > maxY) {
            inside = false;
          } else {
            // Check 4 corners
            const checkCorner = (cx, cy) => {
              const dx = px - cx, dy = py - cy;
              return dx * dx + dy * dy <= cornerRadius * cornerRadius;
            };
            if (px < minX + cornerRadius && py < minY + cornerRadius) {
              inside = checkCorner(minX + cornerRadius, minY + cornerRadius);
            } else if (px > maxX - cornerRadius && py < minY + cornerRadius) {
              inside = checkCorner(maxX - cornerRadius, minY + cornerRadius);
            } else if (px < minX + cornerRadius && py > maxY - cornerRadius) {
              inside = checkCorner(minX + cornerRadius, maxY - cornerRadius);
            } else if (px > maxX - cornerRadius && py > maxY - cornerRadius) {
              inside = checkCorner(maxX - cornerRadius, maxY - cornerRadius);
            }
          }

          if (inside) {
            const u = (px - offsetX) / emblemSize;
            const v = (py - offsetY) / emblemSize;
            const [pr, pg, pb, pa] = sampleEmblem(u, v);
            r += pr * (pa / 255);
            g += pg * (pa / 255);
            b += pb * (pa / 255);
            a += pa;
          }
        }
      }
      a /= 4;
      if (a > 0) {
        const outIdx = (y * size + x) * 4;
        buf[outIdx] = Math.min(255, Math.round((r / (a * 4)) * 255));
        buf[outIdx + 1] = Math.min(255, Math.round((g / (a * 4)) * 255));
        buf[outIdx + 2] = Math.min(255, Math.round((b / (a * 4)) * 255));
        buf[outIdx + 3] = Math.min(255, Math.round(a));
      }
    }
  }
  return createPng(size, size, buf);
}

// Generate Legacy Round Launcher Icon (48dp canvas, 44dp diameter white circle, 30dp emblem)
function generateLauncherRound(size) {
  const buf = Buffer.alloc(size * size * 4, 0);
  const center = size / 2;
  const radius = (22 / 48) * size;
  const emblemSize = Math.round((30 / 48) * size);
  const offsetX = (size - emblemSize) / 2;
  const offsetY = (size - emblemSize) / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const px = x + (sx + 0.5) / 2;
          const py = y + (sy + 0.5) / 2;
          const dx = px - center;
          const dy = py - center;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= radius) {
            // White circle background
            let cr = 255, cg = 255, cb = 255, ca = 255;
            // Antialiasing on outer circle edge
            if (dist > radius - 0.7) {
              ca = Math.max(0, Math.min(255, Math.round((radius - dist + 0.7) / 0.7 * 255)));
            }

            // Check if inside emblem
            const u = (px - offsetX) / emblemSize;
            const v = (py - offsetY) / emblemSize;
            if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
              const [er, eg, eb, ea] = sampleEmblem(u, v);
              const alpha = ea / 255;
              cr = Math.round(er * alpha + cr * (1 - alpha));
              cg = Math.round(eg * alpha + cg * (1 - alpha));
              cb = Math.round(eb * alpha + cb * (1 - alpha));
            }

            r += cr * (ca / 255);
            g += cg * (ca / 255);
            b += cb * (ca / 255);
            a += ca;
          }
        }
      }
      a /= 4;
      if (a > 0) {
        const outIdx = (y * size + x) * 4;
        buf[outIdx] = Math.min(255, Math.round((r / (a * 4)) * 255));
        buf[outIdx + 1] = Math.min(255, Math.round((g / (a * 4)) * 255));
        buf[outIdx + 2] = Math.min(255, Math.round((b / (a * 4)) * 255));
        buf[outIdx + 3] = Math.min(255, Math.round(a));
      }
    }
  }
  return createPng(size, size, buf);
}

// Densities map
const densities = [
  { name: 'mipmap-mdpi', d: 1, launcherSize: 48, fgSize: 108 },
  { name: 'mipmap-hdpi', d: 1.5, launcherSize: 72, fgSize: 162 },
  { name: 'mipmap-xhdpi', d: 2, launcherSize: 96, fgSize: 216 },
  { name: 'mipmap-xxhdpi', d: 3, launcherSize: 144, fgSize: 324 },
  { name: 'mipmap-xxxhdpi', d: 4, launcherSize: 192, fgSize: 432 },
];

const resDir = path.resolve('src-tauri/gen/android/app/src/main/res');

for (const density of densities) {
  const dir = path.join(resDir, density.name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  console.log(`Generating icons for ${density.name}...`);
  const fgPng = generateForeground(density.fgSize);
  fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fgPng);

  const launcherPng = generateLauncher(density.launcherSize);
  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), launcherPng);

  const roundPng = generateLauncherRound(density.launcherSize);
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), roundPng);
}

console.log('All mipmap icons generated successfully!');
