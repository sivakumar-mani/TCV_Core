# Complete a CATV complaint from its WhatsApp message

This adds a Mark as Done link to newly sent CATV group notifications. It opens an API-hosted confirmation page, without a portal login or frontend deployment. The employee must press Confirm Done; opening the link or generating a WhatsApp preview does not complete anything.

## Deploy and enable

1. Back up the corresponding backend files. Extract `catv-whatsapp-done-update.zip` directly into `/home/timecablevision.in/backend`, preserving its folders. The update includes `index.js`, `services/catvWhatsAppNotifications.js`, `services/catvComplaintCompletionLinks.js` and `routes/catvComplaintCompletionRouter.js`. No new npm dependencies are required.
2. Keep the existing WhatsApp settings and saved `.wwebjs_auth` directory. Add these settings to `backend/.env`:

```dotenv
CATV_WHATSAPP_DONE_ENABLED=true
CATV_WHATSAPP_PUBLIC_URL=https://api.timecablevision.in
```

Use the real publicly accessible API origin with HTTPS, no path or trailing query parameters. If the API is instead served directly at `https://timecablevision.in/api`, use `https://timecablevision.in` as the origin. Never use localhost for group links.

3. Restart the backend once. The worker creates the `catv_whatsapp_completion_links` table using its existing database account. CREATE permission is required. Link-generation errors leave the notification queued and do not prevent complaint registration. Check backend logs before retrying registrations.
4. Verify `https://api.timecablevision.in/api/public/catv-complaints/done` displays the confirmation page with an invalid/incomplete-link message, without asking for portal login. No complaint is read or modified by this GET request.
5. Register one real CATV complaint. Open its newly generated Mark as Done link, confirm the displayed complaint number and verify the portal still shows Open before pressing Confirm Done. Press the button once and verify Complete in the portal, a new audit-history entry and an unusable old link. Existing WhatsApp messages are not modified or resent.

## Scope and behavior

- Links contain 256-bit random tokens, with only SHA-256 hashes stored in the database. The secret is in the URL fragment so normal HTTP access logs and link previews do not receive it. Treat the full link as a private bearer capability.
- A link expires 72 hours after generation and is consumed on successful completion. Confirmation atomically updates the complaint, adds an audit attempt and consumes the token. Locks protect against duplicate completions, including concurrent portal actions. Invalid, expired, consumed, deleted or non-CATV targets cannot be completed through this endpoint.
- Only the complaint number and completion state are shown; customer contact details are not exposed on this page. The link cannot delete, reopen, reassign or access other portal data.
- Anyone holding a valid link can complete that complaint, including someone who receives a forwarded copy. The audit note explicitly records completion via a WhatsApp link with unverified employee identity; no employee or logged-in user is invented. Existing technician assignment is retained.
- Portal completion and admin-only deletion retain their existing authentication/permission checks. This feature is isolated under `/api/public/catv-complaints`; it does not bypass general portal authorization.
- No automatic WhatsApp completion acknowledgement is sent by this update. The web page and portal show the resulting status.
- To stop accepting links, set `CATV_WHATSAPP_DONE_ENABLED=false` and restart. Normal WhatsApp notifications continue without Done links. Manual requeue/resend can replace a complaint's earlier token; review delivery history before resending.

All automated checks use mocks/in-memory data. Live VPS deployment, public API routing and actual WhatsApp delivery still require the above test.
