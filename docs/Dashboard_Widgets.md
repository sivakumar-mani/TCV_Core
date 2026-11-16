# Dashboard widget permissions and unpaid subscriptions

Deploy `dashboard-backend-update.zip` into the existing backend folder, preserving its internal paths, and restart the backend. No new npm dependencies or schema migrations are required.

Deploy the contents of `dashboard-frontend-root.zip` into the web root of the ERP domain/subdomain. This build uses `<base href="/">`; do not deploy it under `/tcverp/`. Preserve any intentional production-specific `config.js` settings. Back up the existing frontend and backend files before replacing them.

As admin, open Role Permissions, select the role, and enable View for the desired entries under Dashboard Widgets. Keep General → Dashboard → View enabled for users who need the dashboard page. New widget permissions are denied for non-admin roles until explicitly saved. Admins retain all widgets. Affected users should sign out and back in to refresh their frontend permissions.

The eight independent widgets are Complaints by Status, Workflow Approvals Waiting, Fault Boxes in Service, CATV Customers, Internet Customers, Internet Expiry Pending, CATV Unpaid Subscriptions and Internet Unpaid Subscriptions. These are read permissions; they do not grant access to the underlying customer, complaint or payment screens. Internet expiry details additionally retain the existing Internet Customers View requirement. Sending reminder emails still requires Internet Customers Update.

Unpaid counts group each customer once by the oldest approved subscription billing month with an outstanding amount:

| Bucket | Example when current India month is November 2026 |
| --- | --- |
| Current month | Oldest unpaid month is November 2026 |
| 2 months | Oldest unpaid month is October 2026 |
| 3+ months | Oldest unpaid month is September 2026 or earlier |

Multiple package rows do not duplicate a customer. Partially paid subscriptions with a remaining amount are included. Fully paid, zero-balance, future and unapproved subscriptions are excluded. Customers must be approved; CATV FREE and LEASE_LINE customers are excluded. Inactive customers with outstanding bills remain counted. These are aging buckets, not a count of consecutive generated invoices. The counts use saved subscription amounts and payments; they do not create invoices or modify payment records.

Verification covered server permission filtering, separate CATV/Internet grants, denied requests, frontend visibility, duplicate package rows, partial payments, year boundaries, unapproved and future subscriptions, existing dashboard summary/expiry paths and workflow eligibility. The production root build passed. Live VPS counts and deployment have not been verified.
