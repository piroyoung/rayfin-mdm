# UI Presentation Guidance

Covers chart/data-visualization choices and responsive/mobile behavior for the
app's presentational layer. For component file shape and Tailwind styling, see
[`component-and-styling-rules.md`](component-and-styling-rules.md). Verify
rendered results with
[`playwright-ui-verification.md`](playwright-ui-verification.md).

## Charts And Data Visualization

### Goal

Use the simplest accessible chart that answers the product question without
overloading the canvas.

### Choose The Chart Deliberately

- Use line charts for continuous trends over time.
- Use bar or column charts to compare values across discrete categories or
  distinct periods.
- Use combo charts only when line and bar marks truly share the same X-axis.
- Add a secondary Y-axis only when measures genuinely have different scales, and
  label both axes explicitly.

### Keep The Visual Quiet

- Keep data ink as the primary focus. Avoid 3D effects, heavy shadows,
  decorative gradients, and non-informational chrome.
- Keep axis labels readable and keep gridlines visually secondary.
- Use theme-aware Tailwind colors/tokens instead of ad hoc hardcoded palettes.
- Keep chart titles, legends, and units short and easy to scan.
- Match legend markers to the actual chart geometry.

### Labels, Tooltip, And Interaction

- Keep key context visible: chart title, timeframe, units, series names,
  thresholds, and major status cues.
- Use Tooltip for supplemental inspection, not as the only place users can
  discover the chart's meaning.
- Keep interactions simple. Add filtering, drilldown, or zoom only when they
  materially improve exploration.
- If a chart becomes crowded, reduce visible series or split the view instead of
  stacking more colors and labels into one canvas.

### Motion

- Animate only meaningful state changes.
- If both axes and marks change, transition axes first and data second.
- Avoid independent animation of many marks at once.
- Prefer subtle motion that helps users track change.

### Chart Accessibility

- Never rely on color alone. Add labels, shape differences, annotations, or
  patterns when distinctions matter.
- Keep keyboard access and focus treatment intentional for interactive chart
  controls.
- For important charts, provide a nearby text summary and, when exact values
  matter, an accessible table or equivalent non-hover path to the data.
- Do not hide critical insight, error state, or threshold meaning only inside a
  hover Tooltip.

## Responsive And Mobile UI

### Goal

Keep the UI usable, readable, and touch-friendly from narrow mobile screens up
through desktop without forking the product into separate architectures.

### Core Approach

- Design responsive layouts that stay capable on both mobile and desktop. Start
  from the most constrained layout when it helps, but do not treat a rigid
  mobile-first process as mandatory.
- Use fluid layout primitives — CSS Grid, Flexbox, intrinsic sizing, and
  percentage or `clamp()`-based sizing (all expressible with Tailwind) — before
  adding hard breakpoints.
- Choose Tailwind breakpoints (`sm:`, `md:`, `lg:`) from content pressure, not
  device marketing names.
- Keep media, cards, panels, and data containers able to shrink or wrap instead
  of assuming desktop width.

### Document And Viewport Basics

- Keep the standard mobile viewport meta tag in the document head:
  `width=device-width, initial-scale=1`.
- Add `viewport-fit=cover` only when the layout intentionally handles safe-area
  insets.
- Treat ordinary app content as needing reflow at narrow widths rather than
  two-dimensional scrolling.
- Do not lock orientation unless one orientation is genuinely essential.

### Interaction On Touch Devices

- Do not make hover the only way to discover required actions or meaning.
- Keep a touch path and keyboard path for the same important task.
- Meet at least WCAG 2.2 minimum target size expectations or provide equivalent
  spacing between targets.
- Prefer larger touch targets for primary actions, icon-only buttons, and
  dismiss controls.
- Be careful with sticky headers, footers, and bottom action bars so they do
  not hide inputs or validation on small screens.

### Data-Dense UI On Small Screens

- If a table, chart, or filter bar becomes unreadable on mobile, adapt the
  presentation instead of shrinking everything uniformly.
- Prefer stacked summaries, progressive disclosure, card views, or drill-in
  patterns before forcing dense desktop layouts onto mobile.
- Use horizontal scrolling for dense data only when the structure truly requires
  it, and keep labels understandable when scrolling.

## Architecture Placement

- Put query-result-to-series mapping, filters, grouping, sorting, and drill
  state in `src/usecase/<feature>/`, and keep chart components focused on
  rendering, theming, and accessibility wiring. The data itself arrives through
  a repository port, never `client.data` in the component.
- Keep shared chart shells, wrappers, and common chart primitives in
  `src/components/shared/`, and keep feature-specific chart views near the
  owning feature component.
- Treat a chart-library adapter as client-side UI infrastructure only when it
  needs a reusable wrapper boundary.
- Keep responsive layout behavior in Tailwind utilities on presentational
  components by default. Move viewport-aware state into
  `src/usecase/<feature>/` only when it affects interaction flow, data
  loading, or feature behavior rather than pure presentation.

## Verification

Verify rendered charts and responsive layouts in a real browser per
[`playwright-ui-verification.md`](playwright-ui-verification.md) and
[`verification-gates.md`](verification-gates.md). Specifically confirm:

- at least one desktop viewport and one narrow mobile viewport for UI-affecting
  changes, and both portrait and landscape when orientation matters
- no accidental horizontal scrolling, clipped primary action, unreadable text,
  or hidden validation on the touched flow
- Tooltip, Popover, chart, table, and dialog behavior on touch-sized layouts
- chart labels, legend clarity, summary text, and a non-hover path to key
  values
