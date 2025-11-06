// src/models/Attendance.js
const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  studentId: { type: String, required: true },
  studentName: { type: String }, // Yeni alan eklendi
  timestamp: { type: Date, default: Date.now },
  meta: { type: Object }
});

// sessionId + studentId kombinasyonu tekil olmalı
AttendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
