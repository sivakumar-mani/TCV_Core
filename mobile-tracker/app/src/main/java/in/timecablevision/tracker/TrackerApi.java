package in.timecablevision.tracker;

import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

final class TrackerApi {
    static final class Response {
        final int status; final JSONObject body;
        Response(int status, JSONObject body) { this.status = status; this.body = body; }
    }
    static Response request(String base, String path, String token, JSONObject data) throws Exception {
        URL url = new URL(base + "/tracker" + path);
        if (!"https".equals(url.getProtocol())) throw new IllegalArgumentException("HTTPS is required");
        HttpURLConnection c = (HttpURLConnection) url.openConnection();
        c.setConnectTimeout(15000); c.setReadTimeout(15000); c.setInstanceFollowRedirects(false);
        c.setRequestProperty("Authorization", "Bearer " + token);
        c.setRequestProperty("Content-Type", "application/json");
        try {
            if (data != null) {
                c.setRequestMethod("POST"); c.setDoOutput(true);
                try (java.io.OutputStream out = c.getOutputStream()) { out.write(data.toString().getBytes(StandardCharsets.UTF_8)); }
            }
            int status = c.getResponseCode();
            java.io.InputStream stream = status < 400 ? c.getInputStream() : c.getErrorStream();
            String body = "{}";
            if (stream != null) try (java.io.InputStream in = stream; java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream()) {
                byte[] buffer = new byte[4096]; int count;
                while ((count = in.read(buffer)) != -1) bytes.write(buffer, 0, count);
                body = new String(bytes.toByteArray(), StandardCharsets.UTF_8);
            }
            return new Response(status, new JSONObject(body));
        } finally { c.disconnect(); }
    }
}
