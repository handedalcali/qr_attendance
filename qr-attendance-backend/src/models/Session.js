const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  createdBy: { type: String, default: '' },
  courseName: { type: String, default: '' },
  startedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  students: [
    {
      id: { type: String, required: true },
      name: { type: String, required: true },
      deviceId: { type: String },
      timestamp: { type: Date, default: Date.now }
    }
  ],
  meta: { type: Object }
}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);
