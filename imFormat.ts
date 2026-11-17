import { argon2id } from 'hash-wasm';

export const IM_HEADER_SIZE = 44;
export const IM_MAGIC_0 = 0x49; // 'I'
export const IM_MAGIC_1 = 0x4d; // 'M'
export const IM_VERSION_1 = 0x01;

export const IM_FLAG_TEXT = 0x01;
export const IM_FLAG_FILE = 0x02;

export const IM_CIPHER_AES_256_GCM = 0x01;
export const IM_KDF_ARGON2ID = 0x01;

export const DEFAULT_KDF_MEM_KIB = 19456; // 19 MiB (OWASP minimum)
export const DEFAULT_KDF_ITERATIONS = 2;
export const DEFAULT_KDF_PARALLELISM = 1;
export const IM_SALT_LEN = 16;
export const IM_NONCE_LEN = 12;
export const IM_GCM_TAG_LEN_BYTES = 16;

export const LARGE_FILE_WARNING_BYTES = 150 * 1024 * 1024; // 150 MB
export const MAX_SAFE_BROWSER_BYTES = 500 * 1024 * 1024; // 500 MB

export const IM_TEXT_BEGIN = '-----BEGIN IM MESSAGE-----';
export const IM_TEXT_END = '-----END IM MESSAGE-----';

// Internal protocol key material for passwordless mode; each packet still uses unique 16B Salt + 12B Nonce + 44B AAD
const IM_PROTOCOL_KEY_SEED = 'IM-FORMAT-V1::AES-256-GCM::PASSWORDLESS-AAD';

export interface ImHeaderInfo {
  magic: string;
  version: number;
  flags: number;
  mode: 'text' | 'file';
  cipherId: number;
  kdfId: number;
  kdfMemKiB: number;
  kdfIterations: number;
  kdfParallelism: number;
  saltLen: number;
  nonceLen: number;
  reserved: number;
  saltHex: string;
  nonceHex: string;
  headerBytes: Uint8Array;
}

export interface ImFileMetadata {
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

export interface EncryptTextResult {
  armored: string;
  rawPacket: Uint8Array;
  header: ImHeaderInfo;
  durationMs: number;
}

export interface DecryptTextResult {
  plaintext: string;
  header: ImHeaderInfo;
  durationMs: number;
}

export interface EncryptFileResult {
  encryptedBytes: Uint8Array;
  outputFileName: string;
  header: ImHeaderInfo;
  durationMs: number;
}

export interface DecryptFileResult {
  fileBytes: Uint8Array;
  metadata: ImFileMetadata;
  header: ImHeaderInfo;
  durationMs: number;
}

const textEncoder = new TextEncoder();
const textDecoderFatal = new TextDecoder('utf-8', { fatal: true });

export function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    parts.push(String.fromCharCode(...chunk));
  }
  return btoa(parts.join(''));
}

export function base64ToBytes(base64: string): Uint8Array {
  const cleaned = base64.replace(/\s+/g, '');
  if (!cleaned || cleaned.length % 4 === 1) {
    throw new Error('صيغة Base64 غير صالحة أو مبتورة.');
  }
  let binary: string;
  try {
    binary = atob(cleaned);
  } catch {
    throw new Error('تعذر فك ترميز Base64؛ تأكد من عدم تلف النص المشفر.');
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function wrapBase64(b64: string, width = 64): string {
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += width) {
    lines.push(b64.slice(i, i + width));
  }
  return lines.join('\n');
}

export function armorImMessage(packet: Uint8Array): string {
  const b64 = bytesToBase64(packet);
  return `${IM_TEXT_BEGIN}\n${wrapBase64(b64, 64)}\n${IM_TEXT_END}`;
}

export function unarmorImMessage(input: string): Uint8Array {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('حقل النص المشفر فارغ.');
  }

  const beginIdx = trimmed.indexOf(IM_TEXT_BEGIN);
  const endIdx = trimmed.indexOf(IM_TEXT_END);

  if (beginIdx !== -1 || endIdx !== -1) {
    if (beginIdx === -1 || endIdx === -1 || endIdx <= beginIdx) {
      throw new Error('كتلة IM MESSAGE غير مكتملة أو تالفة.');
    }
    const inner = trimmed.slice(beginIdx + IM_TEXT_BEGIN.length, endIdx).trim();
    return base64ToBytes(inner);
  }

  return base64ToBytes(trimmed);
}

