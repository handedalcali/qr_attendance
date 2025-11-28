const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const QRCode = require('qrcode');
const { sign } = require('../utils/security');

async function generateSessionQr(sessionId) {
  const session = await Session.findOne({ sessionId });
  if (!session) throw new Error("Session bulunamadı");

  // Öğrenci yoklamasını çek
  const attendanceRecords = await Attendance.find({ sessionId });
  const attendancePayload = attendanceRecords.map(a => ({
    studentId: a.studentId,
    name: a.studentName,
    deviceId: a.deviceId,      // deviceId ekledik
    present: true,
    timestamp: a.timestamp
  }));

  const payload = {
    sessionId,
    expiresAt: session.expiresAt,
    attendance: attendancePayload
  };

  // İmzala
  payload.sig = sign(JSON.stringify(payload));

  // QR oluştur
  const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), { errorCorrectionLevel: 'H' });
  return { payload, dataUrl };
}

module.exports = { generateSessionQr };
