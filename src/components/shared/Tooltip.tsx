import type { ReactNode } from 'react';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/format';

type TooltipSide = 'top' | 'bottom' | 'right';

/**
 * Lightweight, dependency-free tooltip. Renders the bubble into a body-level
 * portal with fixed positioning so it is never clipped by `overflow` scroll
 * containers (e.g. the data tables). Shows on hover and keyboard focus.
 */
export function Tooltip({
  label,
  side = 'top',
  className,
  children,
}: {
  label: ReactNode;
  side?: TooltipSide;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  );
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (side === 'right') {
        setCoords({ top: r.top + r.height / 2, left: r.right });
      } else if (side === 'bottom') {
        setCoords({ top: r.bottom, left: r.left + r.width / 2 });
      } else {
        setCoords({ top: r.top, left: r.left + r.width / 2 });
      }
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, side]);

  if (label == null || label === '') return <>{children}</>;

  const positionClass =
    side === 'right'
      ? 'ml-2 -translate-y-1/2'
      : side === 'bottom'
        ? 'mt-2 -translate-x-1/2'
        : '-mt-2 -translate-x-1/2 -translate-y-full';

  return (
    <>
      <span
        ref={triggerRef}
        className={cn('inline-flex', className)}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
      {open &&
        coords &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            className={cn(
              'pointer-events-none fixed z-[60] max-w-xs rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs leading-relaxed font-medium text-white shadow-lg',
              positionClass
            )}
            style={{ top: coords.top, left: coords.left }}
          >
            {label}
          </span>,
          document.body
        )}
    </>
  );
}
