# UI Verification

Verify UI-affecting changes against the real rendered result, not just code
reading. This app's **primary** UI verification is Vitest + Testing Library
(already configured); a real-browser pass (manual or Playwright) is an optional
secondary check for visual/responsive work.

## Primary: Vitest + Testing Library

Tests live in `src/__tests__/` and run with `npm run test` (Vitest, jsdom).

When a change touches component behavior, a form, an interaction flow, or a
view-state hook:

1. Render the component/page with `@testing-library/react`.
2. Prefer accessible queries: `getByRole`, `getByLabelText`, `getByText` over
   test ids or CSS selectors.
3. Drive interaction with `@testing-library/user-event` (click, type, tab).
4. Assert on visible, accessible results (the rendered label, the disabled
   state, the validation message), not implementation details.
5. Mock `src/services/*` (the Rayfin data layer) so component/hook tests do not
   hit the client; assert the service was called with the expected input.
6. Cover the states most likely to regress: loading, empty, error, success, and
   disabled/permission-limited.

Run the targeted spec first, then the full suite before pushing.

## Secondary: real-browser pass (optional)

For changes where pixels, layout, or responsive behavior matter, also check the
running app (`npm run dev`) in a browser, or with Playwright if available:

- Open the touched route and check the happy path, then loading/empty/error.
- Resize to at least one desktop and one narrow mobile width when layout is
  affected.
- Exercise realistic input: click, keyboard navigation, hover and focus, form
  entry and submission.
- Confirm labels, focus treatment, validation, and critical status stay visible
  without depending only on hover `Tooltip` behavior.
- Prefer accessible locators and visible-state assertions over fixed sleeps.

## What To Inspect

- route title and primary heading
- primary call to action and destructive action states (`Button` `danger`,
  `ConfirmDialog`)
- keyboard tab order and focus visibility
- validation messages and disabled states (`Field` error, `Button` loading)
- empty / error / loading states (`EmptyState`, `Spinner`)
- responsive stacking, overflow, and truncation on narrow widths
- `Modal`/`ConfirmDialog` behavior, including `Escape` and overlay dismiss
- chart labels, legend clarity, summary text, and table fallback when applicable

Do not treat static code inspection alone as sufficient verification for a
user-facing change.
