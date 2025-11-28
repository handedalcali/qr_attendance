const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  studentId: { type: String, required: true },
  studentName: { type: String },
  deviceId: { type: String },
  timestamp: { type: Date, default: Date.now },
  meta: { type: Object }
});

AttendanceSchema.index({ sessionId: 1, studentId: 1, deviceId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
