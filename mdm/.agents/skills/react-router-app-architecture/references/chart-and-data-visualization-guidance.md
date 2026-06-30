# Chart And Data Visualization Guidance

## Goal

Use the simplest accessible chart that answers the product question without
overloading the canvas.

## Choose The Chart Deliberately

- Use line charts for continuous trends over time.
- Use bar or column charts to compare values across discrete categories or
  distinct periods.
- Use combo charts only when line and bar marks truly share the same X-axis.
- Add a secondary Y-axis only when measures genuinely have different scales, and
  label both axes explicitly.

## Keep The Visual Quiet

- Keep data ink the primary focus. Avoid 3D effects, heavy shadows, decorative
  gradients, and non-informational chrome.
- Keep axis labels readable and gridlines visually secondary.
- Use the app's existing color vocabulary (the `BadgeTone` palette and Tailwind
  color scales already used in `ui.tsx`) instead of ad hoc hardcoded colors.
- Keep titles, legends, and units short and easy to scan.
- Match legend markers to the actual chart geometry.

## Labels, Tooltip, And Interaction

- Keep key context visible: chart title, timeframe, units, series names,
  thresholds, and major status cues.
- Use the `Tooltip` primitive for supplemental inspection, not as the only place
  meaning can be discovered.
- Keep interactions simple. Add filtering, drilldown, or zoom only when they
  materially improve exploration.
- If a chart gets crowded, reduce visible series or split the view instead of
  stacking more colors and labels onto one canvas.

## Accessibility

- Never rely on color alone. Add labels, shape differences, or annotations when
  distinctions matter.
- Keep keyboard access and focus treatment intentional for interactive chart
  controls.
- For important charts, provide a nearby text summary and, when exact values
  matter, an accessible table or equivalent non-hover path to the data (the
  `Card` + simple table pattern already used on dashboard-style screens works
  well).
- Do not hide critical insight, error state, or threshold meaning only inside a
  hover tooltip.

## Motion

- Animate only meaningful state changes; prefer subtle motion that helps users
  track change over decorative animation.

## Architecture Placement

- Put data-to-series mapping, filtering, grouping, sorting, and drill state in
  the page or a `src/hooks/use-<feature>.ts` view-state hook — not in the chart
  component.
- Keep reusable chart shells/wrappers as presentational components in
  `src/components/` (promote to `ui.tsx` only once genuinely shared).
- Keep the chart component focused on rendering, theming, and accessibility
  wiring.
- Fetch the underlying data through `src/services/*`, never directly from the
  chart component.

## Library Note

No chart library is installed today. If a chart need arises, pick one
lightweight, accessible library, confine its adapter to a presentational
component, and keep the series-shaping logic in the page/hook as above. Document
the choice in the project README.
