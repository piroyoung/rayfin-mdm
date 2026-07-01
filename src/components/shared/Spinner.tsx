import { cn } from '@/lib/format';

export function Spinner({
  size = 'md',
  label,
}: {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}) {
  const dim =
    size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-8 w-8' : 'h-5 w-5';
  return (
    <span className="inline-flex items-center gap-2 text-gray-500">
      <svg
        className={cn('animate-spin', dim)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"
        />
      </svg>
      {label && <span className="text-sm">{label}</span>}
    </span>
  );
}
