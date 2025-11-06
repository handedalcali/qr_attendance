const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const crypto = require('crypto');
const { sign } = require('../utils/security');

function genSessionId() {
    return crypto.randomBytes(6).toString('hex');
}

/**
 * Yeni oturum oluşturur
 * POST /api/sessions
 * body: { durationMinutes }
 */
exports.createSession = async (req, res) => {
    try {
        const durationMinutes = Number(req.body.durationMinutes) || 10;
        const sessionId = genSessionId();
        const startedAt = new Date();
        const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60000);

        const payload = `${sessionId}|${expiresAt.getTime()}`;
        const sig = sign(payload);

        // QR text (JSON) oluşturuluyor, artık backend image QR üretilmiyor
        const rawQrText = JSON.stringify({ sessionId, expiresAt: expiresAt.getTime(), sig });

        await Session.create({ sessionId, startedAt, expiresAt, students: [] });

        return res.json({ sessionId, expiresAt: expiresAt.getTime(), qrText: rawQrText });
    } catch (err) {
        console.error('createSession error', err);
        return res.status(500).json({ error: 'Oturum oluşturulamadı' });
    }
};

/**
 * Oturumdaki öğrencileri listele
 * GET /api/sessions/:sessionId/students
 *
 * -> Öncelikle Attendance koleksiyonundan çek (studentId, studentName, timestamp)
 * -> Eğer Attendance boşsa fallback olarak Session.students dizisini döndür
 * -> Her iki durumda da frontend'in beklediği { id, name, timestamp } formatını döndür
 */
exports.getAttendance = async (req, res) => {
    try {
        const { sessionId } = req.params;
        if (!sessionId) return res.status(400).json({ error: 'sessionId eksik.' });

        // 1) Attendance koleksiyonundan kayıtları çek
        const attendances = await Attendance.find({ sessionId })
          .sort({ timestamp: 1 })
          .select('studentId studentName timestamp -_id')
          .lean();

        if (attendances && attendances.length > 0) {
            const out = attendances.map(a => ({
                id: a.studentId,
                name: a.studentName || a.studentId,
                timestamp: a.timestamp
            }));
            return res.json(out);
        }

        // 2) Fallback: Session.students içeriğini kullan
        const session = await Session.findOne({ sessionId }).lean();
        if (!session) return res.status(404).json({ error: 'Session bulunamadı' });

        const sessionStudents = Array.isArray(session.students)
            ? session.students.map(s => ({
                id: s.id,
                name: s.name || s.id,
                timestamp: s.timestamp
            }))
            : [];

        return res.json(sessionStudents);
    } catch (err) {
        console.error('getAttendance error', err);
        return res.status(500).json({ error: 'Öğrenci listesi alınamadı' });
    }
};

/**
 * Mevcut bir session için yeni QR (yeni expiry & sig) üretir.
 */
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

        // Sadece expiresAt güncelle (öğrencileri koru)
        session.expiresAt = expiresAt;
        await session.save();

        return res.json({ sessionId, expiresAt: expiresAt.getTime(), qrText: rawQrText });
    } catch (err) {
        console.error('regenerateQr error', err);
        return res.status(500).json({ error: 'QR yenilenemedi' });
    }
};

/**
 * Yoklama listesini temizle
 */
exports.clearAttendance = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await Session.findOne({ sessionId });
        if (!session) return res.status(404).json({ error: 'Session bulunamadı' });

        // session.students boşalt
        session.students = [];
        await session.save();

        // Attendance collection'dan sil
        await Attendance.deleteMany({ sessionId });

        return res.json({ ok: true, message: 'Yoklama listesi sıfırlandı.' });
    } catch (err) {
        console.error('clearAttendance error', err);
        return res.status(500).json({ error: 'Yoklama sıfırlanamadı' });
    }
};
