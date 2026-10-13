const fail = message => { const error = new Error(message); error.status = 400; throw error; };
function point(value, now = Date.now()) {
  for (const [key, min, max] of [['latitude', -90, 90], ['longitude', -180, 180], ['accuracy', 0, 100000], ['battery_level', 0, 100], ['speed', 0, 1000]]) {
    const v = value[key];
    if ((key === 'latitude' || key === 'longitude') && v == null) fail(`${key} is required`);
    if (v != null && (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max)) fail(`Invalid ${key}`);
  }
  const time = Date.parse(value.recorded_at);
  if (!Number.isFinite(time) || time > now + 120000 || time < now - 7 * 86400000) fail('Location timestamp must be within the last seven days');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(value.point_id || '')) fail('A unique point_id is required');
  return { ...value, time, recorded_at: new Date(time).toISOString().slice(0, 23).replace('T', ' '), network_type: String(value.network_type || 'UNKNOWN').slice(0, 32) };
}
function positiveId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) fail('Invalid ID');
  return id;
}
function dayRange(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail('A valid UTC date is required');
  return [value + ' 00:00:00', new Date(Date.parse(value) + 86400000).toISOString().slice(0, 10) + ' 00:00:00'];
}
module.exports = { point, positiveId, dayRange, fail };
