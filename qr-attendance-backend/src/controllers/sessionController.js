// src/controllers/sessionController.js
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const crypto = require('crypto');
const { sign } = require('../utils/security');

function genSessionId() {
  return crypto.randomBytes(6).toString('hex');
}

/**
 * POST /api/sessions
 * body: { durationMinutes, createdBy, courseName, students (optional) }
 */
exports.createSession = async (req, res) => {
  try {
    const durationMinutes = Number(req.body.durationMinutes) || 10;
    const createdBy = req.body.createdBy ? String(req.body.createdBy).trim() : '';
    const courseName = req.body.courseName ? String(req.body.courseName).trim() : '';
    const students = Array.isArray(req.body.students) ? req.body.students : [];

    const sessionId = genSessionId();
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60000);

    const payload = `${sessionId}|${expiresAt.getTime()}`;
    const sig = sign(payload);

    const rawQrText = JSON.stringify({ sessionId, expiresAt: expiresAt.getTime(), sig });

    await Session.create({
      sessionId,
      createdBy,
      courseName,
      startedAt,
      expiresAt,
      students,
    });

    return res.json({ sessionId, expiresAt: expiresAt.getTime(), qrText: rawQrText, createdBy, courseName });
  } catch (err) {
    console.error('createSession error', err);
    return res.status(500).json({ error: 'Oturum oluşturulamadı' });
  }
};

/**
 * GET /api/sessions/:sessionId/students
 */
exports.getAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ sessionId }).lean();
    if (!session) return res.status(404).json({ error: 'Session bulunamadı' });

    // Attendance kayıtlarını çek
    const attendanceRecords = await Attendance.find({ sessionId }).lean();

    return res.json({
      session: {
        sessionId: session.sessionId,
        createdBy: session.createdBy || '',
        courseName: session.courseName || '',
        startedAt: session.startedAt,
        expiresAt: session.expiresAt
      },
      students: session.students || [],
      attendance: attendanceRecords || []
    });
  } catch (err) {
    console.error('getAttendance error', err);
    return res.status(500).json({ error: 'Öğrenci listesi alınamadı' });
  }
};

exports.regenerateQr = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const durationMinutes = Number(req.body.durationMinutes) || 10;

    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session bulunamadı' });

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60000);

    const payload = `${sessionId}|${expiresAt.getTime()}`;
    const sig = sign(payload);
    const rawQrText = JSON.stringify({ sessionId, expiresAt: expiresAt.getTime(), sig });

    session.expiresAt = expiresAt;
    await session.save();

    return res.json({ sessionId, expiresAt: expiresAt.getTime(), qrText: rawQrText });
  } catch (err) {
    console.error('regenerateQr error', err);
    return res.status(500).json({ error: 'QR yenilenemedi' });
  }
};

exports.clearAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session bulunamadı' });

    // Attendance kayıtlarını sil
    await Attendance.deleteMany({ sessionId });

    return res.json({ ok: true, message: 'Yoklama listesi sıfırlandı.' });
  } catch (err) {
    console.error('clearAttendance error', err);
    return res.status(500).json({ error: 'Yoklama sıfırlanamadı' });
  }
};