export function assertCryptoRuntime(): void {
  if (typeof globalThis.crypto === 'undefined' || typeof globalThis.crypto.getRandomValues !== 'function') {
    throw new Error('واجهة التشفير العشوائي CSPRNG غير متوفرة في هذا المتصفح.');
  }
  if (!globalThis.crypto.subtle) {
    throw new Error(
      'Web Crypto API (crypto.subtle) غير متاح. يتطلب المتصفح سياقاً آمناً (HTTPS أو localhost).'
    );
  }
  if (typeof argon2id !== 'function') {
    throw new Error(
      'تعذر تحميل وحدة Argon2id WebAssembly. تم إيقاف العملية لمنع أي خفض غير آمن لمستوى التشفير.'
    );
  }
}

export function buildImHeader(
  flags: number,
  options?: {
    kdfMemKiB?: number;
    kdfIterations?: number;
    kdfParallelism?: number;
    salt?: Uint8Array;
    nonce?: Uint8Array;
  }
): { headerBytes: Uint8Array; headerInfo: ImHeaderInfo; salt: Uint8Array; nonce: Uint8Array } {
  const kdfMemKiB = options?.kdfMemKiB ?? DEFAULT_KDF_MEM_KIB;
  const kdfIterations = options?.kdfIterations ?? DEFAULT_KDF_ITERATIONS;
  const kdfParallelism = options?.kdfParallelism ?? DEFAULT_KDF_PARALLELISM;

  const salt = options?.salt ? new Uint8Array(options.salt) : crypto.getRandomValues(new Uint8Array(IM_SALT_LEN));
  const nonce = options?.nonce ? new Uint8Array(options.nonce) : crypto.getRandomValues(new Uint8Array(IM_NONCE_LEN));

  if (salt.length !== IM_SALT_LEN || nonce.length !== IM_NONCE_LEN) {
    throw new Error('طول Salt أو Nonce لا يطابق مواصفة IM FORMAT v1.');
  }

  const headerBytes = new Uint8Array(IM_HEADER_SIZE);
  const view = new DataView(headerBytes.buffer);

  headerBytes[0] = IM_MAGIC_0;
  headerBytes[1] = IM_MAGIC_1;
  headerBytes[2] = IM_VERSION_1;
  headerBytes[3] = flags;
  headerBytes[4] = IM_CIPHER_AES_256_GCM;
  headerBytes[5] = IM_KDF_ARGON2ID;
  view.setUint32(6, kdfMemKiB, false);
  view.setUint16(10, kdfIterations, false);
  headerBytes[12] = kdfParallelism;
  headerBytes[13] = IM_SALT_LEN;
  headerBytes[14] = IM_NONCE_LEN;
  headerBytes[15] = 0x00;

  headerBytes.set(salt, 16);
  headerBytes.set(nonce, 32);

  const headerInfo: ImHeaderInfo = {
    magic: 'IM',
    version: IM_VERSION_1,
    flags,
    mode: flags === IM_FLAG_FILE ? 'file' : 'text',
    cipherId: IM_CIPHER_AES_256_GCM,
    kdfId: IM_KDF_ARGON2ID,
    kdfMemKiB,
    kdfIterations,
    kdfParallelism,
    saltLen: IM_SALT_LEN,
    nonceLen: IM_NONCE_LEN,
    reserved: 0,
    saltHex: bytesToHex(salt),
    nonceHex: bytesToHex(nonce),
    headerBytes,
  };

  return { headerBytes, headerInfo, salt, nonce };
}

