const express = require('express');
const auth = require('../services/authendication');
const { point, positiveId, dayRange, fail } = require('./validation');

// Injected database keeps focused tests independent of production connections.
function createTrackerRouter(connection) {
  const router = express.Router();
  router.use(auth.authendicateToken);
  router.use(async (req, res, next) => {
    try {
      const [users] = await connection.promise().query('SELECT user_id, employee_id, role, is_active FROM users WHERE user_id = ?', [res.locals.userId]);
      if (!users.length || !users[0].is_active) return res.status(403).json({ message: 'An active account is required' });
      req.trackerUser = users[0];
      // Tracker authorization uses the current persisted role without changing shared middleware.
      res.locals.role = users[0].role;
      next();
    } catch (_) { res.status(503).json({ message: 'Tracker account lookup unavailable' }); }
  });
  const wrap = handler => async (req, res) => {
    try { await handler(req, res, connection.promise()); }
    catch (error) { res.status(error.status || (error.code === 'ER_DUP_ENTRY' ? 409 : 503)).json({ message: error.status ? error.message : error.code === 'ER_DUP_ENTRY' ? 'Duty is already active' : 'Tracker unavailable; check database migration and retry' }); }
  };
  const self = req => {
    if (!req.trackerUser.employee_id) { const error = new Error('Account must be linked to an employee'); error.status = 403; throw error; }
    return positiveId(req.trackerUser.employee_id);
  };
  const permission = key => auth.requirePermissionAction(key, 'can_view');
  router.get('/me', permission('EMPLOYEE_TRACKER'), wrap(async (req, res, db) => {
    const id = self(req);
    const [sessions] = await db.query("SELECT *, DATE_FORMAT(started_at, '%Y-%m-%dT%H:%i:%s.000Z') started_at FROM tracker_sessions WHERE employee_id = ? AND ended_at IS NULL", [id]);
    res.json({ employee_id: id, session: sessions[0] || null });
  }));
  router.post('/duty/start', auth.requirePermissionAction('EMPLOYEE_TRACKER', 'can_create'), wrap(async (req, res, db) => {
    const id = self(req);
    if (req.body.consent !== true) fail('Consent is required to start duty tracking');
    const [result] = await db.query('INSERT INTO tracker_sessions (employee_id, started_at, consent_at) VALUES (?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))', [id]);
    res.status(201).json({ session_id: result.insertId });
  }));
  // Ending duty remains available after permission revocation to stop collection.
  router.post('/duty/stop', wrap(async (req, res, db) => {
    await db.query('UPDATE tracker_sessions SET ended_at = UTC_TIMESTAMP(3) WHERE employee_id = ? AND ended_at IS NULL', [self(req)]);
    res.json({ stopped: true });
  }));
  router.post('/locations', auth.requirePermissionAction('EMPLOYEE_TRACKER', 'can_create'), wrap(async (req, res, db) => {
    const id = self(req), sessionId = positiveId(req.body.session_id);
    if (!Array.isArray(req.body.points) || !req.body.points.length || req.body.points.length > 100) fail('Send 1 to 100 points');
    const points = req.body.points.map(p => point(p));
    await db.beginTransaction();
    try {
      const [sessions] = await db.query("SELECT *, DATE_FORMAT(started_at, '%Y-%m-%dT%H:%i:%s.000Z') started_at FROM tracker_sessions WHERE session_id = ? AND employee_id = ? FOR UPDATE", [sessionId, id]);
      const session = sessions[0];
      if (!session || session.ended_at) { const error = new Error('Duty session is not active'); error.status = 409; throw error; }
      const start = typeof session.started_at?.getTime === 'function' ? session.started_at.getTime() : Date.parse(String(session.started_at).replace(' ', 'T').replace(/Z$/, '') + 'Z');
      if (!Number.isFinite(start)) fail('Invalid duty start timestamp');
      if (points.some(p => p.time < start)) fail('Location predates duty');
      for (const p of points) await db.query(`INSERT INTO tracker_locations
        (session_id, employee_id, point_id, latitude, longitude, accuracy, speed, battery_level, network_type, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE point_id = point_id`,
        [sessionId, id, p.point_id, p.latitude, p.longitude, p.accuracy ?? null, p.speed ?? null, p.battery_level ?? null, p.network_type, p.recorded_at]);
      await db.commit(); res.json({ accepted: points.length });
    } catch (error) { await db.rollback(); throw error; }
  }));
  router.post('/events', auth.requirePermissionAction('EMPLOYEE_TRACKER', 'can_create'), wrap(async (req, res, db) => {
    const id = self(req), kind = req.body.kind;
    if (!['CHECK_IN', 'CHECK_OUT', 'VISIT', 'SOS'].includes(kind)) fail('Invalid event kind');
    const remarks = String(req.body.remarks || '');
    if (remarks.length > 1000) fail('Remarks exceed 1000 characters');
    const [result] = await db.query(`INSERT INTO tracker_events (session_id, employee_id, kind, remarks)
      SELECT session_id, employee_id, ?, ? FROM tracker_sessions WHERE employee_id = ? AND ended_at IS NULL`, [kind, remarks, id]);
    if (!result.affectedRows) { const error = new Error('Start duty first'); error.status = 409; throw error; }
    res.status(201).json({ event_id: result.insertId });
  }));
  router.get('/live', permission('EMPLOYEE_TRACKER_ADMIN'), wrap(async (_req, res, db) => {
    const [rows] = await db.query(`SELECT e.employee_id, e.employee_code, CONCAT_WS(' ', e.first_name, e.last_name) employee_name,
      s.session_id, s.started_at, l.latitude, l.longitude, l.accuracy, l.battery_level, l.network_type,
      DATE_FORMAT(l.recorded_at, '%Y-%m-%dT%H:%i:%s.000Z') recorded_at,
      CASE WHEN s.session_id IS NULL THEN 'OFF_DUTY' WHEN l.recorded_at IS NULL OR l.recorded_at < UTC_TIMESTAMP() - INTERVAL 5 MINUTE THEN 'STALE' ELSE 'LIVE' END tracking_status
      FROM employees e LEFT JOIN tracker_sessions s ON s.employee_id = e.employee_id AND s.ended_at IS NULL
      LEFT JOIN tracker_locations l ON l.location_id = (SELECT p.location_id FROM tracker_locations p WHERE p.employee_id = e.employee_id AND p.session_id = s.session_id ORDER BY p.recorded_at DESC, p.location_id DESC LIMIT 1)
      ORDER BY e.first_name, e.employee_id`);
    res.json(rows);
  }));
  async function history(req, res, db, own) {
    const id = own ? self(req) : positiveId(req.params.employeeId);
    const range = dayRange(req.query.date);
    const [locations] = await db.query("SELECT *, DATE_FORMAT(recorded_at, '%Y-%m-%dT%H:%i:%s.000Z') recorded_at FROM tracker_locations WHERE employee_id = ? AND recorded_at >= ? AND recorded_at < ? ORDER BY recorded_at, location_id LIMIT 10000", [id, ...range]);
    const [sessions] = await db.query("SELECT *, DATE_FORMAT(started_at, '%Y-%m-%dT%H:%i:%s.000Z') started_at, DATE_FORMAT(ended_at, '%Y-%m-%dT%H:%i:%s.000Z') ended_at FROM tracker_sessions WHERE employee_id = ? AND started_at < ? AND (ended_at IS NULL OR ended_at >= ?) ORDER BY started_at", [id, range[1], range[0]]);
    const [events] = await db.query("SELECT *, DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.000Z') created_at FROM tracker_events WHERE employee_id = ? AND created_at >= ? AND created_at < ? ORDER BY created_at LIMIT 1000", [id, ...range]);
    res.json({ locations, sessions, events });
  }
  router.get('/history', permission('EMPLOYEE_TRACKER'), wrap((req, res, db) => history(req, res, db, true)));
  router.get('/history/:employeeId', permission('EMPLOYEE_TRACKER_ADMIN'), wrap((req, res, db) => history(req, res, db, false)));
  return router;
}
module.exports = { createTrackerRouter };
