# Operational email notifications

The backend started by `node server.js` checks for new pending workflow approvals and open complaints every 30 seconds. It uses the existing `INVOICE_EMAIL_USER`, `INVOICE_EMAIL_PASSWORD`, `INVOICE_SMTP_HOST`, and `INVOICE_SMTP_PORT` settings, sending as `tcvadmin@timecablevision.in`.

- Workflow, CATV approval group and purchase approval emails go to active ADMIN accounts.
- New OPEN complaints go to active ADMIN, MANAGER and SENIOR_MANAGER accounts.
- Recipient addresses come from the linked active employee's saved email. Duplicate addresses are removed. An account without a linked employee or valid email receives no notification.
- Email failures never roll back a business operation or change its API response.

On first startup the worker creates `operational_email_state` and `operational_email_log`. The saved activation timestamp excludes older records, preventing a historical email burst. Newly created records after activation remain eligible across backend restarts while they are still pending/open. Updating an existing approval request does not create another notification.

Each source record and recipient has a unique delivery key. Mail-server acceptance is recorded as SENT. Explicit recipient rejection can retry after five minutes, up to three attempts. Connection failures or interrupted attempts remain UNCERTAIN/SENDING and require mail-server log review before a manual retry, because delivery may already have occurred. The worker sends at most 50 messages per scan.

Before deployment, confirm the ADMIN/MANAGER/SENIOR_MANAGER accounts are active, linked to the correct employees, and those employees have valid saved emails. Restart the backend after deployment. Existing records are not backfilled. A record approved or closed before the next scan does not generate an email.

Verification uses injected databases and mock SMTP transports; it sends no real email and applies no live schema changes.
