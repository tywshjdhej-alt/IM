import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

const HEADER_FIELDS = [
  { offset: '00..01', size: '2 B', field: 'Magic', value: '"IM" (0x49, 0x4D)', desc: 'معرف التوقيع الثابت لحزم IM FORMAT' },
  { offset: '02', size: '1 B', field: 'Version', value: '0x01', desc: 'رقم إصدار البنية القياسية' },
  { offset: '03', size: '1 B', field: 'Flags', value: '0x01 / 0x02', desc: 'نوع الحزمة: 0x01 للنص، 0x02 للملفات' },
  { offset: '04', size: '1 B', field: 'CipherID', value: '0x01', desc: 'خوارزمية التشفير AES-256-GCM (وسم 128-bit)' },
  { offset: '05', size: '1 B', field: 'KdfID', value: '0x01', desc: 'دالة اشتقاق المفتاح Argon2id عبر WASM' },
  { offset: '06..09', size: '4 B', field: 'KdfMemKiB', value: '19456 (Uint32 BE)', desc: 'ذاكرة Argon2id بالكيلوبايت (19 MiB OWASP)' },
  { offset: '10..11', size: '2 B', field: 'KdfIterations', value: '2 (Uint16 BE)', desc: 'عدد دورات التكرار الزمني' },
  { offset: '12', size: '1 B', field: 'KdfParallelism', value: '1 (Uint8)', desc: 'معامل التوازي (Lanes)' },
  { offset: '13', size: '1 B', field: 'SaltLen', value: '16 (Uint8)', desc: 'طول الملح العشوائي بالبايت' },
  { offset: '14', size: '1 B', field: 'NonceLen', value: '12 (Uint8)', desc: 'طول متجه الابتداء IV بالبايت' },
  { offset: '15', size: '1 B', field: 'Reserved', value: '0x00', desc: 'بايت محجوز لمحاذاة 16 بايت (محمي ضمن AAD)' },
  { offset: '16..31', size: '16 B', field: 'Salt', value: 'CSPRNG 128-bit', desc: 'ملح عشوائي فريد لكل عملية تشفير' },
  { offset: '32..43', size: '12 B', field: 'Nonce', value: 'CSPRNG 96-bit', desc: 'قيمة Nonce فريدة لعملية AES-GCM' },
];

export function SpecAndDeployPanel() {
  const [copiedCmd, setCopiedCmd] = useState(false);

  const buildCommand = 'npm install && npm run build';

  const handleCopyBuild = async () => {
    try {
      await navigator.clipboard.writeText(buildCommand);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <section aria-labelledby="spec-heading" className="space-y-8">
      <div className="border-b border-sky-200 pb-4 dark:border-sky-900/60">
        <h2 id="spec-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100">
          مواصفة IM FORMAT v1 ودليل النشر الساكن
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          البنية الثنائية الدقيقة للرأس المصادق (44 بايت) وتعليمات النشر كـ Static Site على Cloudflare Pages أو Netlify.
        </p>
      </div>

      {/* 44-byte Header Spec Table */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          خريطة بايتات الرأس الثابت (44 بايت — محمي بالكامل كـ AAD)
        </h3>
        <div className="overflow-x-auto rounded-xl border border-sky-200 bg-white dark:border-sky-900/60 dark:bg-[#111a2e]">
          <table className="w-full border-collapse text-right text-xs">
            <thead>
              <tr className="border-b border-sky-200 bg-sky-50/90 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-200">
                <th className="px-4 py-3 font-semibold">الإزاحة (Offset)</th>
                <th className="px-4 py-3 font-semibold">الحجم</th>
                <th className="px-4 py-3 font-semibold">الحقل</th>
                <th className="px-4 py-3 font-semibold">القيمة الافتراضية</th>
                <th className="px-4 py-3 font-semibold">الوصف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100 dark:divide-sky-900/50">
              {HEADER_FIELDS.map((row) => (
                <tr key={row.field} className="hover:bg-sky-50/50 dark:hover:bg-sky-950/30">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-slate-700 dark:text-slate-300" dir="ltr">
                    {row.offset}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-slate-500 dark:text-slate-400" dir="ltr">
                    {row.size}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono font-semibold text-pink-700 dark:text-pink-400" dir="ltr">
                    {row.field}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-sky-800 dark:text-sky-300" dir="ltr">
                    {row.value}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security & Static Deployment Guide */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-sky-200 bg-white p-5 dark:border-sky-900/60 dark:bg-[#111a2e]">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            الضمانات البنيوية والتشفير المباشر
          </h3>
          <ul className="list-disc space-y-2 pr-5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <li>
              <strong className="text-slate-800 dark:text-slate-200">تشغيل فوري دون كلمة مرور:</strong> تُشتق المفاتيح آلياً عبر <code className="font-mono text-pink-700 dark:text-pink-400">Argon2id</code> مع <code className="font-mono">Salt</code> و<code className="font-mono">Nonce</code> عشوائيين فريدين لكل حزمة، مما يتيح فك التشفير الفوري عبر الأداة مع الحفاظ على عدم تكرار المخرجات.
            </li>
            <li>
              <strong className="text-slate-800 dark:text-slate-200">مصادقة الرأس الكامل (AAD):</strong> تُمرَّر الـ 44 بايت كاملة كبيانات مصادق عليها إضافية إلى <code className="font-mono">AES-256-GCM</code>؛ أي تعديل في المعاملات أو Salt أو Nonce أو المحتوى يُفشل وسم المصادقة فوراً.
            </li>
            <li>
              <strong className="text-slate-800 dark:text-slate-200">وحدة Argon2id مدمجة محلياً:</strong> مكتبة <code className="font-mono">hash-wasm</code> مضمنة مباشرة داخل حزمة البناء دون أي اعتماد على خوادم خارجية.
            </li>
          </ul>
        </div>

        <div className="space-y-3 rounded-xl border border-sky-200 bg-white p-5 dark:border-sky-900/60 dark:bg-[#111a2e]">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            النشر السريع كموقع ساكن (Static Site)
          </h3>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            لا يحتاج التطبيق إلى أي قاعدة بيانات أو خادم خلفي؛ يمكنك بناؤه ونشره خلال دقائق على Cloudflare Pages أو Netlify أو GitHub Pages:
          </p>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50/80 px-3.5 py-2.5 dark:border-sky-800/70 dark:bg-slate-950">
            <code className="font-mono text-xs text-slate-800 dark:text-slate-200" dir="ltr">
              {buildCommand}
            </code>
            <button
              type="button"
              onClick={handleCopyBuild}
              className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium text-pink-700 hover:bg-pink-100/70 dark:text-pink-300 dark:hover:bg-pink-950/60"
            >
              {copiedCmd ? <Check className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCmd ? 'تم' : 'نسخ'}</span>
            </button>
          </div>

          <ul className="list-disc space-y-1.5 pr-5 text-xs text-slate-600 dark:text-slate-400">
            <li>مجلد المخرجات الجاهز للنشر: <code className="font-mono text-slate-800 dark:text-slate-200">dist/</code></li>
            <li>يتطلب العمل الصحيح لـ Web Crypto API وجود سياق آمن (<code className="font-mono">HTTPS</code> أو <code className="font-mono">localhost</code>).</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
