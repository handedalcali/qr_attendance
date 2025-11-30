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

// Türkçe karakter duyarlı normalizasyon
function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .replace(/i/g, "i")
    .replace(/Ğ/g, "g")
    .replace(/Ü/g, "u")
    .replace(/Ş/g, "s")
    .replace(/Ö/g, "o")
    .replace(/Ç/g, "c")
    .replace(/ı/g, "i");
}

exports.markAttendance = async (req, res) => {
  try {
    let { qrPayload, sessionId: sessionIdFromBody, studentId, name, deviceId } = req.body;

    // ZORUNLU PARAMETRELER
    if (!deviceId?.trim()) return res.status(400).json({ error: "deviceId zorunludur." });
    if (!studentId?.trim()) return res.status(400).json({ error: "Öğrenci numarası zorunludur." });
    if (!name?.trim()) return res.status(400).json({ error: "İsim Soyisim zorunludur." });

    studentId = String(studentId).trim();
    const studentName = String(name).trim();
    deviceId = String(deviceId).trim();

    // QR PAYLOAD ÇÖZÜMLEME
    let sessionId = sessionIdFromBody;
    if (qrPayload) {
      const parsed = tryParseJson(qrPayload);
      if (parsed?.sessionId) sessionId = String(parsed.sessionId).trim();
    }

    if (!sessionId)
      return res.status(400).json({ error: "Geçersiz QR kodu: Oturum ID bulunamadı." });

    // OTURUMU BUL
    const session = await Session.findOne({ sessionId });

    if (!session)
      return res.status(404).json({ error: "Böyle bir yoklama oturumu bulunamadı." });

    // SÜRE KONTROLÜ
    if (session.expiresAt && Date.now() > new Date(session.expiresAt).getTime()) {
      return res.status(400).json({ error: "Bu yoklamanın süresi dolmuş." });
    }

    // 1️⃣ AYNI CİHAZLA TEKRAR GİRİŞ ENGELİ
    const deviceExists = await Attendance.findOne({
      sessionId,
      "meta.deviceId": deviceId,
    });

    if (deviceExists) {
      return res.status(409).json({
        error: "⚠️ Bu cihaz ile zaten yoklama alınmış. Tekrar giriş yapılamaz.",
      });
    }

    // 2️⃣ AYNI NUMARA İLE TEKRAR GİRİŞ ENGELİ
    const existing = await Attendance.findOne({ sessionId, studentId });

    if (existing) {
      return res.status(409).json({
        error: "⚠️ Bu numara ile zaten yoklama alındı! Tekrar giriş yapamazsınız.",
      });
    }

    // 3️⃣ LİSTE EŞLEŞMESİ (Excel doğrulaması)
    if (session.students && session.students.length > 0) {
      const validStudent = session.students.find((s) => {
        const idMatch = String(s.id || s.studentId).trim() === studentId;
        const nameMatch = normalizeName(s.name) === normalizeName(studentName);
        return idMatch && nameMatch;
      });

      if (!validStudent) {
        return res.status(404).json({
          ok: false,
          match: false,
          error: "❌ Girdiğiniz öğrenci numarası ve isim eşleşmiyor.",
        });
      }
    }

    // 4️⃣ KAYIT OLUŞTUR
    await Attendance.create({
      sessionId,
      studentId,
      studentName,
      meta: {
        deviceId,
        ip: req.ip,
        ua: req.get("User-Agent"),
      },
    });

    return res.status(200).json({
      ok: true,
      message: "✅ Yoklama başarıyla kaydedildi.",
    });
  } catch (err) {
    console.error("markAttendance error:", err);
    return res.status(500).json({ error: "Sunucu hatası: İşlem gerçekleştirilemedi." });
  }
};
