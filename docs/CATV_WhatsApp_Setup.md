# CATV complaint notifications to TCV Support

This optional integration uses whatsapp-web.js and a linked normal WhatsApp account.
The sending number must already be a member of **TCV Support** and allowed to send messages.
It runs in the backend process; no public WhatsApp management endpoints are exposed.

## Link the account on the backend host

1. Deploy the backend files and run `npm ci` inside `backend`. The host needs Chrome/Chromium and its system dependencies. If Puppeteer's browser download is disabled, set `CATV_WHATSAPP_CHROME_PATH` to an installed Chrome executable.
2. Stop any existing backend WhatsApp worker before linking. Only one browser process may use the session directory.
3. In a private terminal on that host, run `npm run whatsapp:setup -- "TCV Support"`.
4. On the sending phone, open WhatsApp → Linked devices → Link a device, and scan the terminal QR code. Keep the QR private.
5. The command prints the matching group ID and exits without sending anything. If there are duplicate group names, verify which ID is correct before continuing.
6. Add the following to the host's `backend/.env`, replacing the placeholder with the printed ID:

```dotenv
CATV_WHATSAPP_ENABLED=true
CATV_WHATSAPP_GROUP_ID=REPLACE_WITH_VERIFIED_GROUP_ID
# Optional: persistent directory writable by the backend OS user.
# CATV_WHATSAPP_AUTH_PATH=/var/lib/tcv/whatsapp
# Optional: installed browser executable (Windows example below).
# CATV_WHATSAPP_CHROME_PATH=C:/Program Files/Google/Chrome/Application/chrome.exe
```

7. Restart the backend using the same OS user, session path and environment as setup. Run one enabled WhatsApp worker instance; other backend instances should leave it disabled. Run Chrome as a non-root OS user with its sandbox enabled.
8. Once logs show `CATV WhatsApp linked and ready`, register a new CATV complaint and check TCV Support. This step sends a real message containing customer information to all group members.

## Delivery behavior

### Admin manual send

Deploy the updated `backend/routes/cableTvRouter.js` and `backend/services/catvWhatsAppNotifications.js`, restart the backend, and deploy a new frontend build (`npm run build:tcverp` for `/tcverp/` hosting).

Administrators see **Send WhatsApp** in the complaints Action column for CATV complaints. Clicking it immediately attempts to send that complaint to the configured group using the existing linked session, independently of the polling schedule. The API requires an authenticated ADMIN role. It reports busy, disconnected, unavailable, or unconfirmed delivery instead of reporting a successful send. Keep notifications enabled and run one enabled worker process as before.

Already sent complaints are not resent. `SENDING` and `REVIEW` deliveries remain blocked pending review. Explicit manual sends may include a complaint from before initial activation; automatic delivery still excludes historical complaints. Done links and delivery claims follow the existing rules. A disconnected session must be reconnected by restarting the backend or relinking the device; the button cannot send through an offline session.

After deployment, verify the action is visible for an admin and hidden for staff. For a queued CATV complaint, click once and check both the success message and the configured WhatsApp group; click again to verify it reports already sent. A live test sends real complaint information to that group.

- Checks every five seconds for committed CATV complaints; NET, CCTV and anonymous complaints are excluded. Registration, permissions and existing email notifications are unchanged.
- First activation records the highest existing complaint ID so old complaints are not broadcast. Wait for startup to complete before the first trial registration. The boundary persists across restarts.
- MySQL tables `catv_whatsapp_state` and `catv_whatsapp_delivery` are created when enabled. The backend DB user needs CREATE privileges. Startup failure is logged and does not block complaint registration.
- Disconnected sessions leave complaints queued. Restart the backend to reconnect; relink if WhatsApp has removed the linked device. After reconnecting, queued complaints are sent, including complaints whose current status has changed.
- A successful send records WhatsApp's message ID; this confirms submission, not that all employees read it.
- Ambiguous failures become `REVIEW`. A process stopping during a send can leave `SENDING`. Neither is automatically resent because it may already have reached the group. Inspect the group and delivery row, then requeue only the exact complaint and group if it was not delivered. Do not bulk reset delivery statuses.
- Set `CATV_WHATSAPP_ENABLED=false` and restart to stop notifications. Re-enabling the same group resumes unsent complaints since initial activation. Configuring a new group starts a fresh boundary.
- The browser session can contain account/message data. Keep `.wwebjs_auth` private and persistent; it and browser caches are excluded from Git. Link a dedicated number and restrict group membership to intended staff.

This unofficial integration can disconnect or be restricted by WhatsApp. No QR pairing, production deployment or live message delivery is implied by the code installation.

Dependency verification: existing application dependency versions were preserved. `npm audit` reported advisories in the installed tree, including transitive dependencies of whatsapp-web.js. No forced downgrades or unrelated application dependency upgrades were applied; review these advisories before production rollout.

Reference: https://wwebjs.dev/guide/creating-your-bot/authentication.html
