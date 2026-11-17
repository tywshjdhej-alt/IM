/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertTriangle, BookOpenText, FileLock2, FlaskConical, MessageSquareLock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FileCryptoPanel } from './components/FileCryptoPanel';
import { Header, WorkspaceTab } from './components/Header';
import { SelfTestPanel } from './components/SelfTestPanel';
import { SpecAndDeployPanel } from './components/SpecAndDeployPanel';
import { TextCryptoPanel } from './components/TextCryptoPanel';
import { assertCryptoRuntime } from './crypto/imFormat';

const THEME_STORAGE_KEY = 'im-vault-theme-mode';

const WORKSPACE_TABS: { id: WorkspaceTab; code: string; label: string; icon: typeof MessageSquareLock }[] = [
  { id: 'text', code: 'IM-ENC/DEC', label: 'تشفير النصوص', icon: MessageSquareLock },
  { id: 'file', code: 'IM-FILE', label: 'تشفير الملفات', icon: FileLock2 },
  { id: 'test', code: 'IM-TEST', label: 'الاختبار الذاتي', icon: FlaskConical },
  { id: 'spec', code: 'IM-SPEC', label: 'المواصفات والنشر', icon: BookOpenText },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('text');
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark') return true;
    return false;
  });
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [isDark]);

  useEffect(() => {
    try {
      assertCryptoRuntime();
      setRuntimeError(null);
    } catch (err) {
      setRuntimeError(err instanceof Error ? err.message : 'تعذر تهيئة بيئة التشفير.');
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-sky-50/70 text-slate-900 transition-colors duration-150 dark:bg-[#0b1120] dark:text-slate-100">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {/* Runtime Security Guard Warning (only rendered if WebCrypto or Argon2id WASM is unavailable) */}
        {runtimeError && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-pink-300 bg-pink-50 p-4 text-sm text-pink-900 dark:border-pink-900/70 dark:bg-pink-950/50 dark:text-pink-200"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-pink-600 dark:text-pink-400" />
            <div>
              <p className="font-bold">تنبيه أمني: تعذر تفعيل المحرك التشفيري</p>
              <p className="mt-1 text-xs leading-relaxed">{runtimeError}</p>
            </div>
          </div>
        )}

        {/* Workspace Summary & Module Switcher */}
        <div className="mb-8 flex flex-col gap-6 border-b border-sky-200 pb-6 lg:flex-row lg:items-end lg:justify-between dark:border-sky-900/60">
          <div className="space-y-2">
            <h1 className="max-w-2xl text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
              منصة التشفير الفوري وفق IM FORMAT v1
            </h1>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-mono font-semibold text-pink-700 dark:text-pink-400" dir="ltr">
                AES-256-GCM
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-sky-700 dark:text-sky-300" dir="ltr">
                Argon2id (19 MiB, t=2, p=1)
              </span>
              <span aria-hidden="true">·</span>
              <span>رأس مصادق 44 بايت (AAD)</span>
              <span aria-hidden="true">·</span>
              <span>تنفيذ محلي بدون كلمة مرور</span>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="وحدات التشفير"
            className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-sky-200 bg-white p-1 dark:border-sky-900/60 dark:bg-[#111a2e]"
          >
            {WORKSPACE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-pink-600 text-white dark:bg-pink-500 dark:text-slate-950'
                      : 'text-slate-600 hover:bg-sky-50 hover:text-sky-900 dark:text-slate-400 dark:hover:bg-sky-950/60 dark:hover:text-sky-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={`hidden font-mono text-[10px] sm:inline ${
                      isSelected ? 'text-pink-100 dark:text-slate-900/80' : 'text-sky-600/80 dark:text-sky-400/70'
                    }`}
                    dir="ltr"
                  >
                    {tab.code}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Module Viewport */}
        {activeTab === 'text' && <TextCryptoPanel />}
        {activeTab === 'file' && <FileCryptoPanel />}
        {activeTab === 'test' && <SelfTestPanel />}
        {activeTab === 'spec' && <SpecAndDeployPanel />}
      </main>

      <footer className="border-t border-sky-200 bg-white py-5 text-xs text-slate-600 dark:border-sky-900/60 dark:bg-[#0d1526] dark:text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6">
          <p>خزينة IM · مواصفة IM FORMAT v1 · لا يتم إرسال أي بيانات خارج جهازك.</p>
          <p className="font-mono tabular-nums text-sky-700 dark:text-sky-300" dir="ltr">
            Web Crypto AES-256-GCM + hash-wasm Argon2id
          </p>
        </div>
      </footer>
    </div>
  );
}
