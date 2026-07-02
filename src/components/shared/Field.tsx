import type { ReactNode } from 'react';

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && !error && (
        <span className="mt-1 block text-xs text-gray-500">{hint}</span>
      )}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
