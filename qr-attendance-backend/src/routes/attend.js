// src/routes/attend.js
const express = require('express');
const router = express.Router();
const { markAttendance } = require('../controllers/attendController');

/**
 * Normalize middleware:
 * Body farklı formatta gelirse (qrPayload içeren string/obj) sessionId/name/studentId çıkarılır.
 */
router.post('/', (req, res, next) => {
  try {
    const body = req.body || {};
    let { sessionId, studentId, name, qrPayload } = body;

    if (!studentId && body.student) studentId = body.student;

    if (!sessionId && qrPayload) {
      if (typeof qrPayload === 'object') {
        sessionId = qrPayload.sessionId || qrPayload.id || qrPayload._id;
        if (!name && qrPayload.name) name = qrPayload.name;
      } else if (typeof qrPayload === 'string') {
        const s = qrPayload.trim();
        if (s.startsWith('{') && s.endsWith('}')) {
          try {
            const parsed = JSON.parse(s);
            sessionId = parsed.sessionId || parsed.id || parsed._id;
            if (!name && parsed.name) name = parsed.name;
          } catch (e) {}
        } else if (s.includes('payload=')) {
          try {
            const url = new URL(s);
            const p = url.searchParams.get('payload');
            if (p) {
              const parsed = JSON.parse(decodeURIComponent(p));
              sessionId = parsed.sessionId || parsed.id || parsed._id;
              if (!name && parsed.name) name = parsed.name;
            }
          } catch (e) {}
        } else {
          sessionId = s;
        }
      }
    }

    if (!sessionId && body.session) sessionId = body.session;

    if (!sessionId || !studentId || !name) {
      return res.status(400).json({ error: 'sessionId, studentId veya name eksik' });
    }

    req.body = { sessionId, studentId, name, qrPayload: body.qrPayload };
    return next();
  } catch (err) {
    console.error('attend route normalize error:', err);
    return res.status(500).json({ error: 'Sunucu hatası (attend route).' });
  }
}, markAttendance);

module.exports = router;
