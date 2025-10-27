// src/api.js
import axios from "axios";

// Axios instance'ı oluşturulur. Base URL'in .env dosyasında (REACT_APP_API_URL) 
// tam olarak http://localhost:4000/api şeklinde olduğundan emin olun.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:4000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

/** Oturum oluştur */
export async function createSession(durationMinutes = 10) {
  const res = await api.post("/sessions", { durationMinutes });
  return res.data;
}

/** Teacher için session'daki öğrencileri alır */
export async function getAttendance(sessionId) {
  if (!sessionId) throw new Error("getAttendance: sessionId eksik");
  const res = await api.get(`/sessions/${encodeURIComponent(sessionId)}/students`);
  return res.data;
}

/** Yoklama kaydet (API'ye gönderim) */
export async function markAttendance(normalizedPayload, studentId) {
  if (!normalizedPayload || !studentId) throw new Error("markAttendance: eksik parametre");

  let body;

  // Backend'in hangi anahtarı beklediğine göre body hazırlanır (imzalı payload veya sadece sessionId)
  if (normalizedPayload.sig) {
    body = { 
      qrPayload: normalizedPayload, 
      studentId: studentId 
    };
  } else {
    body = {
      sessionId: normalizedPayload.sessionId,
      studentId: studentId
    };
  }

  // API rotası /attend
  const res = await api.post("/attend", body);
  return res.data;
}

/** Aynı session için QR yenile */
export async function regenerateQr(sessionId, durationMinutes = 10) {
  if (!sessionId) throw new Error("regenerateQr: sessionId eksik");
  const res = await api.post(`/sessions/${encodeURIComponent(sessionId)}/qr`, { durationMinutes });
  return res.data;
}

/** Yoklama listesini sıfırla */
export async function clearAttendance(sessionId) {
  if (!sessionId) throw new Error("clearAttendance: sessionId eksik");
  const res = await api.post(`/sessions/${encodeURIComponent(sessionId)}/clear`);
  return res.data;
}

export default api;
