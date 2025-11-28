import React, { useEffect, useState, useRef } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { markAttendance } from "../api";

export default function StudentScanner() {
  const location = useLocation();
  const history = useHistory();

  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [qrPayload, setQrPayload] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isMountedRef = useRef(true);

  // ---------- QR Payload Oku ----------
  useEffect(() => {
    isMountedRef.current = true;
    const params = new URLSearchParams(location.search);
    const payloadParam = params.get("payload");

    if (!payloadParam) {
      setMessage("Geçerli bir session yok.");
      return () => (isMountedRef.current = false);
    }

    try {
      const decoded = decodeURIComponent(payloadParam);
      const parsed = JSON.parse(decoded);
      setQrPayload(parsed);
      setMessage("QR kodu başarıyla okundu. Yoklama için hazır.");
    } catch {
      setQrPayload(payloadParam);
      setMessage("QR verisi okunamadı.");
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [location.search]);

  // ---------- normalize helpers ----------
  const normalizeId = (id) => String(id ?? "").trim();
  const normalizeName = (name) =>
    String(name || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
      .replace(/İ/g, "i")
      .replace(/I/g, "i")
      .replace(/Ğ/g, "g")
      .replace(/Ü/g, "u")
      .replace(/Ş/g, "s")
      .replace(/Ö/g, "o")
      .replace(/Ç/g, "c");

  const normalizePayload = (input) => {
    if (!input) return null;
    if (typeof input === "object") return input;
    try {
      return JSON.parse(String(input).trim());
    } catch {
      return { sessionId: String(input).trim() };
    }
  };

  // ---------- send attendance ----------
  const handleMark = async () => {
    if (success) return;
    if (!qrPayload) return setMessage("QR payload eksik.");
    if (!studentId) return setMessage("Öğrenci ID girin.");
    if (!studentName.trim()) return setMessage("İsim Soyisim girin.");

    const normalizedId = normalizeId(studentId);
    const normalizedName = normalizeName(studentName);
    let normalized = normalizePayload(qrPayload);

    if (!normalized || !normalized.sessionId)
      return setMessage("QR payload geçersiz.");

    if (!normalized.deviceId)
      normalized.deviceId =
        "dev_" + Math.random().toString(36).substring(2, 12);

    if (normalized.expiresAt && Date.now() > Number(normalized.expiresAt)) {
      return setMessage("❌ Oturum süresi dolmuş.");
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await markAttendance(
        normalized,
        normalizedId,
        normalizedName,
        normalized.deviceId
      );

      if (res?.ok) {
        setMessage("✅ Yoklama başarıyla alındı.");
        setSuccess(true);

        // Başarı sayfasına yönlendir
        history.push(`/yoklama-basarili?sessionId=${normalized.sessionId}`);
        return;
      }

      setMessage("Hata: " + (res?.error || JSON.stringify(res)));
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.message;
      if (err?.response?.status === 409)
        setMessage("⚠️ Bu öğrenci için zaten yoklama alınmış!");
      else setMessage("Sunucu hatası: " + errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-scanner-container">
      <h2
        className="scanner-title"
        style={{
          cursor: "default",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        Öğrenci Yoklama Girişi
      </h2>

      <label className="input-label">Öğrenci Numarası / ID:</label>
      <input
        type="text"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ""))}
        className="scanner-input"
        disabled={success}
      />

      <label className="input-label">İsim Soyisim:</label>
      <input
        type="text"
        value={studentName}
        onChange={(e) => setStudentName(e.target.value)}
        className="scanner-input"
        disabled={success}
      />

      <label className="input-label">QR Kod Verisi:</label>
      <textarea
        rows={3}
        value={
          typeof qrPayload === "object"
            ? JSON.stringify(qrPayload, null, 2)
            : qrPayload || ""
        }
        onChange={(e) => setQrPayload(e.target.value)}
        className="scanner-textarea"
        disabled={success}
      />

      <button
        onClick={handleMark}
        disabled={loading || !studentId || !studentName || !qrPayload || success}
        className="scanner-button btn-primary"
      >
        {loading ? "Gönderiliyor..." : "Yoklamayı Gönder"}
      </button>

      {message && (
        <p className="message-info" style={{ marginTop: 10 }}>
          {message}
        </p>
      )}
    </div>
  );
}
