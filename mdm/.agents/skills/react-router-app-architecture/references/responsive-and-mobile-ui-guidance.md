# Responsive And Mobile UI Guidance

## Goal

Keep the UI usable, readable, and touch-friendly from narrow mobile screens up
through desktop without forking the product.

## Core Approach

- Use Tailwind's responsive utilities (`sm:`, `md:`, `lg:`) and fluid primitives
  (flexbox, grid, `min-w-0`, `flex-wrap`, `clamp`) before adding hard, custom
  breakpoints.
- Choose breakpoints from content pressure, not device marketing names.
- Keep cards, panels, tables, and data containers able to shrink or wrap instead
  of assuming desktop width. The existing layout already uses patterns like
  `flex flex-wrap items-end justify-between gap-3` (see `PageHeader`) — follow
  them.

## Document And Viewport Basics

- Keep the standard mobile viewport meta tag in `index.html`:
  `width=device-width, initial-scale=1`.
- Treat ordinary app content as needing reflow at narrow widths rather than
  two-dimensional scrolling.
- Do not lock orientation.

## Interaction On Touch Devices

- Do not make hover the only way to discover required actions or meaning. The
  `Tooltip` primitive opens on focus as well as hover — keep that for any
  hover-revealed detail.
- Keep a touch path and keyboard path for the same important task.
- Keep touch targets and spacing comfortable; prefer the `Button` `md` size for
  primary actions and ensure icon-only buttons have adequate padding and an
  `aria-label`.
- Be careful with sticky headers/footers and the sidebar so they do not hide
  inputs or validation on small screens.

## Data-Dense UI On Small Screens

- The MDM screens are table-heavy. When a table becomes unreadable on mobile,
  adapt the presentation (stacked summaries, card views, progressive disclosure)
  instead of shrinking everything uniformly.
- Use horizontal scrolling for dense tables only when the structure truly
  requires it, and keep row labels/context understandable while scrolling.
- Keep `Badge`/`QualityBadge`/`ProgressBar` legible at small sizes and provide a
  non-hover path to any key value.

## Architecture Placement

- Keep responsive behavior in Tailwind utilities on the presentational layer.
- Move viewport-aware state into the page or a `src/hooks/use-<feature>.ts` hook
  only when it changes interaction flow or data loading, not pure presentation.

## Verification

- Check at least one desktop viewport and one narrow mobile viewport for
  UI-affecting changes.
- Confirm there is no accidental horizontal scrolling, clipped primary action,
  unreadable text, or hidden validation on the touched flow.
- Re-check `Tooltip`, `Modal`/`ConfirmDialog`, table, and empty/loading/error
  states on touch-sized layouts, not just desktop.
