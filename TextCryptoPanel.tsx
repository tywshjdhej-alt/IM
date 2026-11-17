import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  Copy,
  Download,
  Lock,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useState } from 'react';
import {
  ImHeaderInfo,
  decryptTextIm,
  encryptTextIm,
  formatBytes,
} from '../crypto/imFormat';
import { HeaderInspector } from './HeaderInspector';

type TextMode = 'encrypt' | 'decrypt';

export function TextCryptoPanel() {
  const [mode, setMode] = useState<TextMode>('encrypt');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [headerInfo, setHeaderInfo] = useState<ImHeaderInfo | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const inputBytes = new TextEncoder().encode(inputText).length;
  const outputBytes = new TextEncoder().encode(outputText).length;

  const handleModeChange = (nextMode: TextMode) => {
    setMode(nextMode);
    setError(null);
    setOutputText('');
    setHeaderInfo(null);
    setDurationMs(null);
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCopied(false);

    if (!inputText.trim()) {
      setError(
        mode === 'encrypt'
          ? 'يرجى كتابة النص المراد تشفيره أولاً.'
          : 'يرجى لصق كتلة IM MESSAGE المراد فك تشفيرها.'
      );
      return;
    }

    setIsProcessing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 20));
      if (mode === 'encrypt') {
        const result = await encryptTextIm(inputText);
        setOutputText(result.armored);
        setHeaderInfo(result.header);
        setDurationMs(result.durationMs);
      } else {
        const result = await decryptTextIm(inputText);
        setOutputText(result.plaintext);
        setHeaderInfo(result.header);
        setDurationMs(result.durationMs);
      }
    } catch (err) {
      setOutputText('');
      setHeaderInfo(null);
      setDurationMs(null);
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء المعالجة.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('تعذر النسخ التلقائي إلى الحافظة. يمكنك تحديد النص ونسخه يدوياً.');
    }
  };

  const handleDownloadTxt = () => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode === 'encrypt' ? 'im-message.txt' : 'decrypted-text.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSendOutputToDecrypt = () => {
    if (!outputText) return;
    setMode('decrypt');
    setInputText(outputText);
    setOutputText('');
    setHeaderInfo(null);
    setDurationMs(null);
    setError(null);
  };

  const handleClearAll = () => {
    setInputText('');
    setOutputText('');
    setHeaderInfo(null);
    setDurationMs(null);
    setError(null);
    setCopied(false);
  };

  return (
    <section aria-labelledby="text-panel-heading" className="space-y-6">
      {/* Mode toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sky-200 pb-4 dark:border-sky-900/60">
        <div>
          <h2 id="text-panel-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100">
            تشفير وفك تشفير النصوص (IM MESSAGE)
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            تشفير فوري بدون كلمة مرور لحفظ نصوص UTF-8 العربية والإنجليزية والرموز مع حماية الرأس 44 بايت عبر AAD.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-sky-200 bg-sky-100/70 p-1 dark:border-sky-900/60 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => handleModeChange('encrypt')}
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
              mode === 'encrypt'
                ? 'bg-white text-pink-700 shadow-xs dark:bg-sky-950 dark:text-pink-400'
                : 'text-slate-600 hover:text-sky-900 dark:text-slate-400 dark:hover:text-sky-200'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>تشفير نص</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('decrypt')}
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
              mode === 'decrypt'
                ? 'bg-white text-pink-700 shadow-xs dark:bg-sky-950 dark:text-pink-400'
                : 'text-slate-600 hover:text-sky-900 dark:text-slate-400 dark:hover:text-sky-200'
            }`}
          >
            <Unlock className="h-3.5 w-3.5" />
            <span>فك تشفير نص</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleExecute} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Input Column */}
        <div className="flex flex-col justify-between space-y-5 rounded-xl border border-sky-200 bg-white p-5 dark:border-sky-900/60 dark:bg-[#111a2e]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="im-text-input" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {mode === 'encrypt' ? 'النص الأصلي (Plaintext)' : 'الرسالة المشفرة (IM MESSAGE أو Base64)'}
              </label>
              <span className="font-mono text-xs tabular-nums text-sky-700 dark:text-sky-300">
                {inputText.length} محرف · {formatBytes(inputBytes)}
              </span>
            </div>

            <textarea
              id="im-text-input"
              rows={10}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              dir={mode === 'decrypt' ? 'ltr' : 'auto'}
              spellCheck={mode === 'encrypt'}
              placeholder={
                mode === 'encrypt'
                  ? 'اكتب رسالتك هنا (يدعم العربية، الإنجليزية، الرموز التعبيرية، والأسطر المتعددة)...'
                  : '-----BEGIN IM MESSAGE-----\n...\n-----END IM MESSAGE-----'
              }
              className={`w-full resize-y rounded-lg border border-sky-200 bg-sky-50/40 p-3.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/20 dark:border-sky-800/70 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-pink-400 dark:focus:bg-slate-950 ${
                mode === 'decrypt' ? 'font-mono text-xs' : ''
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-100 pt-4 dark:border-sky-900/50">
            <button
              type="button"
              onClick={handleClearAll}
              disabled={isProcessing || (!inputText && !outputText)}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-sky-200 bg-sky-50/70 px-4 py-2.5 text-xs font-medium text-sky-900 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-sky-800/70 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>مسح الحقول</span>
            </button>

            <button
              type="submit"
              disabled={isProcessing}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:cursor-wait disabled:opacity-70 dark:bg-pink-500 dark:text-slate-950 dark:hover:bg-pink-400"
            >
              {mode === 'encrypt' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              <span>
                {isProcessing
                  ? 'جاري المعالجة...'
                  : mode === 'encrypt'
                  ? 'تشفير النص الآن'
                  : 'فك تشفير النص'}
              </span>
            </button>
          </div>
        </div>

        {/* Output Column */}
        <div className="flex flex-col justify-between space-y-5 rounded-xl border border-sky-200 bg-white p-5 dark:border-sky-900/60 dark:bg-[#111a2e]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {mode === 'encrypt' ? 'الناتج المشفر (IM MESSAGE)' : 'النص المسترجع (Plaintext)'}
              </span>
              {outputText && (
                <span className="font-mono text-xs tabular-nums text-sky-700 dark:text-sky-300">
                  {formatBytes(outputBytes)}
                </span>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-pink-300 bg-pink-50 p-3.5 text-sm text-pink-900 dark:border-pink-900/60 dark:bg-pink-950/40 dark:text-pink-200"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-pink-600 dark:text-pink-400" />
                <p className="leading-relaxed">{error}</p>
              </div>
            )}

            <textarea
              readOnly
              rows={10}
              value={outputText}
              dir={mode === 'encrypt' ? 'ltr' : 'auto'}
              aria-label={mode === 'encrypt' ? 'مخرجات النص المشفر' : 'مخرجات النص المفكوك'}
              placeholder={
                mode === 'encrypt'
                  ? 'ستظهر هنا كتلة -----BEGIN IM MESSAGE----- بعد إتمام التشفير...'
                  : 'سيظهر هنا النص الأصلي بعد التحقق من وسم المصادقة...'
              }
              className={`w-full resize-y rounded-lg border border-sky-200 bg-sky-50/40 p-3.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none dark:border-sky-800/70 dark:bg-slate-950/90 dark:text-slate-100 dark:placeholder:text-slate-600 ${
                mode === 'encrypt' ? 'font-mono text-xs' : ''
              }`}
            />

            <HeaderInspector header={headerInfo} durationMs={durationMs} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sky-100 pt-4 dark:border-sky-900/50">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!outputText}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-sky-200 bg-sky-50/70 px-3.5 py-2 text-xs font-medium text-sky-900 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-sky-800/70 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copied ? 'تم النسخ' : 'نسخ الناتج'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTxt}
                disabled={!outputText}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-sky-200 bg-sky-50/70 px-3.5 py-2 text-xs font-medium text-sky-900 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-sky-800/70 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                <span>تنزيل TXT</span>
              </button>
            </div>

            {mode === 'encrypt' && outputText && (
              <button
                type="button"
                onClick={handleSendOutputToDecrypt}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-pink-200 bg-pink-50 px-3.5 py-2 text-xs font-medium text-pink-800 transition-colors hover:bg-pink-100 dark:border-pink-800/60 dark:bg-pink-950/50 dark:text-pink-300 dark:hover:bg-pink-950"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>اختبار فك التشفير</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}
