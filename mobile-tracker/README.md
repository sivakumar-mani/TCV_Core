# TCV employee mobile tracker

This is an isolated first implementation of the duty/location tracking module for the existing Angular, Express and MySQL project. It reuses existing login (including CAPTCHA), employee-linked accounts and role permission administration. It does not replace employee attendance, salary, work orders, customer records, approvals or payment workflows.

## Included

- Employee route `/tracker`: explicit consent, Start Duty / End Duty, browser location preview, check-in/check-out, visit remarks, SOS record, date-based duty/event/location history and route CSV.
- Office route `/tracker-admin`: employee list, LIVE / STALE / OFF_DUTY status, last known **current duty** location, selected employee OpenStreetMap, battery/network status, duty sessions and route/event history. Polling is every 30 seconds; no WebSocket dependency.
- Native Android project: existing Angular login and tracker UI hosted in a WebView; native location foreground service continues while minimized or screen locked, with an ongoing notification. GPS collection is approximately once per minute. SQLite buffers offline points and retries in batches of 100 during the same active duty. API tokens stay in service memory, and are not written into native preferences or logs.
- Separate `tracker_sessions`, `tracker_locations`, `tracker_events` tables. UTC timestamps; one active duty per employee; idempotent location IDs; account/permission enforcement; session ownership; bounded payloads/history queries.

## Database and access setup

1. Back up the intended database and review `../backend/migrations/create_employee_tracker.sql`, then apply it manually. No migration or database changes were performed by this implementation.
2. Restart the existing backend and deploy the updated Angular build using the existing deployment process. Tracker routes are `/api/tracker/*` and `/api/v1/tracker/*`.
3. In existing Role Permissions, grant **EMPLOYEE_TRACKER** View + Create to roles whose employees may track duty. Grant **EMPLOYEE_TRACKER_ADMIN** View only to roles allowed to see employees' locations. No existing role grants are automatically expanded; administrators retain their existing admin access.
4. Ensure each employee login has the correct existing `users.employee_id` link and is active. An unlinked account cannot start duty. Tracker middleware resolves the current persisted account/role instead of trusting submitted employee IDs.
5. Use HTTPS. The Android portal and API must share an origin, for example `https://timecablevision.in/tcverp/` and `https://timecablevision.in/api`. An existing Nginx reverse proxy can route `/api/` to Express. No additional GPS subscription, map API key or tracking daemon is required by this implementation.

## Build the Android APK

Java, Gradle and an Android SDK are not installed in the implementation environment, so **no APK has been generated or tested**.

Open this directory in Android Studio. Install JDK 17, Android SDK 35 and Gradle 8.11.1 (compatible with Android Gradle Plugin 8.9.2). Let Studio import the Gradle project, configure the SDK location and generate a Gradle wrapper if needed. No wrapper JAR is committed. Use **Build → Build APK(s)** for a debug APK; use **Generate Signed Bundle / APK** and a company-managed signing key for internal release distribution. Do not commit signing keys or passwords.

With an installed compatible Gradle:

```powershell
gradle :app:assembleDebug
```

Output: `app/build/outputs/apk/debug/app-debug.apk`. Install on a test phone, enter the company HTTPS portal URL, accept the work-location disclosure and permissions, sign in with the normal CAPTCHA, and navigate to **Employee Tracking → My Mobile Tracker**.

The WebView bridge uses AndroidX `addWebMessageListener` with a trusted origin and main-frame check. External map frames cannot control the native service. Older Android System WebView versions that lack this feature must be updated.

## API

| Method | `/api/tracker` path | Purpose |
| --- | --- | --- |
| GET | `/me` | Own active session |
| POST | `/duty/start` | Start own duty, `{ "consent": true }` |
| POST | `/duty/stop` | Stop own duty; available even after tracker permission revocation |
| POST | `/locations` | `{ "session_id": 123, "points": [...] }`, maximum 100 points |
| POST | `/events` | `{ "kind": "VISIT", "remarks": "Customer visit" }` |
| GET | `/history?date=2026-10-09` | Own duty, events, route for UTC date |
| GET | `/live` | Office employee live status |
| GET | `/history/:employeeId?date=2026-10-09` | Authorized office history |

All require the existing bearer token. An example point:

```json
{
  "point_id": "device-generated-unique-id",
  "latitude": 13.0827,
  "longitude": 80.2707,
  "accuracy": 12,
  "speed": 0,
  "battery_level": 85,
  "network_type": "WIFI",
  "recorded_at": "2026-10-09T03:30:00.000Z"
}
```

## Verification and limits

Focused API tests use an injected database and fake authentication grants; they do not connect to production. They cover ownership, current account identity, consent, inactive/unlinked accounts, separate office access, invalid inputs, closed/missing sessions, transactions, timestamp boundaries and own-duty stop after permission revocation. Existing Internet connection tests are the adjacent regression checks. Angular production build is the UI/compiler check.

Before rollout, test the migration on a staging MySQL database, then test on a physical phone: start/end duty; minimize; lock the screen for ten minutes; disable/re-enable GPS; go offline and reconnect **before ending duty**; retry uploads; revoke permissions; expire the eight-hour login token; deny location/notification permissions; compare UTC date history and CSV with the map; verify another employee cannot read or submit another employee's route. MySQL integration, device battery behavior, APK compilation and VPS deployment remain unverified.

Known boundaries:

- Android process kill, force-stop, reboot and vendor battery restrictions are not automatically recovered. Reopen the app and use Resume location collection for an active duty. The app deliberately does not start itself at boot or silently restart duty.
- Login tokens expire after eight hours under the existing login policy. Native tracking pauses and asks the employee to sign in again; Resume then continues the same active session.
- Offline buffering works within an active duty. Once duty ends, the API rejects further points for that session, so buffered points must sync before End Duty. Buffers from previous duty sessions are discarded on a new session. Ending duty offline stops device collection but requires retrying End Duty online to close the server session.
- Approximate location permission reduces accuracy. GPS intervals are requests, not delivery guarantees. GPS off, phone off and service termination interrupt collection. Browser mode is a foreground preview and has no durable offline queue.
- Map view shows a selected employee or selected route point. Full multi-marker maps, drawn route polylines and WebSockets are not included. Map loading requires access to the OpenStreetMap embed endpoint and its service policies.
- Check-ins and duty sessions are tracker records; they do not alter HR payroll attendance. Visits are remarks, not a new customer master. SOS is stored for office history, not push delivery or an emergency dispatch service.
- The attachment's broader task assignment, geofence rules/events, photo/document upload, productivity reports, scheduled working hours, device registration, retention jobs and push notifications are not included in this tracking module. Existing business modules are preserved; these require separate integration work.

Android implementation references: [foreground location requirements](https://developer.android.com/develop/sensors-and-location/location/permissions), [foreground service restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start), [origin-scoped native bridge](https://developer.android.com/develop/ui/views/layout/webapps/native-api-access-jsbridge).
