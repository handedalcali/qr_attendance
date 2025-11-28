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
    let { qrPayload, sessionId: sessionIdFromBody, studentId, name, deviceId } = req.body;

    if (!deviceId || String(deviceId).trim() === "")
      return res.status(400).json({ error: 'deviceId zorunludur.' });
    deviceId = String(deviceId).trim();

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
      if (!verify(payload, parsed.sig))
        return res.status(400).json({ error: 'QR kod imza hatası.' });

      const now = Date.now();
      if (now > Number(parsed.expiresAt)) {
        return res.status(400).json({ error: 'Oturum süresi dolmuş. Lütfen öğretmene danışın.' });
      }

      if (!parsed.attendance) parsed.attendance = [];
      parsed.attendance.push({ studentId, name: studentName, deviceId, timestamp: new Date().getTime() });
      qrPayload = parsed;
    }

    if (!sessionId || !studentId)
      return res.status(400).json({ error: 'Eksik veri: Oturum kimliği veya öğrenci kimliği eksik.' });

    sessionId = String(sessionId).trim();
    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session bulunamadı' });
    if (session.expiresAt && Date.now() > new Date(session.expiresAt).getTime())
      return res.status(400).json({ error: 'Oturum süresi dolmuş veya geçersiz.' });

    if (!Array.isArray(session.students)) session.students = [];

    const existing = await Attendance.findOne({ sessionId, studentId });
    if (existing) {
      if (existing.meta?.deviceId && existing.meta.deviceId !== deviceId) {
        return res.status(409).json({ error: 'Bu öğrenci zaten başka cihazdan yoklama aldı.' });
      }
      existing.timestamp = new Date();
      existing.studentName = studentName;
      existing.meta = { ...existing.meta, deviceId, ip: req.ip, ua: req.get('User-Agent') };
      await existing.save();
      return res.json({ ok: true, message: 'Yoklama başarıyla güncellendi (aynı cihaz).', qrPayload });
    }

    await Attendance.create({
      sessionId,
      studentId,
      studentName,
      meta: { deviceId, ip: req.ip, ua: req.get('User-Agent') },
    });

    const alreadyInSession = session.students.some(s => String(s.id) === studentId);
    if (!alreadyInSession) {
      session.students.push({ id: studentId, name: studentName, timestamp: new Date(), deviceId });
      await session.save();
    } else {
      const idx = session.students.findIndex(s => String(s.id) === studentId);
      if (idx > -1) {
        session.students[idx].name = studentName;
        session.students[idx].timestamp = new Date();
        session.students[idx].deviceId = deviceId;
        await session.save();
      }
    }

    return res.json({ ok: true, message: 'Yoklama başarıyla kaydedildi :)', qrPayload });

  } catch (err) {
    console.error('markAttendance top-level error:', err);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
};
