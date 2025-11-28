const express = require('express');
const router = express.Router();
const { markAttendance } = require('../controllers/attendanceController');

router.post('/', (req, res, next) => {
  try {
    const body = req.body || {};
    let { sessionId, studentId, name, qrPayload, deviceId } = body;

    if (!studentId && body.student) studentId = body.student;

    if (!sessionId && qrPayload) {
      if (typeof qrPayload === 'object') {
        sessionId = qrPayload.sessionId || qrPayload.id || qrPayload._id;
        if (!name && qrPayload.name) name = qrPayload.name;
        if (!deviceId && qrPayload.deviceId) deviceId = qrPayload.deviceId;
      } else if (typeof qrPayload === 'string') {
        try {
          const parsed = JSON.parse(qrPayload.trim());
          sessionId = parsed.sessionId || parsed.id || parsed._id;
          if (!name && parsed.name) name = parsed.name;
          if (!deviceId && parsed.deviceId) deviceId = parsed.deviceId;
        } catch (e) {}
      }
    }

    if (!sessionId && body.session) sessionId = body.session;

    if (!sessionId || !studentId || !name || !deviceId) {
      return res.status(400).json({ error: 'sessionId, studentId, name veya deviceId eksik' });
    }

    req.body = { sessionId, studentId, name, deviceId, qrPayload: body.qrPayload };
    return next();
  } catch (err) {
    console.error('attend route normalize error:', err);
    return res.status(500).json({ error: 'Sunucu hatası (attend route).' });
  }
}, markAttendance);

module.exports = router;
