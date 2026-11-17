import {
  AlertTriangle,
  Download,
  FileArchive,
  FileCheck2,
  Lock,
  Trash2,
  Unlock,
  Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import {
  ImFileMetadata,
  ImHeaderInfo,
  LARGE_FILE_WARNING_BYTES,
  MAX_SAFE_BROWSER_BYTES,
  decryptFileIm,
  encryptFileIm,
  formatBytes,
} from '../crypto/imFormat';
import { HeaderInspector } from './HeaderInspector';

type FileMode = 'encrypt' | 'decrypt';

interface ProcessedFileDownload {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  originalMeta?: ImFileMetadata;
}

export function FileCryptoPanel() {
  const [mode, setMode] = useState<FileMode>('encrypt');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stageText, setStageText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [resultFile, setResultFile] = useState<ProcessedFileDownload | null>(null);
  const [headerInfo, setHeaderInfo] = useState<ImHeaderInfo | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleModeChange = (nextMode: FileMode) => {
    setMode(nextMode);
    setSelectedFile(null);
    setResultFile(null);
    setHeaderInfo(null);
    setDurationMs(null);
    setError(null);
    setStageText('');
  };

  const handleSelectFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setResultFile(null);
    setHeaderInfo(null);
    setDurationMs(null);

    if (file.size > MAX_SAFE_BROWSER_BYTES) {
      setSelectedFile(null);
      setError(
        `حجم الملف (${formatBytes(file.size)}) يتجاوز الحد الآمن للمعالجة المتجاورة في ذاكرة المتصفح (${formatBytes(MAX_SAFE_BROWSER_BYTES)}).`
      );
      return;
    }

    setSelectedFile(file);
  };

  const triggerDownload = (fileData: ProcessedFileDownload) => {
    const bufferCopy = new Uint8Array(fileData.bytes).buffer;
    const blob = new Blob([bufferCopy], { type: fileData.mimeType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileData.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleProcessFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResultFile(null);

    if (!selectedFile) {
      setError('يرجى اختيار ملف أولاً عبر السحب والإفلات أو زر الاستعراض.');
      return;
    }

    setIsProcessing(true);
    setStageText('قراءة الملف إلى الذاكرة...');
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const inputBytes = new Uint8Array(arrayBuffer);

      if (mode === 'encrypt') {
        const res = await encryptFileIm(
          inputBytes,
          {
            name: selectedFile.name,
            type: selectedFile.type || 'application/octet-stream',
            size: selectedFile.size,
            lastModified: selectedFile.lastModified,
          },
          setStageText
        );
        const output: ProcessedFileDownload = {
          bytes: res.encryptedBytes,
          fileName: res.outputFileName,
          mimeType: 'application/octet-stream',
        };
        setResultFile(output);
        setHeaderInfo(res.header);
        setDurationMs(res.durationMs);
        setStageText('تم تشفير الملف بنجاح.');
        triggerDownload(output);
      } else {
        const res = await decryptFileIm(inputBytes, setStageText);
        const output: ProcessedFileDownload = {
          bytes: res.fileBytes,
          fileName: res.metadata.name,
          mimeType: res.metadata.type,
          originalMeta: res.metadata,
        };
        setResultFile(output);
        setHeaderInfo(res.header);
        setDurationMs(res.durationMs);
        setStageText('تم التحقق من سلامة الملف وفك تشفيره بنجاح.');
        triggerDownload(output);
      }
    } catch (err) {
      setStageText('');
      setHeaderInfo(null);
      setDurationMs(null);
      setError(err instanceof Error ? err.message : 'فشلت معالجة الملف.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResultFile(null);
    setHeaderInfo(null);
    setDurationMs(null);
    setError(null);
    setStageText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isLargeFile = selectedFile !== null && selectedFile.size > LARGE_FILE_WARNING_BYTES;

  return (
    <section aria-labelledby="file-panel-heading" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sky-200 pb-4 dark:border-sky-900/60">
        <div>
          <h2 id="file-panel-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100">
            تشفير وفك تشفير الملفات (IM FILE)
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            تشفير فوري للملفات بدون كلمة مرور مع حفظ الاسم الأصلي ونوع MIME ووسم مصادقة 16 بايت.
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
            <span>تشفير ملف</span>
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
            <span>فك تشفير ملف</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleProcessFile} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Dropzone & Controls */}
        <div className="space-y-5 rounded-xl border border-sky-200 bg-white p-5 lg:col-span-7 dark:border-sky-900/60 dark:bg-[#111a2e]">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleSelectFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors ${
              isDragging
                ? 'border-pink-500 bg-pink-50/70 dark:border-pink-400 dark:bg-pink-950/30'
                : 'border-sky-300 bg-sky-50/50 hover:border-pink-400 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-950/40 dark:hover:border-pink-500/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={mode === 'decrypt' ? '.imvault,.im,*/*' : '*/*'}
              className="hidden"
              onChange={(e) => handleSelectFile(e.target.files?.[0])}
            />
            <Upload className="mb-3 h-8 w-8 text-pink-600 dark:text-pink-400" />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {mode === 'encrypt'
                ? 'اسحب أي ملف وأفلته هنا، أو انقر للاختيار من جهازك'
                : 'اسحب ملف .imvault المشفر هنا، أو انقر لاختياره'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              المعالجة تتم محلياً داخل المتصفح دون رفع أي بايت إلى أي خادم
            </p>
          </div>

          {selectedFile && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm dark:border-sky-900/60 dark:bg-sky-950/40">
              <div className="flex min-w-0 items-center gap-3">
                <FileArchive className="h-5 w-5 shrink-0 text-pink-600 dark:text-pink-400" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100" dir="auto">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono tabular-nums">{formatBytes(selectedFile.size)}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{selectedFile.type || 'application/octet-stream'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-xs font-medium text-pink-700 hover:text-pink-900 dark:text-pink-400 dark:hover:text-pink-300"
              >
                إزالة
              </button>
            </div>
          )}

          {isLargeFile && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="leading-relaxed">
                تنبيه الذاكرة: حجم الملف يتجاوز 150 MB. نظراً لأن Web Crypto AES-GCM يعالج المخزن المؤقت بالكامل في الذاكرة (RAM)، قد يستغرق التشفير ثوانٍ إضافية أو يتأثر بقيود ذاكرة المتصفح.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-100 pt-4 dark:border-sky-900/50">
            <button
              type="button"
              onClick={handleReset}
              disabled={isProcessing || (!selectedFile && !resultFile)}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-sky-200 bg-sky-50/70 px-4 py-2.5 text-xs font-medium text-sky-900 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-sky-800/70 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>إعادة تعيين</span>
            </button>

            <button
              type="submit"
              disabled={isProcessing || !selectedFile}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-pink-500 dark:text-slate-950 dark:hover:bg-pink-400"
            >
              {mode === 'encrypt' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              <span>
                {isProcessing
                  ? 'جاري المعالجة...'
                  : mode === 'encrypt'
                  ? 'تشفير وتنزيل الملف'
                  : 'فك التشفير واسترجاع الملف'}
              </span>
            </button>
          </div>
        </div>

        {/* Status & Result Column */}
        <div className="flex flex-col justify-between space-y-5 rounded-xl border border-sky-200 bg-white p-5 lg:col-span-5 dark:border-sky-900/60 dark:bg-[#111a2e]">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              حالة المعالجة والنتيجة
            </h3>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-pink-300 bg-pink-50 p-3.5 text-sm text-pink-900 dark:border-pink-900/60 dark:bg-pink-950/40 dark:text-pink-200"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-pink-600 dark:text-pink-400" />
                <p className="leading-relaxed">{error}</p>
              </div>
            )}

            {isProcessing && (
              <div className="space-y-2.5 rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/60 dark:bg-sky-950/40">
                <p className="text-xs font-medium text-pink-700 dark:text-pink-300">{stageText}</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-sky-200 dark:bg-slate-800">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-pink-600 dark:bg-pink-400" />
                </div>
              </div>
            )}

            {!isProcessing && !resultFile && !error && (
              <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-5 text-xs leading-relaxed text-slate-600 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-slate-400">
                <p className="font-medium text-sky-900 dark:text-sky-200">آلية تغليف الملفات في IM FORMAT v1:</p>
                <ul className="mt-2 list-disc space-y-1.5 pr-4">
                  <li>يتم حفظ الاسم الأصلي ونوع الملف في ترويسة JSON مشفرة داخل جسم الحزمة.</li>
                  <li>يبدأ الملف الناتج برأس 44 بايت مصادق عليه كـ AAD وينتهي بوسم المصادقة AuthTag بطول 16 بايت.</li>
                  <li>عند فك التشفير، يُسترجع الملف باسمه الأصلي ونوعه الدقيق تلقائياً دون الحاجة لكلمة مرور.</li>
                </ul>
              </div>
            )}

            {resultFile && (
              <div className="space-y-4">
                <div className="rounded-lg border border-sky-300 bg-sky-50/90 p-4 dark:border-sky-800 dark:bg-sky-950/50">
                  <div className="flex items-start gap-2.5">
                    <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-pink-600 dark:text-pink-400" />
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-sky-950 dark:text-sky-100">
                        {mode === 'encrypt' ? 'اكتمل التشفير بنجاح' : 'اكتمل فك التشفير والتحقق بنجاح'}
                      </p>
                      <p className="truncate text-xs font-medium text-sky-800 dark:text-sky-300" dir="auto">
                        {resultFile.fileName}
                      </p>
                      <p className="font-mono text-xs tabular-nums text-pink-700 dark:text-pink-300">
                        الحجم الناتج: {formatBytes(resultFile.bytes.length)}
                        {durationMs !== null ? ` · ${durationMs} ms` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => triggerDownload(resultFile)}
                    className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-pink-700 dark:bg-pink-500 dark:text-slate-950 dark:hover:bg-pink-400"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>إعادة تنزيل الملف</span>
                  </button>
                </div>

                <HeaderInspector header={headerInfo} durationMs={durationMs} />
              </div>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}
