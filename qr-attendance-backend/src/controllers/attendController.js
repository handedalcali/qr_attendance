// src/controllers/attendController.js
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
        console.log('=== /api/attend called ===');
        console.log('Request body:', req.body);

        let { qrPayload, sessionId: sessionIdFromBody, studentId, name } = req.body;

        // normalize studentId
        if (studentId != null) studentId = String(studentId).trim();

        // --- YENİ: name (isim soyisim) zorunlu kılındı ---
        if (!name || String(name).trim() === "") {
            return res.status(400).json({ error: 'Öğrenci adı (name) zorunludur. Lütfen isim soyisim girin.' });
        }
        const studentName = String(name).trim();

        let sessionId = sessionIdFromBody;

        // QR payload kontrolü (eğer gönderilmişse)
        if (qrPayload) {
            const parsed = tryParseJson(qrPayload);

            if (!parsed || !parsed.sessionId || !parsed.expiresAt || !parsed.sig) {
                return res.status(400).json({ error: 'QR kod geçersiz.' });
            }

            if (!sessionId) sessionId = String(parsed.sessionId).trim();
            const payload = `${sessionId}|${parsed.expiresAt}`;

            if (!verify(payload, parsed.sig)) {
                return res.status(400).json({ error: 'QR kod imza hatası.' });
            }

            // Oturum süresi kontrolü
            if (Date.now() > Number(parsed.expiresAt)) {
                return res.status(400).json({ error: 'Oturum süresi dolmuş.' });
            }
        }

        // Asgari kontroller
        if (!sessionId || !studentId) {
            return res.status(400).json({ error: 'Eksik veri: Oturum kimliği veya öğrenci kimliği eksik.' });
        }

        sessionId = String(sessionId).trim();

        // Oturumu bul ve süresini kontrol et
        const session = await Session.findOne({ sessionId });
        if (!session || (session.expiresAt && Date.now() > Number(session.expiresAt))) {
            return res.status(400).json({ error: 'Oturum süresi dolmuş veya geçersiz.' });
        }

        if (!Array.isArray(session.students)) session.students = [];

        try {
            // Öğrenci adı kesinlikle 'name' alanından geliyor (ID ile doldurulmuyor)
            await Attendance.create({
                sessionId,
                studentId,
                studentName,
                meta: { ip: req.ip, ua: req.get('User-Agent') },
            });

            // Oturumda zaten var mı kontrolü
            const alreadyInSession = session.students.some(s => s.id === studentId);
            if (!alreadyInSession) {
                session.students.push({ id: studentId, name: studentName, timestamp: new Date() });
                await session.save();
            }

            return res.json({
                ok: true,
                message: 'Yoklama başarıyla kaydedildi :)',
            });
        } catch (err) {
            // Duplicate key (aynı studentId için daha önce yoklama var)
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
