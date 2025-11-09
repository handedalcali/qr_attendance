const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const { verify } = require('../utils/security');

function tryParseJson(s) {
  try {
    if (typeof s === 'object' && s !== null) return s;
    if (typeof s === 'string') {
      const decodedString = decodeURIComponent(s.trim());
      return JSON.parse(decodedString);
    }
    return null;
  } catch (e) {
    return null;
  }
}

exports.markAttendance = async (req, res) => {
  try {
    let { qrPayload, sessionId: sessionIdFromBody, studentId, name } = req.body;

    if (studentId != null) studentId = String(studentId).trim();
    if (!name || String(name).trim() === "")
      return res.status(400).json({ error: 'Öğrenci adı (name) zorunludur.' });
    const studentName = String(name).trim();

    let sessionId = sessionIdFromBody;

    if (qrPayload) {
      const parsed = tryParseJson(qrPayload);
      if (!parsed || !parsed.sessionId || !parsed.expiresAt || !parsed.sig)
        return res.status(400).json({ error: 'QR kod geçersiz.' });

      if (!sessionId) sessionId = String(parsed.sessionId).trim();
      const payload = `${sessionId}|${parsed.expiresAt}`;
      if (!verify(payload, parsed.sig)) return res.status(400).json({ error: 'QR kod imza hatası.' });
      if (Date.now() > Number(parsed.expiresAt)) return res.status(400).json({ error: 'Oturum süresi dolmuş.' });
    }

    if (!sessionId || !studentId)
      return res.status(400).json({ error: 'Eksik veri: Oturum kimliği veya öğrenci kimliği eksik.' });

    sessionId = String(sessionId).trim();
    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session bulunamadı' });
    if (session.expiresAt && Date.now() > new Date(session.expiresAt).getTime())
      return res.status(400).json({ error: 'Oturum süresi dolmuş veya geçersiz.' });

    if (!Array.isArray(session.students)) session.students = [];

    try {
      await Attendance.create({
        sessionId,
        studentId,
        studentName,
        meta: { ip: req.ip, ua: req.get('User-Agent') },
      });

      const alreadyInSession = session.students.some(s => String(s.id) === String(studentId));
      if (!alreadyInSession) {
        session.students.push({ id: studentId, name: studentName, timestamp: new Date() });
        await session.save();
      } else {
        const idx = session.students.findIndex(s => String(s.id) === String(studentId));
        if (idx > -1) {
          session.students[idx].name = studentName;
          session.students[idx].timestamp = new Date();
          await session.save();
        }
      }

      return res.json({ ok: true, message: 'Yoklama başarıyla kaydedildi :)' });
    } catch (err) {
      if (err && err.code === 11000) {
        const alreadyInSession = session.students.some(s => s.id === studentId);
        if (!alreadyInSession) {
          session.students.push({ id: studentId, name: studentName, timestamp: new Date() });
          await session.save();
        }
        return res.status(409).json({ error: 'Bu öğrenci için zaten yoklama alınmış :)' });
      }
      console.error('Attendance.create error', err);
      return res.status(500).json({ error: 'Sunucu hatası.' });
    }
  } catch (err) {
    console.error('markAttendance top-level error:', err);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
};
