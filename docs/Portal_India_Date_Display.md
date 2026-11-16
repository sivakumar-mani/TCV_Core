# Portal date display

Full dates in Angular templates, list grids, reports and print/export display helpers use `dd-MM-yyyy`. Existing timestamp displays keep their time component and use India time. Billing month labels remain month/year labels.

`shared/india-date.ts` and the `indiaDate` pipe separate presentation from persistence:

- Calendar-only values such as `2026-11-16` remain the same calendar date on every device.
- UTC/offset timestamps are displayed in `Asia/Kolkata`; `2026-11-15T18:30:00Z` displays as `16-11-2026`.
- Offset-free SQL timestamps are interpreted as India business time.
- Empty/invalid dates are rendered using the caller's empty placeholder; ambiguous slash-separated strings are not guessed.
- The formatter does not mutate Date objects, API responses or form payloads.

Native HTML date inputs retain their `yyyy-MM-dd` values, constraints, calendar picker and event behavior. Their visual ordering/separators are controlled by the browser/operating-system region settings; replacing those native controls was deliberately avoided. Set the device/browser region to India for day-first native input rendering. Employee Material date pickers explicitly display `dd-MM-yyyy` while retaining their Date model and existing ISO save conversion.

Save handlers, edit/input-date conversion methods, API filters, billing calculations and database storage formats are unchanged. Do not put formatted `dd-MM-yyyy` display strings into API payloads or native date controls. An AST comparison verified 1,410 non-display methods were unchanged; the other changed method only substitutes date formatting in a printable payment invoice.

Verification covered calendar-only dates, timestamps, invalid/leap dates, month/year boundaries, immutable inputs, employee-picker display, and execution under UTC, Pacific/Auckland and America/Los_Angeles. Existing subscription editing, selectable renewal dates, payment-selection payload and invoice/email-preview checks passed, along with TypeScript checking and the root-path production build. Live VPS deployment was not performed.

Deploy the complete contents of `portal-india-dates-frontend-root.zip` to the ERP domain/subdomain web root after backing up the current deployment. It uses `<base href="/">`, includes all matching bundles and `.htaccess`, and must not be deployed beneath `/tcverp/`. Preserve any intentional production-specific `config.js` configuration. This display-only update does not require a backend/database migration. Previously generated PDFs and emails do not change until regenerated.
