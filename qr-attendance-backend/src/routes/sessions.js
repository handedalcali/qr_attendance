// src/routes/sessions.js
const express = require('express');
const router = express.Router();
const {
  createSession,
  getAttendance,
  regenerateQr,
  clearAttendance
} = require('../controllers/sessionController');

// POST /api/sessions
router.post('/', createSession);

// GET /api/sessions/:sessionId/students
router.get('/:sessionId/students', getAttendance);

// POST /api/sessions/:sessionId/qr
router.post('/:sessionId/qr', regenerateQr);

// POST /api/sessions/:sessionId/clear
router.post('/:sessionId/clear', clearAttendance);

module.exports = router;