export function parseImHeader(packet: Uint8Array): {
  headerInfo: ImHeaderInfo;
  salt: Uint8Array;
  nonce: Uint8Array;
  ciphertext: Uint8Array;
} {
  if (packet.length < IM_HEADER_SIZE + IM_GCM_TAG_LEN_BYTES) {
    throw new Error('البيانات أقصر من الحد الأدنى لمواصفة IM FORMAT v1 (44 بايت رأس + 16 بايت وسم مصادقة).');
  }

  const headerBytes = packet.slice(0, IM_HEADER_SIZE);
  const view = new DataView(headerBytes.buffer, headerBytes.byteOffset, headerBytes.byteLength);

  if (headerBytes[0] !== IM_MAGIC_0 || headerBytes[1] !== IM_MAGIC_1) {
    throw new Error('ترويسة Magic غير مطابقة لمواصفة IM FORMAT v1.');
  }

  const version = headerBytes[2];
  if (version !== IM_VERSION_1) {
    throw new Error(`إصدار IM FORMAT غير مدعوم (${version}). الإصدار المدعوم هو 1.`);
  }

  const flags = headerBytes[3];
  if (flags !== IM_FLAG_TEXT && flags !== IM_FLAG_FILE) {
    throw new Error(`نوع الحزمة (Flags=${flags}) غير معروف في الرأس.`);
  }

  const cipherId = headerBytes[4];
  if (cipherId !== IM_CIPHER_AES_256_GCM) {
    throw new Error(`معرف التشفير (CipherID=${cipherId}) غير مدعوم.`);
  }

  const kdfId = headerBytes[5];
  if (kdfId !== IM_KDF_ARGON2ID) {
    throw new Error(`معرف اشتقاق المفتاح (KdfID=${kdfId}) غير مدعوم. يتطلب Argon2id.`);
  }

  const kdfMemKiB = view.getUint32(6, false);
  const kdfIterations = view.getUint16(10, false);
  const kdfParallelism = headerBytes[12];
  const saltLen = headerBytes[13];
  const nonceLen = headerBytes[14];
  const reserved = headerBytes[15];

  if (saltLen !== IM_SALT_LEN || nonceLen !== IM_NONCE_LEN) {
    throw new Error('أطوال Salt أو Nonce في الرأس لا تطابق مواصفة IM FORMAT v1 الثابتة.');
  }

  if (
    kdfMemKiB < 1024 ||
    kdfMemKiB > 262144 ||
    kdfIterations < 1 ||
    kdfIterations > 64 ||
    kdfParallelism < 1 ||
    kdfParallelism > 16
  ) {
    throw new Error('معاملات Argon2id في الرأس خارج النطاق الآمن المسموح به.');
  }

  const salt = headerBytes.slice(16, 32);
  const nonce = headerBytes.slice(32, 44);
  const ciphertext = packet.subarray(IM_HEADER_SIZE);

  const headerInfo: ImHeaderInfo = {
    magic: 'IM',
    version,
    flags,
    mode: flags === IM_FLAG_FILE ? 'file' : 'text',
    cipherId,
    kdfId,
    kdfMemKiB,
    kdfIterations,
    kdfParallelism,
    saltLen,
    nonceLen,
    reserved,
    saltHex: bytesToHex(salt),
    nonceHex: bytesToHex(nonce),
    headerBytes,
  };

  return { headerInfo, salt, nonce, ciphertext };
}

