// src/routes/attend.js
const express = require('express');
const router = express.Router();
const { markAttendance } = require('../controllers/attendController');

/**
 * Bu middleware POST /api/attend istek gövdesini normalize eder.
 * Amaç: frontend farklı formatlarda (sessionId doğrudan, qrPayload içinde, veya qrPayload string)
 * gönderse bile controller'a her zaman { sessionId, studentId, name } olarak iletmektir.
 */
router.post('/', (req, res, next) => {
  try {
    const body = req.body || {};
    let { sessionId, studentId, name, qrPayload } = body;

    // Eğer öğrenci kimliği root body içinde değilse alt alanları kontrol et (esnek)
    if (!studentId && body.student) studentId = body.student;

    // Eğer sessionId yoksa qrPayload içinden çıkarmaya çalış
    if (!sessionId && qrPayload) {
      if (typeof qrPayload === 'object') {
        sessionId = qrPayload.sessionId || qrPayload.id || qrPayload._id;
        if (!name && qrPayload.name) name = qrPayload.name; // name varsa al
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

    // Son kontroller
    if (!sessionId || !studentId || !name) {
      return res.status(400).json({ error: 'sessionId, studentId veya name eksik' });
    }

    req.body = { sessionId, studentId, name };
    return next();
  } catch (err) {
    console.error('attend route normalize error:', err);
    return res.status(500).json({ error: 'Sunucu hatası (attend route).' });
  }
}, markAttendance);

module.exports = router;
