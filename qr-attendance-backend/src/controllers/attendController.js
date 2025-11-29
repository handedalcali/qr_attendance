const Attendance = require('../models/Attendance');
const Session = require('../models/Session');

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

    if (!studentId || String(studentId).trim() === "")
      return res.status(400).json({ error: 'Öğrenci kimliği zorunludur.' });
    studentId = String(studentId).trim();

    if (!name || String(name).trim() === "")
      return res.status(400).json({ error: 'Öğrenci adı (name) zorunludur.' });
    const studentName = String(name).trim();

    let sessionId = sessionIdFromBody;

    // QR payload varsa sadece sessionId çek
    if (qrPayload) {
      const parsed = tryParseJson(qrPayload);
      if (parsed && parsed.sessionId) sessionId = String(parsed.sessionId).trim();
    }

    if (!sessionId)
      return res.status(400).json({ error: 'Eksik veri: Oturum kimliği eksik.' });

    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session bulunamadı' });
    if (session.expiresAt && Date.now() > new Date(session.expiresAt).getTime())
      return res.status(400).json({ error: 'Oturum süresi dolmuş veya geçersiz.' });

    // Aynı cihazdan başka öğrencinin yoklama kaydı var mı kontrol
    // const deviceUsed = await Attendance.findOne({ sessionId, 'meta.deviceId': deviceId });
    // if (deviceUsed && deviceUsed.studentId !== studentId) {
      // return res.status(403).json({ error: 'Bu cihazdan birden fazla kişi giriş yapamaz.' });
    // }

    // Öğrenci daha önce yoklama yaptıysa güncelle
    const existing = await Attendance.findOne({ sessionId, studentId });
    if (existing) {
      existing.timestamp = new Date();
      existing.studentName = studentName;
      existing.meta = { ...existing.meta, deviceId, ip: req.ip, ua: req.get('User-Agent') };
      await existing.save();
      return res.json({ ok: true, message: 'Yoklama başarıyla güncellendi.', qrPayload });
    }

    // Yoklamayı kaydet
    await Attendance.create({
      sessionId,
      studentId,
      studentName,
      meta: { deviceId, ip: req.ip, ua: req.get('User-Agent') },
    });

    // Session içindeki öğrencileri güncelle
    if (!Array.isArray(session.students)) session.students = [];
    const alreadyInSession = session.students.some(s => String(s.id) === studentId);
    if (!alreadyInSession) {
      session.students.push({ id: studentId, name: studentName, timestamp: new Date(), deviceId });
      await session.save();
    }

    return res.json({ ok: true, message: 'Yoklama başarıyla kaydedildi :)', qrPayload });

  } catch (err) {
    console.error('markAttendance top-level error:', err);
    return res.status(500).json({ error: 'Sunucu hatası.' });
  }
};
