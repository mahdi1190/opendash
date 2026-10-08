// lib/fin-connect/keccak.mjs - Keccak-256 (the original Keccak padding that
// Ethereum uses, not NIST SHA3-256) in pure JS, for EIP-55 address checksums.
// node:crypto has 'sha3-256' but its padding differs, so it cannot be used.
//
//   keccak256(bytes: Uint8Array | string) -> Uint8Array(32)
//   keccak256Hex(bytes | string)          -> 64 lowercase hex chars
//
// BigInt lanes: slow-ish (tens of microseconds per short input) but only ever
// used on a 40-character address, so simplicity wins. Node stdlib only.

const MASK = (1n << 64n) - 1n;
const RC = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];
// Rotation offsets r[x + 5y].
const ROT = [0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14];
const rotl = (v, n) => (n === 0 ? v : (((v << BigInt(n)) | (v >> BigInt(64 - n))) & MASK));

function keccakF(s) {
  const C = new Array(5), B = new Array(25);
  for (let round = 0; round < 24; round++) {
    for (let x = 0; x < 5; x++) C[x] = s[x] ^ s[x + 5] ^ s[x + 10] ^ s[x + 15] ^ s[x + 20];
    for (let x = 0; x < 5; x++) {
      const d = C[(x + 4) % 5] ^ rotl(C[(x + 1) % 5], 1);
      for (let y = 0; y < 25; y += 5) s[x + y] ^= d;
    }
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) B[y + 5 * ((2 * x + 3 * y) % 5)] = rotl(s[x + 5 * y], ROT[x + 5 * y]);
    }
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 25; y += 5) s[x + y] = B[x + y] ^ ((~B[((x + 1) % 5) + y] & MASK) & B[((x + 2) % 5) + y]);
    }
    s[0] ^= RC[round];
  }
}

export function keccak256(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const rate = 136;
  const padLen = rate - (bytes.length % rate);
  const msg = new Uint8Array(bytes.length + padLen);
  msg.set(bytes);
  msg[bytes.length] ^= 0x01;
  msg[msg.length - 1] ^= 0x80;
  const s = new Array(25).fill(0n);
  for (let off = 0; off < msg.length; off += rate) {
    for (let i = 0; i < rate / 8; i++) {
      let lane = 0n;
      for (let b = 7; b >= 0; b--) lane = (lane << 8n) | BigInt(msg[off + i * 8 + b]);
      s[i] ^= lane;
    }
    keccakF(s);
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 4; i++) {
    let lane = s[i];
    for (let b = 0; b < 8; b++) { out[i * 8 + b] = Number(lane & 0xffn); lane >>= 8n; }
  }
  return out;
}

export function keccak256Hex(input) {
  return Array.from(keccak256(input), b => b.toString(16).padStart(2, '0')).join('');
}
