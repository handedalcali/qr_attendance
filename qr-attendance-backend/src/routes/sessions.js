const express = require('express');
const router = express.Router();
const {
  createSession,
  getAttendance,
  regenerateQr,
  clearAttendance
} = require('../controllers/sessionController');
const browserCheck = require('../middleware/browserCheck');
const { sign } = require('../utils/security');

// Oturum oluşturma
router.post('/', browserCheck, async (req, res, next) => {
  try {
    const sessionData = await createSession(req, res, next);

    // DeviceId ekle
    const deviceId = req.body.deviceId || 'dev_' + Math.random().toString(36).substring(2, 12);

    // HMAC signature üret
    const signature = sign(`${sessionData._id}|${deviceId}`);

    // Frontend’e DeviceId ve signature ile birlikte gönder
    res.json({ ...sessionData, deviceId, signature });
  } catch (err) {
    console.error('createSession error:', err);
    return res.status(500).json({ error: 'Sunucu hatası (createSession).' });
  }
});

// Yoklama bilgisi (tarayıcı kısıtlaması kontrolü)
router.get('/:sessionId/students', browserCheck, getAttendance);

// QR kod yenileme (tarayıcı kısıtlaması kontrolü)
router.post('/:sessionId/qr', browserCheck, regenerateQr);

// Yoklamayı temizleme (tarayıcı kısıtlaması kontrolü)
router.post('/:sessionId/clear', browserCheck, clearAttendance);

module.exports = router;
