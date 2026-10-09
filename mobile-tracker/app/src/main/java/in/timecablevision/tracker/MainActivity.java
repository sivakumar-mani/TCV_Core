package in.timecablevision.tracker;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import java.util.Collections;
import org.json.JSONObject;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.*;

public final class MainActivity extends Activity {
    private WebView web;
    private String portal;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setPadding(24, 24, 24, 24);
        TextView text = new TextView(this);
        text.setText("TCV Employee Tracker\n\nDuring duty, your GPS location is sent to your office, including when this app is minimized or the screen is locked. A visible notification shows tracking status. End Duty stops collection.\n\nSign in using your existing employee account, then open Employee Tracking → My Mobile Tracker.\n\nEnter your company portal HTTPS URL:");
        EditText url = new EditText(this); url.setSingleLine(true);
        url.setText(getPreferences(0).getString("portal", "https://timecablevision.in/tcverp/"));
        Button open = new Button(this); open.setText("Continue and allow work location");
        root.addView(text); root.addView(url); root.addView(open); setContentView(root);
        open.setOnClickListener(v -> {
            portal = url.getText().toString().trim();
            Uri uri = Uri.parse(portal);
            if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null) { toast("Enter a valid HTTPS portal URL"); return; }
            if (!portal.endsWith("/")) portal += "/";
            getPreferences(0).edit().putString("portal", portal).apply();
            if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, 1);
            } else openPortal();
        });
    }
    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] grants) {
        super.onRequestPermissionsResult(code, permissions, grants);
        if (code == 1) {
            if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) openPortal();
            else toast("Location permission is needed for duty tracking");
        }
    }
    private void openPortal() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 2);
        web = new WebView(this); web.getSettings().setJavaScriptEnabled(true); web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false); web.getSettings().setAllowContentAccess(false);
        web.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) { toast("Update Android System WebView to use the tracker"); return; }
        String origin = Uri.parse(portal).buildUpon().path("").build().toString();
        WebViewCompat.addWebMessageListener(web, "NativeTracker", Collections.singleton(origin), (view, message, sourceOrigin, mainFrame, reply) -> {
            if (!mainFrame || !sameOrigin(sourceOrigin, Uri.parse(portal))) return;
            try {
                JSONObject data = new JSONObject(message.getData());
                Bridge bridge = new Bridge();
                if ("start".equals(data.optString("action"))) bridge.startTracking(data.getString("base"), data.getString("token"), data.getString("session"));
                if ("stop".equals(data.optString("action"))) bridge.stopTracking();
            } catch (Exception e) { toast("Invalid tracker request"); }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                if (!request.isForMainFrame()) return !"https".equals(request.getUrl().getScheme());
                return !sameOrigin(request.getUrl(), Uri.parse(portal));
            }
        });
        setContentView(web); web.loadUrl(portal);
    }
    static boolean sameOrigin(Uri a, Uri b) { return "https".equals(a.getScheme()) && a.getHost() != null && a.getHost().equalsIgnoreCase(b.getHost()) && a.getPort() == b.getPort(); }
    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }
    private final class Bridge {
        public void startTracking(String base, String token, String session) {
            runOnUiThread(() -> {
                if (!sameOrigin(Uri.parse(base), Uri.parse(portal)) || token.isEmpty() || !session.matches("[1-9][0-9]*")) { toast("Tracker API must use the trusted portal origin"); return; }
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED && checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) { toast("Allow location permission and retry"); return; }
                Intent intent = new Intent(MainActivity.this, TrackingService.class);
                intent.putExtra("base", base); intent.putExtra("token", token); intent.putExtra("session", session);
                try { startForegroundService(intent); } catch (Exception e) { toast("Unable to start tracking. Keep the app visible and retry."); }
            });
        }
        public void stopTracking() { runOnUiThread(() -> stopService(new Intent(MainActivity.this, TrackingService.class))); }
    }
    @Override public void onBackPressed() { if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed(); }
}