export async function deriveAesGcmKey(
  salt: Uint8Array,
  memKiB: number,
  iterations: number,
  parallelism: number
): Promise<CryptoKey> {
  assertCryptoRuntime();

  let rawKey: Uint8Array;
  try {
    rawKey = await argon2id({
      password: IM_PROTOCOL_KEY_SEED,
      salt,
      parallelism,
      iterations,
      memorySize: memKiB,
      hashLength: 32,
      outputType: 'binary',
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`فشل تشغيل Argon2id WASM: ${detail}`);
  }

  if (!(rawKey instanceof Uint8Array) || rawKey.length !== 32) {
    throw new Error('طول المفتاح المشتق من Argon2id غير مطابق (يجب أن يكون 32 بايت).');
  }

  try {
    const keyBuffer = new Uint8Array(rawKey).buffer;
    return await crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
  } finally {
    rawKey.fill(0);
  }
}

export async function encryptTextIm(
  plaintext: string,
  kdfOverrides?: { kdfMemKiB?: number; kdfIterations?: number; kdfParallelism?: number }
): Promise<EncryptTextResult> {
  const start = performance.now();
  assertCryptoRuntime();

  const { headerBytes, headerInfo, salt, nonce } = buildImHeader(IM_FLAG_TEXT, kdfOverrides);
  const key = await deriveAesGcmKey(
    salt,
    headerInfo.kdfMemKiB,
    headerInfo.kdfIterations,
    headerInfo.kdfParallelism
  );

  const plaintextBytes = textEncoder.encode(plaintext);
  const ivBuf = new Uint8Array(nonce).buffer;
  const aadBuf = new Uint8Array(headerBytes).buffer;
  const ptBuf = new Uint8Array(plaintextBytes).buffer;

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: ivBuf,
      additionalData: aadBuf,
      tagLength: 128,
    },
    key,
    ptBuf
  );

  const cipherBytes = new Uint8Array(encryptedBuffer);
  const rawPacket = new Uint8Array(IM_HEADER_SIZE + cipherBytes.length);
  rawPacket.set(headerBytes, 0);
  rawPacket.set(cipherBytes, IM_HEADER_SIZE);

  return {
    armored: armorImMessage(rawPacket),
    rawPacket,
    header: headerInfo,
    durationMs: Math.round(performance.now() - start),
  };
}

export async function decryptTextIm(armoredOrBase64: string): Promise<DecryptTextResult> {
  const start = performance.now();
  assertCryptoRuntime();

  const rawPacket = unarmorImMessage(armoredOrBase64);
  const { headerInfo, salt, nonce, ciphertext } = parseImHeader(rawPacket);

  if (headerInfo.flags !== IM_FLAG_TEXT) {
    throw new Error('هذه الحزمة مشفرة كملف (IM FILE) وليست رسالة نصية. استخدم تبويب تشفير الملفات.');
  }

  const key = await deriveAesGcmKey(
    salt,
    headerInfo.kdfMemKiB,
    headerInfo.kdfIterations,
    headerInfo.kdfParallelism
  );

  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(nonce).buffer,
        additionalData: new Uint8Array(headerInfo.headerBytes).buffer,
        tagLength: 128,
      },
      key,
      new Uint8Array(ciphertext).buffer
    );
  } catch {
    throw new Error('فشل فك التشفير والمصادقة: البيانات تالفة أو تم العبث بالرأس (AAD) أو بالنص المشفر.');
  }

  let plaintext: string;
  try {
    plaintext = textDecoderFatal.decode(new Uint8Array(decryptedBuffer));
  } catch {
    throw new Error('البيانات المفكوكة ليست نص UTF-8 صالحاً.');
  }

  return {
    plaintext,
    header: headerInfo,
    durationMs: Math.round(performance.now() - start),
  };
}

export function packFilePayload(metadata: ImFileMetadata, fileBytes: Uint8Array): Uint8Array {
  const metaJsonBytes = textEncoder.encode(JSON.stringify(metadata));
  const payload = new Uint8Array(4 + metaJsonBytes.length + fileBytes.length);
  const view = new DataView(payload.buffer);
  view.setUint32(0, metaJsonBytes.length, false);
  payload.set(metaJsonBytes, 4);
  payload.set(fileBytes, 4 + metaJsonBytes.length);
  return payload;
}

