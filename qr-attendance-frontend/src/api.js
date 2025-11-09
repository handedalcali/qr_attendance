import axios from "axios";

// Axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:4000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Oturum Oluşturma
export async function createSession(durationMinutes = 10, createdBy = "", courseName = "") {
  const body = { durationMinutes };
  if (createdBy) body.createdBy = String(createdBy).trim();
  if (courseName) body.courseName = String(courseName).trim();

  try {
    const res = await api.post("/sessions", body);
    return res.data;
  } catch (err) {
    handleAxiosError(err, "createSession");
  }
}

// Yoklama Bilgisi Getirme
export async function getAttendance(sessionId) {
  if (!sessionId) throw new Error("getAttendance: sessionId eksik");
  try {
    const res = await api.get(`/sessions/${encodeURIComponent(sessionId)}/students`);
    return res.data;
  } catch (err) {
    handleAxiosError(err, "getAttendance");
  }
}

// Yoklama İşaretleme
export async function markAttendance(normalizedPayload, studentId, studentName) {
  if (!normalizedPayload || !studentId || !studentName) throw new Error("markAttendance: eksik parametre");

  const body = normalizedPayload.sig
    ? { qrPayload: normalizedPayload, studentId: String(studentId).trim(), name: String(studentName).trim() }
    : { sessionId: normalizedPayload.sessionId, studentId: String(studentId).trim(), name: String(studentName).trim() };

  try {
    const res = await api.post("/attend", body);
    return res.data;
  } catch (err) {
    handleAxiosError(err, "markAttendance");
  }
}

// QR Kod Yenileme
export async function regenerateQr(sessionId, durationMinutes = 10) {
  if (!sessionId) throw new Error("regenerateQr: sessionId eksik");
  try {
    const res = await api.post(`/sessions/${encodeURIComponent(sessionId)}/qr`, { durationMinutes });
    return res.data;
  } catch (err) {
    handleAxiosError(err, "regenerateQr");
  }
}

// Yoklamayı Temizleme
export async function clearAttendance(sessionId) {
  if (!sessionId) throw new Error("clearAttendance: sessionId eksik");
  try {
    const res = await api.post(`/sessions/${encodeURIComponent(sessionId)}/clear`);
    return res.data;
  } catch (err) {
    handleAxiosError(err, "clearAttendance");
  }
}

// Axios Hata Yakalama Fonksiyonu
function handleAxiosError(err, context = "") {
  if (err.response && err.response.data) {
    const e = err.response.data;
    const message = e.error || e.message || JSON.stringify(e);
    const error = new Error(`[${context}] ${message}`);
    error.response = err.response;
    throw error;
  }
  throw new Error(`[${context}] ${err.message || String(err)}`);
}

export default api;
