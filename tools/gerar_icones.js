// Reino De Claudonia - gera os ícones do "aplicativo" (tela inicial do celular).
// Desenho original: ilhota flutuante com árvore de outono dentro de um aro dourado.
// Uso: node tools/gerar_icones.js   → public/icons/icon-180.png, icon-192.png, icon-512.png
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xFFFFFFFF; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, px){
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++){ raw[y * (size * 4 + 1)] = 0; px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const hex = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
// cor de um ponto (u, v de 0 a 1)
function color(u, v){
  const x = u - 0.5, y = v - 0.5, r = Math.hypot(x, y);
  let c = mix(hex(0x5A3A1E), hex(0x24160A), Math.min(1, r / 0.72));                       // fundo madeira
  if (r < 0.43){
    c = mix(hex(0x6F93D0), hex(0xF6D2A0), Math.min(1, Math.max(0, (v - 0.12) / 0.62)));    // céu
    if (Math.hypot(u - 0.66, v - 0.3) < 0.07) c = hex(0xFFF1C0);                             // sol
    const cl = (cx, cy, rx) => ((u - cx) / rx) ** 2 + ((v - cy) / (rx * 0.45)) ** 2 < 1;
    if (cl(0.3, 0.3, 0.1) || cl(0.37, 0.28, 0.07)) c = hex(0xFFF8EE);                          // nuvem
    const iy = 0.64;                                                                           // ilhota
    if (v > iy && v < iy + 0.2 && Math.abs(u - 0.5) < 0.3 * (1 - (v - iy) / 0.2)) c = mix(hex(0x8A6441), hex(0x5E4C4C), (v - iy) / 0.2);
    if (((u - 0.5) / 0.3) ** 2 + ((v - iy) / 0.05) ** 2 < 1) c = hex(0x7A9A42);
    if (Math.abs(u - 0.5) < 0.022 && v > 0.47 && v < iy) c = hex(0x5C3C22);                  // tronco
    const blob = (cx, cy, rr) => Math.hypot(u - cx, v - cy) < rr;
    if (blob(0.5, 0.43, 0.1) || blob(0.43, 0.47, 0.07) || blob(0.57, 0.47, 0.07) || blob(0.5, 0.36, 0.07)){
      const shade = Math.min(1, Math.max(0, (v - 0.3) / 0.22));
      c = mix(hex(0xF2A33A), hex(0xC0561E), shade);                                           // copa de outono
    }
  }
  if (r > 0.43 && r < 0.475) c = mix(hex(0xFFE7A3), hex(0xA8742A), (r - 0.43) / 0.045);      // aro dourado
  if (r >= 0.475 && r < 0.49) c = hex(0x5A3818);
  return c;
}
const out = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(out, { recursive: true });
for (const size of [180, 192, 512]){
  const px = Buffer.alloc(size * size * 4), S = 3;                                            // 3x3 amostras por pixel (bordas suaves)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++){
    let acc = [0, 0, 0];
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++){ const c = color((x + (sx + 0.5) / S) / size, (y + (sy + 0.5) / S) / size); acc = acc.map((v, i) => v + c[i]); }
    const i = (y * size + x) * 4; px[i] = acc[0] / (S * S); px[i + 1] = acc[1] / (S * S); px[i + 2] = acc[2] / (S * S); px[i + 3] = 255;
  }
  fs.writeFileSync(path.join(out, `icon-${size}.png`), png(size, px));
  console.log(`icon-${size}.png`);
}
