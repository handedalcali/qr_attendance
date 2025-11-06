// src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:4000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

export async function createSession(durationMinutes = 10, createdBy = "", courseName = "") {
  const body = { durationMinutes };
  if (createdBy) body.createdBy = String(createdBy).trim();
  if (courseName) body.courseName = String(courseName).trim();
  const res = await api.post("/sessions", body);
  return res.data;
}

export async function getAttendance(sessionId) {
  if (!sessionId) throw new Error("getAttendance: sessionId eksik");
  const res = await api.get(`/sessions/${encodeURIComponent(sessionId)}/students`);
  return res.data;
}

export async function markAttendance(normalizedPayload, studentId, studentName) {
  if (!normalizedPayload || !studentId || !studentName) throw new Error("markAttendance: eksik parametre");

  const body = normalizedPayload.sig
    ? { qrPayload: normalizedPayload, studentId: String(studentId).trim(), name: String(studentName).trim() }
    : { sessionId: normalizedPayload.sessionId, studentId: String(studentId).trim(), name: String(studentName).trim() };

  console.log("Request body:", body);
  try {
    const res = await api.post("/attend", body);
    return res.data;
  } catch (err) {
    if (err.response && err.response.data) {
      const e = err.response.data;
      const message = e.error || e.message || JSON.stringify(e);
      const error = new Error(message);
      error.response = err.response;
      throw error;
    }
    throw err;
  }
}

export async function regenerateQr(sessionId, durationMinutes = 10) {
  if (!sessionId) throw new Error("regenerateQr: sessionId eksik");
  const res = await api.post(`/sessions/${encodeURIComponent(sessionId)}/qr`, { durationMinutes });
  return res.data;
}

export async function clearAttendance(sessionId) {
  if (!sessionId) throw new Error("clearAttendance: sessionId eksik");
  const res = await api.post(`/sessions/${encodeURIComponent(sessionId)}/clear`);
  return res.data;
}

export default api;
