const express = require('express');
const router = express.Router();
const { markAttendance } = require('../controllers/attendController');

router.post('/', (req, res, next) => {
  try {
    const body = req.body || {};
    let { sessionId, studentId, name, qrPayload, deviceId } = body;

    // Fallback: student
    if (!studentId && body.student) studentId = body.student;

    // QR payload'dan çekme
    if (!sessionId && qrPayload) {
      if (typeof qrPayload === 'object') {
        sessionId = qrPayload.sessionId || qrPayload.id || qrPayload._id;
        if (!name && qrPayload.name) name = qrPayload.name;
        if (!deviceId && qrPayload.deviceId) deviceId = qrPayload.deviceId;
      } else if (typeof qrPayload === 'string') {
        const s = qrPayload.trim();
        if (s.startsWith('{') && s.endsWith('}')) {
          try {
            const parsed = JSON.parse(s);
            sessionId = parsed.sessionId || parsed.id || parsed._id;
            if (!name && parsed.name) name = parsed.name;
            if (!deviceId && parsed.deviceId) deviceId = parsed.deviceId;
          } catch (e) {}
        } else if (s.includes('payload=')) {
          try {
            const url = new URL(s);
            const p = url.searchParams.get('payload');
            if (p) {
              const parsed = JSON.parse(decodeURIComponent(p));
              sessionId = parsed.sessionId || parsed.id || parsed._id;
              if (!name && parsed.name) name = parsed.name;
              if (!deviceId && parsed.deviceId) deviceId = parsed.deviceId;
            }
          } catch (e) {}
        } else {
          sessionId = s;
        }
      }
    }

    if (!sessionId && body.session) sessionId = body.session;

    // Zorunlu alan kontrolü
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
