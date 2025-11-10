const express = require('express');
const router = express.Router();

const {
  createSession,
  getAttendance,
  regenerateQr,
  clearAttendance
} = require('../controllers/sessionController');

router.post('/', createSession);
router.get('/:sessionId/students', getAttendance);
router.post('/:sessionId/qr', regenerateQr);
router.post('/:sessionId/clear', clearAttendance);

module.exports = router;
