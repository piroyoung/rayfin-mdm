/**
 * Toast context and hook, kept JSX-free and separate from {@link ToastProvider}
 * so use-case hooks can raise toasts without importing a component and so the
 * context identity stays stable (satisfies react-refresh).
 */
import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export type ToastFn = (message: string, tone?: ToastTone) => void;

export const ToastContext = createContext<ToastFn | undefined>(undefined);

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
