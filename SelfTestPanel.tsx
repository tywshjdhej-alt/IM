import { CheckCircle2, Play, ShieldAlert, XCircle } from 'lucide-react';
import { useState } from 'react';
import { SelfTestSuiteResult, runSelfTestSuite } from '../crypto/selfTest';

export function SelfTestPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [completedSteps, setCompletedSteps] = useState(0);
  const [totalSteps, setTotalSteps] = useState(6);
  const [results, setResults] = useState<SelfTestSuiteResult | null>(null);

  const handleRunTests = async () => {
    setIsRunning(true);
    setResults(null);
    setCompletedSteps(0);
    setProgressText('تهيئة بيئة الاختبار الحي...');
    try {
      const res = await runSelfTestSuite((done, total, title) => {
        setCompletedSteps(done);
        setTotalSteps(total);
        setProgressText(title);
      });
      setResults(res);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <section aria-labelledby="selftest-heading" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sky-200 pb-4 dark:border-sky-900/60">
        <div>
          <h2 id="selftest-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100">
            مجموعة الاختبار الذاتي المدمجة (IM-TEST)
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            تنفيذ اختبارات تشفير حقيقية داخل المتصفح للتحقق من سلامة UTF-8، تفرد المخرجات، وكشف العبث بالرأس 44 بايت (AAD).
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunTests}
          disabled={isRunning}
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pink-700 disabled:cursor-wait disabled:opacity-70 dark:bg-pink-500 dark:text-slate-950 dark:hover:bg-pink-400"
        >
          <Play className="h-4 w-4" />
          <span>{isRunning ? 'جاري تنفيذ الاختبارات...' : 'تشغيل الاختبار الذاتي الآن'}</span>
        </button>
      </div>

      {isRunning && (
        <div className="rounded-xl border border-sky-200 bg-white p-5 dark:border-sky-900/60 dark:bg-[#111a2e]">
          <div className="flex items-center justify-between gap-4 text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>{progressText}</span>
            <span className="font-mono tabular-nums text-pink-700 dark:text-pink-300">
              {completedSteps} / {totalSteps}
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-sky-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-pink-600 transition-all duration-200 dark:bg-pink-400"
              style={{ width: `${Math.round((completedSteps / Math.max(totalSteps, 1)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {!isRunning && !results && (
        <div className="rounded-xl border border-sky-200 bg-white p-8 text-center dark:border-sky-900/60 dark:bg-[#111a2e]">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            جاهز للتحقق الميداني من المحرك التشفيري
          </p>
          <p className="mx-auto mt-1.5 max-w-xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            سيقوم الفحص بتشغيل 6 اختبارات فعلية باستخدام Argon2id WASM (19 MiB) و Web Crypto AES-256-GCM لقياس الزمن الفعلي والتحقق من استجابة المصادقة.
          </p>
        </div>
      )}

      {results && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sky-200 bg-white px-5 py-4 dark:border-sky-900/60 dark:bg-[#111a2e]">
            <div className="flex items-center gap-2.5">
              {results.passedCount === results.totalCount ? (
                <CheckCircle2 className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              )}
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                النتيجة: نجح {results.passedCount} من أصل {results.totalCount} اختبارات
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>إجمالي زمن التنفيذ</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono font-semibold tabular-nums text-pink-700 dark:text-pink-300">
                {results.totalDurationMs} ms
              </span>
            </div>
          </div>

          <div className="divide-y divide-sky-100 overflow-hidden rounded-xl border border-sky-200 bg-white dark:divide-sky-900/50 dark:border-sky-900/60 dark:bg-[#111a2e]">
            {results.cases.map((testCase, idx) => (
              <div key={testCase.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {testCase.status === 'passed' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-pink-600 dark:text-pink-400" />
                    )}
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {idx + 1}. {testCase.title}
                    </h3>
                  </div>
                  <p className="pr-6 text-xs text-slate-600 dark:text-slate-400">{testCase.description}</p>
                  <p className="pr-6 font-mono text-[11px] text-slate-500 dark:text-slate-400" dir="auto">
                    {testCase.detail}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3 pr-6 sm:pr-0">
                  <span
                    className={`text-xs font-semibold ${
                      testCase.status === 'passed'
                        ? 'text-sky-700 dark:text-sky-400'
                        : 'text-pink-700 dark:text-pink-400'
                    }`}
                  >
                    {testCase.status === 'passed' ? 'ناجح' : 'فشل'}
                  </span>
                  <span aria-hidden="true" className="text-sky-300 dark:text-sky-800">·</span>
                  <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {testCase.durationMs} ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
