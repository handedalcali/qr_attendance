// src/models/Session.js
const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  createdBy: { type: String, default: 'teacher1' }, // öğretmen adı
  courseName: { type: String, default: '' },         // yeni: ders adı
  startedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  students: [
    {
      id: { type: String, required: true },       // studentId
      name: { type: String, required: true },     // student name
      timestamp: { type: Date, default: Date.now } // kaydedilme zamanı
    }
  ],
  meta: { type: Object }
}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);
