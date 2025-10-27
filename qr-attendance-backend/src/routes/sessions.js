// src/routes/sessions.js
const express = require('express');
const router = express.Router();
const {
  createSession,
  getAttendance,
  regenerateQr,
  clearAttendance
} = require('../controllers/sessionController');

// Oturum oluşturma rotası (POST /api/sessions)
router.post('/', createSession);

// Yoklama listesini alma rotası (GET /api/sessions/:sessionId/students)
router.get('/:sessionId/students', getAttendance);

// QR yenileme rotası (POST /api/sessions/:sessionId/qr)
router.post('/:sessionId/qr', regenerateQr);

// Yoklamayı sıfırlama rotası (POST /api/sessions/:sessionId/clear)
router.post('/:sessionId/clear', clearAttendance);

module.exports = router;
