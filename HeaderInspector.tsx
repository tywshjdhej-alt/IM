import { ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { ImHeaderInfo } from '../crypto/imFormat';

interface HeaderInspectorProps {
  header: ImHeaderInfo | null;
  durationMs: number | null;
}

export function HeaderInspector({ header, durationMs }: HeaderInspectorProps) {
  const [expanded, setExpanded] = useState(false);

  if (!header) return null;

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/30">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-right text-xs font-medium text-sky-900 transition-colors hover:text-pink-700 dark:text-sky-200 dark:hover:text-pink-300"
      >
        <div className="flex flex-wrap items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-pink-600 dark:text-pink-400" />
          <span>فحص رأس الحزمة (IM FORMAT v{header.version} · 44 بايت AAD)</span>
          {durationMs !== null && (
            <>
              <span aria-hidden="true" className="text-sky-400">·</span>
              <span className="font-mono tabular-nums text-sky-700 dark:text-sky-300">
                {durationMs} ms
              </span>
            </>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-sky-200 px-4 py-3 text-xs dark:border-sky-900/60">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center justify-between gap-2 border-b border-sky-200/70 pb-1.5 dark:border-sky-900/50">
              <dt className="text-slate-500 dark:text-slate-400">Magic / Version</dt>
              <dd className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100" dir="ltr">
                {header.magic} (v{header.version})
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-sky-200/70 pb-1.5 dark:border-sky-900/50">
              <dt className="text-slate-500 dark:text-slate-400">النمط (Flags)</dt>
              <dd className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100" dir="ltr">
                0x0{header.flags} ({header.mode.toUpperCase()})
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-sky-200/70 pb-1.5 dark:border-sky-900/50">
              <dt className="text-slate-500 dark:text-slate-400">التشفير (CipherID)</dt>
              <dd className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100" dir="ltr">
                0x0{header.cipherId} (AES-256-GCM)
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-sky-200/70 pb-1.5 dark:border-sky-900/50">
              <dt className="text-slate-500 dark:text-slate-400">اشتقاق المفتاح (KdfID)</dt>
              <dd className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100" dir="ltr">
                0x0{header.kdfId} (Argon2id)
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-sky-200/70 pb-1.5 dark:border-sky-900/50">
              <dt className="text-slate-500 dark:text-slate-400">معاملات Argon2id</dt>
              <dd className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100" dir="ltr">
                {header.kdfMemKiB} KiB / t={header.kdfIterations} / p={header.kdfParallelism}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-sky-200/70 pb-1.5 dark:border-sky-900/50">
              <dt className="text-slate-500 dark:text-slate-400">Salt / Nonce</dt>
              <dd className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100" dir="ltr">
                {header.saltLen}B / {header.nonceLen}B
              </dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1 pt-1">
              <dt className="text-slate-500 dark:text-slate-400">Salt (16 bytes hex)</dt>
              <dd className="break-all font-mono text-[11px] text-slate-800 dark:text-slate-200" dir="ltr">
                {header.saltHex}
              </dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1">
              <dt className="text-slate-500 dark:text-slate-400">Nonce / IV (12 bytes hex)</dt>
              <dd className="break-all font-mono text-[11px] text-slate-800 dark:text-slate-200" dir="ltr">
                {header.nonceHex}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
