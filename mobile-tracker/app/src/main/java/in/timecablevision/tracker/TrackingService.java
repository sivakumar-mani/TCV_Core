package in.timecablevision.tracker;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.location.*;
import android.net.*;
import android.os.*;
import org.json.*;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.*;

public final class TrackingService extends Service implements LocationListener {
    private LocationManager locations;
    private PointQueue queue;
    private ScheduledExecutorService worker;
    private volatile String base, token, session;
    private long lastPoint = 0;
    private volatile boolean stopped = false;
    @Override public void onCreate() {
        super.onCreate();
        queue = new PointQueue(this);
        locations = (LocationManager) getSystemService(LOCATION_SERVICE);
        NotificationManager nm = getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel("duty", "Work location tracking", NotificationManager.IMPORTANCE_LOW));
    }
    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) { stopSelf(); return START_NOT_STICKY; }
        String nextSession = intent.getStringExtra("session");
        if (session != null && !session.equals(nextSession)) { stopSelf(); return START_NOT_STICKY; }
        base = intent.getStringExtra("base"); token = intent.getStringExtra("token"); session = nextSession;
        if (base == null || token == null || session == null) { stopSelf(); return START_NOT_STICKY; }
        notification("Your work location is being recorded", true);
        if (worker != null) return START_NOT_STICKY;
        queue.retainSession(session); // Preserve this duty's offline buffer; discard other duty sessions.
        worker = Executors.newSingleThreadScheduledExecutor();
        try {
            if (locations.getAllProviders().contains(LocationManager.GPS_PROVIDER)) locations.requestLocationUpdates(LocationManager.GPS_PROVIDER, 60000, 0, this);
            if (locations.getAllProviders().contains(LocationManager.NETWORK_PROVIDER)) locations.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 60000, 0, this);
            if (!locations.isProviderEnabled(LocationManager.GPS_PROVIDER)) notification("GPS disabled. Enable location to track duty.", true);
            worker.scheduleWithFixedDelay(this::upload, 5, 60, TimeUnit.SECONDS);
        } catch (SecurityException e) { notification("Location permission missing. Open the app.", false); stopSelf(); }
        return START_NOT_STICKY;
    }
    private void notification(String text, boolean foreground) {
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent pending = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification n = new Notification.Builder(this, "duty").setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle("TCV Employee Tracker").setContentText(text).setContentIntent(pending).setOngoing(foreground).build();
        if (foreground) {
            if (Build.VERSION.SDK_INT >= 29) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION); else startForeground(1, n);
        } else getSystemService(NotificationManager.class).notify(2, n);
    }
    @Override public void onLocationChanged(Location location) {
        if (stopped || SystemClock.elapsedRealtime() - lastPoint < 60000) return;
        lastPoint = SystemClock.elapsedRealtime();
        try {
            Intent battery = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            int level = battery == null ? -1 : battery.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = battery == null ? -1 : battery.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
            JSONObject point = new JSONObject().put("point_id", UUID.randomUUID().toString()).put("latitude", location.getLatitude())
                .put("longitude", location.getLongitude()).put("accuracy", location.getAccuracy())
                .put("recorded_at", Instant.ofEpochMilli(location.getTime()).toString()).put("network_type", network());
            if (location.hasSpeed()) point.put("speed", location.getSpeed());
            if (level >= 0 && scale > 0) point.put("battery_level", Math.min(100, level * 100.0 / scale));
            queue.add(session, point);
        } catch (Exception e) { notification("Location could not be buffered. Open the app.", false); }
    }
    private String network() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        NetworkCapabilities c = cm.getNetworkCapabilities(cm.getActiveNetwork());
        return c == null ? "OFFLINE" : c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ? "WIFI" : c.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ? "CELLULAR" : "OTHER";
    }
    private void upload() {
        if (stopped) return;
        try {
            TrackerApi.Response state = TrackerApi.request(base, "/me", token, null);
            if (stopped) return;
            if (state.status == 401 || state.status == 403) { notification("Sign in again to resume tracking", false); stopSelf(); return; }
            if (state.status != 200) return;
            JSONObject active = state.body.optJSONObject("session");
            if (active == null || !session.equals(String.valueOf(active.optLong("session_id")))) { stopSelf(); return; }
            JSONArray points = queue.batch(session);
            if (points.length() == 0 || stopped) return;
            TrackerApi.Response result = TrackerApi.request(base, "/locations", token, new JSONObject().put("session_id", session).put("points", points));
            if (stopped) return;
            if (result.status >= 200 && result.status < 300) { queue.acknowledge(points); notification("Work location synced", true); }
            else if (result.status == 401 || result.status == 403 || result.status == 409) { notification("Tracking paused. Open the app to resume.", false); stopSelf(); }
            else if (result.status == 400) { queue.acknowledge(points); notification("Invalid or expired location buffer discarded", false); }
        } catch (Exception e) { if (!stopped) notification("Offline: duty locations buffered on this phone", true); }
    }
    @Override public void onDestroy() {
        stopped = true;
        if (locations != null) locations.removeUpdates(this);
        if (worker != null) worker.shutdownNow();
        stopForeground(STOP_FOREGROUND_REMOVE);
        // Queue remains private; it is cleared before another duty collection starts.
        super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onProviderDisabled(String provider) { notification("Location provider disabled. Check phone location settings.", true); }
    @Override public void onProviderEnabled(String provider) { }
    @Override public void onStatusChanged(String provider, int status, Bundle extras) { }
}
