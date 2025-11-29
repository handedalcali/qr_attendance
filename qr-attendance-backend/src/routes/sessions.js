const express = require('express');
const router = express.Router();
const {
  createSession,
  getAttendance,
  regenerateQr,
  clearAttendance
} = require('../controllers/sessionController');

const { sign } = require('../utils/security');

// Oturum oluşturma
router.post('/', async (req, res, next) => {
  try {
    const sessionData = await createSession(req, res, next);

    const deviceId = req.body.deviceId || 'dev_' + Math.random().toString(36).substring(2, 12);

    const signature = sign(`${sessionData._id}|${deviceId}`);

    res.json({ ...sessionData, deviceId, signature });
  } catch (err) {
    console.error('createSession error:', err);
    return res.status(500).json({ error: 'Sunucu hatası (createSession).' });
  }
});

// Yoklama bilgisi
router.get('/:sessionId/students', getAttendance);

// QR kod yenileme
router.post('/:sessionId/qr', regenerateQr);

// Yoklamayı temizleme
router.post('/:sessionId/clear', clearAttendance);

module.exports = router;