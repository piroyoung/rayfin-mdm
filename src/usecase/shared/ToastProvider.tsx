/** Lightweight toast notifications. */
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import {
  ToastContext,
  type ToastFn,
  type ToastTone,
} from './toast-context';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const TONE_CLASS: Record<ToastTone, string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback<ToastFn>((message, tone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 bottom-4 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${TONE_CLASS[t.tone]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
