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
    .replace(/I/g, "ı") // Türkçe I -> ı dönüşümü
    .replace(/i/g, "i")
    .replace(/Ğ/g, "g")
    .replace(/Ü/g, "u")
    .replace(/Ş/g, "s")
    .replace(/Ö/g, "o")
    .replace(/Ç/g, "c")
    .replace(/ı/g, "i"); // Son olarak ı ve i'yi eşitlemek için
}

exports.markAttendance = async (req, res) => {
  try {
    let { qrPayload, sessionId: sessionIdFromBody, studentId, name, deviceId } = req.body;

    if (!deviceId?.trim()) return res.status(400).json({ error: 'deviceId zorunludur.' });
    if (!studentId?.trim()) return res.status(400).json({ error: 'Öğrenci numarası zorunludur.' });
    if (!name?.trim()) return res.status(400).json({ error: 'İsim Soyisim zorunludur.' });

    studentId = String(studentId).trim();
    const studentName = String(name).trim();
    deviceId = String(deviceId).trim();

    // QR Payload çözümleme
    let sessionId = sessionIdFromBody;
    if (qrPayload) {
      const parsed = tryParseJson(qrPayload);
      if (parsed?.sessionId) sessionId = String(parsed.sessionId).trim();
    }

    if (!sessionId) return res.status(400).json({ error: 'Geçersiz QR kodu: Oturum ID bulunamadı.' });

    // Oturumu bul
    const session = await Session.findOne({ sessionId });
    
    if (!session) return res.status(404).json({ error: 'Böyle bir yoklama oturumu bulunamadı.' });
    
    // Süre kontrolü
    if (session.expiresAt && Date.now() > new Date(session.expiresAt).getTime()) {
      return res.status(400).json({ error: 'Bu yoklamanın süresi dolmuş.' });
    }

    // 1️⃣ KONTROL: Mükerrer Kayıt (Önce bunu kontrol etmek veritabanı yormamak için iyidir)
    // Öğrenci bu session için daha önce kayıt atmış mı?
    const existing = await Attendance.findOne({ sessionId, studentId });
    if (existing) {
      return res.status(409).json({ 
        error: '⚠️ Bu numara ile zaten yoklama alındı! Tekrar giriş yapamazsınız.' 
      });
    }

    // 2️⃣ KONTROL: Liste Doğrulaması (Excel Eşleşmesi)
    // Session modelinde 'students' array'i olduğunu ve Excel verisinin orada olduğunu varsayıyoruz.
    // Eğer students listesi boşsa (Excel yüklenmediyse) herkesi kabul etmek istersen buraya bir if ekleyebilirsin.
    if (session.students && session.students.length > 0) {
      const validStudent = session.students.find(s => {
        // Hem numara hem isim normalizasyonu yaparak karşılaştır
        const idMatch = String(s.id || s.studentId).trim() === studentId;
        const nameMatch = normalizeName(s.name) === normalizeName(studentName);
        return idMatch && nameMatch;
      });

      if (!validStudent) {
        // İsim ve numara eşleşmediği için 404 dönüyoruz (Client tarafında yakalamak için)
        return res.status(404).json({
          ok: false,
          match: false,
          error: '❌ Girdiğiniz bilgiler (İsim + Numara) sınıf listesiyle eşleşmedi.'
        });
      }
    }

    // 3️⃣ KAYIT: Her şey yolunda, veritabanına yaz
    await Attendance.create({
      sessionId,
      studentId,
      studentName,
      meta: { deviceId, ip: req.ip, ua: req.get('User-Agent') },
    });

    return res.status(200).json({ ok: true, message: '✅ Yoklama başarıyla kaydedildi.' });

  } catch (err) {
    console.error('markAttendance error:', err);
    return res.status(500).json({ error: 'Sunucu hatası: İşlem gerçekleştirilemedi.' });
  }
};