export function unpackFilePayload(payload: Uint8Array): { metadata: ImFileMetadata; fileBytes: Uint8Array } {
  if (payload.length < 4) {
    throw new Error('بنية بيانات الملف الداخلية تالفة.');
  }
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const metaLen = view.getUint32(0, false);
  if (metaLen < 2 || 4 + metaLen > payload.length) {
    throw new Error('طول البيانات الوصفية للملف غير صالح.');
  }
  const metaStr = textDecoderFatal.decode(payload.subarray(4, 4 + metaLen));
  const parsed = JSON.parse(metaStr) as Partial<ImFileMetadata>;
  const fileBytes = payload.slice(4 + metaLen);

  return {
    metadata: {
      name: typeof parsed.name === 'string' && parsed.name ? parsed.name : 'decrypted-file.bin',
      type: typeof parsed.type === 'string' && parsed.type ? parsed.type : 'application/octet-stream',
      size: typeof parsed.size === 'number' ? parsed.size : fileBytes.length,
      lastModified: typeof parsed.lastModified === 'number' ? parsed.lastModified : Date.now(),
    },
    fileBytes,
  };
}

export async function encryptFileIm(
  fileBytes: Uint8Array,
  metadata: ImFileMetadata,
  onStage?: (stage: string) => void
): Promise<EncryptFileResult> {
  const start = performance.now();
  assertCryptoRuntime();

  onStage?.('توليد رأس IM FORMAT v1 واشتقاق المفتاح عبر Argon2id...');
  const { headerBytes, headerInfo, salt, nonce } = buildImHeader(IM_FLAG_FILE);
  const key = await deriveAesGcmKey(
    salt,
    headerInfo.kdfMemKiB,
    headerInfo.kdfIterations,
    headerInfo.kdfParallelism
  );

  onStage?.('تغليف البيانات الوصفية وتشفير AES-256-GCM...');
  const packedPayload = packFilePayload(metadata, fileBytes);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(nonce).buffer,
      additionalData: new Uint8Array(headerBytes).buffer,
      tagLength: 128,
    },
    key,
    new Uint8Array(packedPayload).buffer
  );

  const cipherBytes = new Uint8Array(encryptedBuffer);
  const encryptedBytes = new Uint8Array(IM_HEADER_SIZE + cipherBytes.length);
  encryptedBytes.set(headerBytes, 0);
  encryptedBytes.set(cipherBytes, IM_HEADER_SIZE);

  return {
    encryptedBytes,
    outputFileName: `${metadata.name}.imvault`,
    header: headerInfo,
    durationMs: Math.round(performance.now() - start),
  };
}

export async function decryptFileIm(
  encryptedPacket: Uint8Array,
  onStage?: (stage: string) => void
): Promise<DecryptFileResult> {
  const start = performance.now();
  assertCryptoRuntime();

  onStage?.('فحص الرأس 44 بايت واشتقاق المفتاح عبر Argon2id...');
  const { headerInfo, salt, nonce, ciphertext } = parseImHeader(encryptedPacket);

  if (headerInfo.flags !== IM_FLAG_FILE) {
    throw new Error('هذا الملف يحتوي على حزمة نصية (IM MESSAGE) وليس ملفاً ثنائياً.');
  }

  const key = await deriveAesGcmKey(
    salt,
    headerInfo.kdfMemKiB,
    headerInfo.kdfIterations,
    headerInfo.kdfParallelism
  );

  onStage?.('التحقق من وسم المصادقة GCM وفك التشفير...');
  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(nonce).buffer,
        additionalData: new Uint8Array(headerInfo.headerBytes).buffer,
        tagLength: 128,
      },
      key,
      new Uint8Array(ciphertext).buffer
    );
  } catch {
    throw new Error(
      'فشل فك تشفير الملف: البيانات تالفة أو تم العبث بمحتوى الملف أو برأس المصادقة (AAD).'
    );
  }

  const { metadata, fileBytes } = unpackFilePayload(new Uint8Array(decryptedBuffer));

  return {
    fileBytes,
    metadata,
    header: headerInfo,
    durationMs: Math.round(performance.now() - start),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
}
