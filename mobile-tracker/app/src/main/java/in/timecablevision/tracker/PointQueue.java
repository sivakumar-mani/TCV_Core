package in.timecablevision.tracker;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import org.json.JSONArray;
import org.json.JSONObject;

final class PointQueue extends SQLiteOpenHelper {
    PointQueue(Context c) { super(c, "tracker_queue.db", null, 1); }
    public void onCreate(SQLiteDatabase db) { db.execSQL("CREATE TABLE points (id TEXT PRIMARY KEY, session TEXT NOT NULL, payload TEXT NOT NULL)"); }
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) { }
    synchronized void add(String session, JSONObject point) throws Exception {
        getWritableDatabase().execSQL("INSERT OR IGNORE INTO points VALUES (?, ?, ?)", new Object[]{point.getString("point_id"), session, point.toString()});
        // Bound local storage to roughly seven days at one point per minute.
        getWritableDatabase().execSQL("DELETE FROM points WHERE rowid NOT IN (SELECT rowid FROM points ORDER BY rowid DESC LIMIT 10080)");
    }
    synchronized JSONArray batch(String session) throws Exception {
        JSONArray result = new JSONArray();
        try (Cursor cursor = getReadableDatabase().rawQuery("SELECT payload FROM points WHERE session = ? ORDER BY rowid LIMIT 100", new String[]{session})) {
            while (cursor.moveToNext()) result.put(new JSONObject(cursor.getString(0)));
        }
        return result;
    }
    synchronized void acknowledge(JSONArray points) throws Exception {
        for (int i = 0; i < points.length(); i++) getWritableDatabase().delete("points", "id = ?", new String[]{points.getJSONObject(i).getString("point_id")});
    }
    synchronized void clear() { getWritableDatabase().delete("points", null, null); }
    synchronized void retainSession(String session) { getWritableDatabase().delete("points", "session <> ?", new String[]{session}); }
}
