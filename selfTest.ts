import { argon2id } from 'hash-wasm';
import {
  DEFAULT_KDF_ITERATIONS,
  DEFAULT_KDF_MEM_KIB,
  DEFAULT_KDF_PARALLELISM,
  IM_HEADER_SIZE,
  armorImMessage,
  bytesToHex,
  decryptFileIm,
  decryptTextIm,
  encryptFileIm,
  encryptTextIm,
  unarmorImMessage,
} from './imFormat';

export interface SelfTestCaseResult {
  id: string;
  title: string;
  description: string;
  status: 'passed' | 'failed';
  durationMs: number;
  detail: string;
}

export interface SelfTestSuiteResult {
  totalDurationMs: number;
  passedCount: number;
  totalCount: number;
  cases: SelfTestCaseResult[];
}

export async function runSelfTestSuite(
  onProgress?: (completed: number, total: number, currentTitle: string) => void
): Promise<SelfTestSuiteResult> {
  const suiteStart = performance.now();
  const cases: SelfTestCaseResult[] = [];
  const total = 6;

  // Test 1: Multilingual UTF-8 Round-trip (Arabic + English + Emojis + Newlines)
  onProgress?.(0, total, 'اختبار تشفير وفك تشفير النصوص متعددة اللغات (UTF-8)');
  {
    const t0 = performance.now();
    try {
      const sampleText =
        'رسالة مشفرة بنجاح 🔒\nMulti-line English & Arabic: خزينة IM v1\nرموز خاصة: !@#$%^&*()_+ [] {} 🚀🛡️';
      const enc = await encryptTextIm(sampleText);
      const dec = await decryptTextIm(enc.armored);

      if (dec.plaintext !== sampleText) {
        throw new Error('النص المسترجع لا يطابق النص الأصلي حرفياً.');
      }
      if (enc.header.headerBytes.length !== IM_HEADER_SIZE) {
        throw new Error(`طول الرأس الفعلي ${enc.header.headerBytes.length} وليس ${IM_HEADER_SIZE}.`);
      }

      cases.push({
        id: 'utf8-roundtrip',
        title: 'تطابق النصوص متعددة اللغات والرموز (UTF-8)',
        description: 'التحقق من سلامة الأحرف العربية والإنجليزية والرموز التعبيرية والأسطر المتعددة.',
        status: 'passed',
        durationMs: Math.round(performance.now() - t0),
        detail: `طول الرأس: ${enc.header.headerBytes.length} بايت · طول الحزمة الكلي: ${enc.rawPacket.length} بايت · Salt: ${enc.header.saltHex.slice(0, 12)}...`,
      });
    } catch (err) {
      cases.push({
        id: 'utf8-roundtrip',
        title: 'تطابق النصوص متعددة اللغات والرموز (UTF-8)',
        description: 'التحقق من سلامة الأحرف العربية والإنجليزية والرموز التعبيرية والأسطر المتعددة.',
        status: 'failed',
        durationMs: Math.round(performance.now() - t0),
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Test 2: Unique Salt & Nonce per Encryption
  onProgress?.(1, total, 'اختبار تفرد Salt و Nonce لكل عملية تشفير');
  {
    const t0 = performance.now();
    try {
      const sameText = 'نص متطابق يُشفر مرتين للتحقق من عدم تكرار المخرجات';
      const encA = await encryptTextIm(sameText);
      const encB = await encryptTextIm(sameText);

      if (encA.header.saltHex === encB.header.saltHex || encA.header.nonceHex === encB.header.nonceHex) {
        throw new Error('تم رصد تطابق في Salt أو Nonce بين عمليتي تشفير!');
      }
      if (encA.armored === encB.armored) {
        throw new Error('أنتجت عمليتا التشفير نصاً مشفراً متطابقاً!');
      }

      cases.push({
        id: 'unique-iv-salt',
        title: 'تفرد المخرجات عشوائياً (Unique Salt & Nonce)',
        description: 'تشفير نفس النص مرتين والتأكد من اختلاف Salt و Nonce والمخرجات في كل مرة.',
        status: 'passed',
        durationMs: Math.round(performance.now() - t0),
        detail: `Nonce A: ${encA.header.nonceHex.slice(0, 10)}... ≠ Nonce B: ${encB.header.nonceHex.slice(0, 10)}...`,
      });
    } catch (err) {
      cases.push({
        id: 'unique-iv-salt',
        title: 'تفرد المخرجات عشوائياً (Unique Salt & Nonce)',
        description: 'تشفير نفس النص مرتين والتأكد من اختلاف Salt و Nonce والمخرجات في كل مرة.',
        status: 'failed',
        durationMs: Math.round(performance.now() - t0),
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Test 3: 44-byte Header AAD Tamper Detection
  onProgress?.(2, total, 'اختبار كشف العبث برأس التشفير 44 بايت (AAD)');
  {
    const t0 = performance.now();
    try {
      const enc = await encryptTextIm('اختبار سلامة الرأس المصادق AAD');
      const tamperedPacket = new Uint8Array(unarmorImMessage(enc.armored));
      tamperedPacket[15] ^= 0x01;
      const tamperedArmored = armorImMessage(tamperedPacket);

      let rejected = false;
      try {
        await decryptTextIm(tamperedArmored);
      } catch {
        rejected = true;
      }
      if (!rejected) {
        throw new Error('فشل: لم يكتشف AES-GCM التعديل داخل الرأس 44 بايت!');
      }
      cases.push({
        id: 'aad-tamper',
        title: 'كشف العبث برأس الحزمة 44 بايت (AAD Integrity)',
        description: 'عكس بت واحد داخل الرأس (Byte 15) والتحقق من رفض GCM للحزمة فوراً.',
        status: 'passed',
        durationMs: Math.round(performance.now() - t0),
        detail: 'تم كشف التعديل في البايت رقم 15 داخل الرأس ورفض الحزمة فوراً عبر AAD.',
      });
    } catch (err) {
      cases.push({
        id: 'aad-tamper',
        title: 'كشف العبث برأس الحزمة 44 بايت (AAD Integrity)',
        description: 'عكس بت واحد داخل الرأس (Byte 15) والتحقق من رفض GCM للحزمة فوراً.',
        status: 'failed',
        durationMs: Math.round(performance.now() - t0),
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Test 4: Ciphertext Tamper Detection
  onProgress?.(3, total, 'اختبار كشف العبث بالنص المشفر');
  {
    const t0 = performance.now();
    try {
      const enc = await encryptTextIm('محتوى محمي ضد التعديل في منتصف البيانات المشفرة');
      const tamperedPacket = new Uint8Array(enc.rawPacket);
      tamperedPacket[IM_HEADER_SIZE + 4] ^= 0x80;
      const tamperedArmored = armorImMessage(tamperedPacket);

      let rejected = false;
      try {
        await decryptTextIm(tamperedArmored);
      } catch {
        rejected = true;
      }
      if (!rejected) {
        throw new Error('فشل: لم يتم اكتشاف العبث بالبيانات المشفرة!');
      }
      cases.push({
        id: 'ciphertext-tamper',
        title: 'كشف العبث بالنص المشفر (Ciphertext Integrity)',
        description: 'تغيير بت واحد في البيانات المشفرة والتأكد من فشل وسم المصادقة 128-bit.',
        status: 'passed',
        durationMs: Math.round(performance.now() - t0),
        detail: 'تم اكتشاف التلاعب عند الإزاحة 48 بايت ورفض فك التشفير بالكامل.',
      });
    } catch (err) {
      cases.push({
        id: 'ciphertext-tamper',
        title: 'كشف العبث بالنص المشفر (Ciphertext Integrity)',
        description: 'تغيير بت واحد في البيانات المشفرة والتأكد من فشل وسم المصادقة 128-bit.',
        status: 'failed',
        durationMs: Math.round(performance.now() - t0),
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Test 5: Binary File + Metadata Round-Trip
  onProgress?.(4, total, 'اختبار تشفير وفك تشفير ملف ثنائي مع البيانات الوصفية');
  {
    const t0 = performance.now();
    try {
      const binarySample = crypto.getRandomValues(new Uint8Array(4096));
      const originalMeta = {
        name: 'ملف-بيانات-2026.pdf',
        type: 'application/pdf',
        size: binarySample.length,
        lastModified: 1763337600000,
      };
      const encFile = await encryptFileIm(binarySample, originalMeta);
      const decFile = await decryptFileIm(encFile.encryptedBytes);

      if (decFile.metadata.name !== originalMeta.name || decFile.metadata.type !== originalMeta.type) {
        throw new Error('لم يتم استرجاع اسم الملف أو نوع MIME بدقة.');
      }
      if (decFile.fileBytes.length !== binarySample.length) {
        throw new Error('طول البايتات المسترجعة لا يطابق الأصل.');
      }
      for (let i = 0; i < binarySample.length; i++) {
        if (decFile.fileBytes[i] !== binarySample[i]) {
          throw new Error(`اختلاف في البايت رقم ${i}.`);
        }
      }

      cases.push({
        id: 'file-roundtrip',
        title: 'تشفير وفك تشفير ملف ثنائي مع الاسم العربي (IM FILE)',
        description: 'تشفير مصفوفة بايتات عشوائية 4 KB مع اسم ملف عربي واسترجاعها تطابقاً بايت لبايت.',
        status: 'passed',
        durationMs: Math.round(performance.now() - t0),
        detail: `تم استرجاع "${decFile.metadata.name}" (${decFile.fileBytes.length} بايت) بدقة 100%.`,
      });
    } catch (err) {
      cases.push({
        id: 'file-roundtrip',
        title: 'تشفير وفك تشفير ملف ثنائي مع الاسم العربي (IM FILE)',
        description: 'تشفير مصفوفة بايتات عشوائية 4 KB مع اسم ملف عربي واسترجاعها تطابقاً بايت لبايت.',
        status: 'failed',
        durationMs: Math.round(performance.now() - t0),
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Test 6: Argon2id WASM Key Derivation Determinism
  onProgress?.(5, total, 'اختبار حتمية اشتقاق المفتاح Argon2id (32 بايت)');
  {
    const t0 = performance.now();
    try {
      const saltA = new Uint8Array(16).fill(0x2a);
      const saltB = new Uint8Array(16).fill(0x2b);
      const params = {
        password: 'argon2id-determinism-test',
        parallelism: DEFAULT_KDF_PARALLELISM,
        iterations: DEFAULT_KDF_ITERATIONS,
        memorySize: DEFAULT_KDF_MEM_KIB,
        hashLength: 32,
        outputType: 'binary' as const,
      };

      const key1 = await argon2id({ ...params, salt: saltA });
      const key2 = await argon2id({ ...params, salt: saltA });
      const key3 = await argon2id({ ...params, salt: saltB });

      const hex1 = bytesToHex(key1);
      const hex2 = bytesToHex(key2);
      const hex3 = bytesToHex(key3);

      if (key1.length !== 32 || hex1 !== hex2) {
        throw new Error('عدم تطابق المفتاح المشتق لنفس المدخلات.');
      }
      if (hex1 === hex3) {
        throw new Error('تشابه المفاتيح رغم اختلاف Salt.');
      }

      cases.push({
        id: 'argon2id-determinism',
        title: 'حتمية وتفرد اشتقاق المفتاح Argon2id WASM',
        description: 'التحقق من إنتاج مفتاح 256-bit متطابق لنفس Salt ومختلف عند تغيير Salt وفق حدود OWASP.',
        status: 'passed',
        durationMs: Math.round(performance.now() - t0),
        detail: `معاملات OWASP (${DEFAULT_KDF_MEM_KIB} KiB, t=${DEFAULT_KDF_ITERATIONS}, p=${DEFAULT_KDF_PARALLELISM}) · بصمة المفتاح: ${hex1.slice(0, 16)}...`,
      });
    } catch (err) {
      cases.push({
        id: 'argon2id-determinism',
        title: 'حتمية وتفرد اشتقاق المفتاح Argon2id WASM',
        description: 'التحقق من إنتاج مفتاح 256-bit متطابق لنفس Salt ومختلف عند تغيير Salt وفق حدود OWASP.',
        status: 'failed',
        durationMs: Math.round(performance.now() - t0),
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  onProgress?.(total, total, 'اكتملت جميع الاختبارات');

  return {
    totalDurationMs: Math.round(performance.now() - suiteStart),
    passedCount: cases.filter((c) => c.status === 'passed').length,
    totalCount: cases.length,
    cases,
  };
}
