import { Moon, Sun } from 'lucide-react';

export type WorkspaceTab = 'text' | 'file' | 'test' | 'spec';

interface HeaderProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const NAV_ITEMS: { id: WorkspaceTab; label: string }[] = [
  { id: 'text', label: 'تشفير النصوص' },
  { id: 'file', label: 'تشفير الملفات' },
  { id: 'test', label: 'الاختبار الذاتي' },
  { id: 'spec', label: 'المواصفات والنشر' },
];

export function Header({ activeTab, onSelectTab, isDark, onToggleTheme }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-sky-200 bg-white/95 backdrop-blur-sm dark:border-sky-900/60 dark:bg-[#0d1526]/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3 sm:px-6">
        {/* Zone 1: Brand mark (single line) */}
        <button
          type="button"
          onClick={() => onSelectTab('text')}
          className="flex shrink-0 items-center gap-2.5 text-slate-900 transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-600 dark:text-slate-100"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect
              x="2"
              y="2"
              width="28"
              height="28"
              rx="7"
              className="fill-sky-500 dark:fill-sky-500"
            />
            <path
              d="M11 14V11.5C11 8.73858 13.2386 6.5 16 6.5C18.7614 6.5 21 8.73858 21 11.5V14"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <rect
              x="8.5"
              y="14"
              width="15"
              height="11.5"
              rx="2.5"
              className="fill-pink-600 dark:fill-pink-500"
            />
            <circle cx="16" cy="19.5" r="1.75" fill="white" />
          </svg>
          <span className="whitespace-nowrap text-lg font-bold tracking-tight">خزينة IM</span>
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative shrink-0 whitespace-nowrap py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-600 ${
                  isActive
                    ? 'text-pink-700 dark:text-pink-400'
                    : 'text-slate-600 hover:text-sky-700 dark:text-slate-400 dark:hover:text-sky-300'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[13px] h-0.5 bg-pink-600 dark:bg-pink-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action (theme switch) */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-medium text-sky-900 transition-colors hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 dark:border-sky-800/70 dark:bg-sky-950/60 dark:text-sky-200 dark:hover:bg-sky-900/70"
          >
            {isDark ? <Sun className="h-4 w-4 text-pink-400" /> : <Moon className="h-4 w-4 text-pink-600" />}
            <span>{isDark ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
          </button>
        </div>
      </div>

      {/* Mobile navigation strip */}
      <nav
        aria-label="التنقل على الجوال"
        className="flex items-center gap-1 overflow-x-auto border-t border-sky-100 px-4 py-1.5 md:hidden dark:border-sky-900/60"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-pink-600 text-white dark:bg-pink-500 dark:text-slate-950'
                  : 'text-slate-600 hover:bg-sky-100 dark:text-slate-400 dark:hover:bg-sky-950'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
