// src/controllers/attendController.js
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const { verify } = require('../utils/security');

/**
 * Güvenli JSON parse denemesi.
 * Hem string hem de zaten object olarak gelen veriyi işler.
 * @param {string|object} s
 * @returns {object|null}
 */
function tryParseJson(s) {
    try {
        // Eğer zaten nesneyse (ve null değilse), direkt döndür
        if (typeof s === 'object' && s !== null) return s;
        // String ise decode et (URL encoding'i çözmek için) ve parse et
        if (typeof s === 'string') {
            // Frontend'den gelen URL encode edilmiş string'i çözelim
            const decodedString = decodeURIComponent(s.trim());
            return JSON.parse(decodedString);
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * POST /api/attend
 * QR kod ile yoklama kaydı yapar.
 */
exports.markAttendance = async (req, res) => {
    try {
        console.log('=== /api/attend called ===');
        console.log('Request body:', req.body); // DEBUGGING: Request body'sini kontrol edin!

        let { qrPayload, sessionId: sessionIdFromBody, studentId, name } = req.body;

        // studentId ve name'i normalize et
        if (studentId != null) studentId = String(studentId).trim();
        const studentName = (name && String(name).trim()) || studentId;

        let sessionId = sessionIdFromBody;

        // 1. qrPayload'u işle ve doğrula
        if (qrPayload) {
            const parsed = tryParseJson(qrPayload);
            
            // Eğer parsing başarısızsa veya gerekli alanlar (sessionId, expiresAt, sig) yoksa
            if (!parsed || !parsed.sessionId || !parsed.expiresAt || !parsed.sig) {
                return res.status(400).json({ error: 'QR kod geçersiz.' });
            }
            
            // Eğer qrPayload'tan bir sessionId alındıysa, bunu kullan
            if (!sessionId) {
                sessionId = String(parsed.sessionId).trim();
            }

            const payload = `${sessionId}|${parsed.expiresAt}`;

            // İmza ve süre kontrolü
            if (!verify(payload, parsed.sig)) {
                return res.status(400).json({ error: 'QR kod imza hatası.' });
            }
            if (Date.now() > Number(parsed.expiresAt)) {
                return res.status(400).json({ error: 'Oturum süresi dolmuş.' });
            }
        }

        // 2. Asgari validasyon (QR kod yoksa bile SessionId ve StudentId olmalı)
        if (!sessionId || !studentId) {
            return res.status(400).json({ error: 'Eksik veri: Oturum kimliği veya öğrenci kimliği eksik.' });
        }

        sessionId = String(sessionId).trim();

        // 3. Oturumu bul
        const session = await Session.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({ error: 'Böyle bir oturum yok.' });
        }

        // students array'inin var olduğundan emin ol
        if (!Array.isArray(session.students)) session.students = [];

        // 4. Attendance koleksiyonuna kaydetme
        try {
            await Attendance.create({
                sessionId,
                studentId,
                meta: { ip: req.ip, ua: req.get('User-Agent') },
            });

            // 5. Session'a öğrenciyi ekle (mükerrer kayıt kontrolü)
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
            // Mükerrer kayıt hatası (MongoDB kodu 11000)
            if (err && err.code === 11000) {
                // session.students'taki tutarlılığı kontrol et ve düzelt
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