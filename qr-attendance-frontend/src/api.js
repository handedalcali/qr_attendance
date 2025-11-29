import axios from "axios";

// Tarayıcı bilgilerini toplayan yardımcı fonksiyon
function getBrowserInfo() {
  const ua = navigator.userAgent || "Unknown";
  let browser = "Unknown";
  let os = "Unknown";

  if (ua.includes("Chrome")) browser = "Chrome";
  if (ua.includes("Firefox")) browser = "Firefox";
  if (ua.includes("Edg")) browser = "Edge";
  if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";

  if (ua.includes("Win")) os = "Windows";
  else if (ua.includes("Mac")) os = "MacOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return { browser, os, ua };
}

// Axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:4000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// 🔥 Tüm isteklere otomatik browser bilgisi ekleme
api.interceptors.request.use((config) => {
  const info = getBrowserInfo();
  config.headers["X-Client-Browser"] = info.browser;
  config.headers["X-Client-OS"] = info.os;
  config.headers["X-Client-UA"] = info.ua;
  return config;
});

// Helper: Device ID ekle
function addDeviceId(payload) {
  if (!payload.deviceId) {
    return { ...payload, deviceId: 'dev_' + Math.random().toString(36).substring(2, 12) };
  }
  return payload;
}

// Oturum Oluşturma
export async function createSession(durationMinutes = 10, createdBy = "", courseName = "") {
  const body = { durationMinutes };
  if (createdBy) body.createdBy = String(createdBy).trim();
  if (courseName) body.courseName = String(courseName).trim();

  try {
    const res = await api.post("/sessions", body);
    if (res.data.qrText) {
      const parsed = JSON.parse(res.data.qrText);
      const payloadWithDevice = addDeviceId(parsed);
      res.data.qrText = JSON.stringify(payloadWithDevice); // signature backend tarafından oluşturulacak
    }
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

  const payloadWithDevice = addDeviceId(normalizedPayload);

  const body = {
    sessionId: payloadWithDevice.sessionId,
    studentId: String(studentId).trim(),
    name: String(studentName).trim(),
    deviceId: payloadWithDevice.deviceId
  };

  try {
    const res = await api.post("/attend", body); // backend burada HMAC ile imzayı kontrol edecek
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
    if (res.data.qrText) {
      const parsed = JSON.parse(res.data.qrText);
      const payloadWithDevice = addDeviceId(parsed);
      res.data.qrText = JSON.stringify(payloadWithDevice);
    }
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
