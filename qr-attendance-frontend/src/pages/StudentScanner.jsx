// StudentScanner.jsx
import React, { useEffect, useState, useRef } from "react";
import QrReader from "react-qr-reader";
import { useLocation } from "react-router-dom";
import { markAttendance } from "../api";

export default function StudentScanner({ studentsList = [] }) { // studentsList props olarak geliyor
  const location = useLocation();

  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [qrPayload, setQrPayload] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const params = new URLSearchParams(location.search);
    const payloadJson = params.get("payload");
    if (payloadJson) {
      try {
        const parsed = JSON.parse(decodeURIComponent(payloadJson));
        if (isMountedRef.current) {
          setQrPayload(parsed);
          setMessage("QR kodu başarıyla okundu. Yoklama için hazır.");
        }
      } catch (e) {
        if (isMountedRef.current) {
          setQrPayload(payloadJson);
          setMessage("QR verisi okunamadı ama manuel deneyebilirsiniz.");
        }
      }
    } else {
      setMessage("Geçerli bir session yok.");
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [location]);

  const normalizeId = (id) => String(id || "").trim();
  const normalizeName = (name) => {
    if (!name) return "";
    return String(name)
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
  };

  const normalizePayload = (input) => {
    if (!input) return null;
    if (typeof input === "object") {
      if (input.sessionId) return input;
      if (input._id) return { sessionId: input._id };
    }
    const s = String(input).trim();
    if (!s) return null;
    if (s.startsWith("{") && s.endsWith("}")) {
      try { return JSON.parse(s); } catch {}
    }
    if (s.includes("payload=")) {
      try {
        const url = new URL(s);
        const p = url.searchParams.get("payload");
        if (p) return JSON.parse(decodeURIComponent(p));
      } catch {}
    }
    return { sessionId: s };
  };

  const handleMark = async (payloadOverride) => {
    if (success) return;

    const payloadToUse = payloadOverride || qrPayload;
    if (!payloadToUse) {
      setMessage("QR payload eksik.");
      return;
    }
    if (!studentId) {
      setMessage("Öğrenci ID girin.");
      return;
    }
    if (!studentName.trim()) {
      setMessage("İsim Soyisim girin.");
      return;
    }

    // **ID ve isim kontrolü**
    const studentRecord = studentsList.find(s =>
      normalizeId(s.id) === normalizeId(studentId) &&
      normalizeName(s.name) === normalizeName(studentName)
    );
    if (!studentRecord) {
      setMessage("⚠️ Bu öğrenci yoklama listesinde yok veya bilgiler yanlış.");
      return;
    }

    let normalized = normalizePayload(payloadToUse);
    if (!normalized || !normalized.sessionId) {
      setMessage("QR payload geçersiz veya Session ID eksik.");
      return;
    }

    // deviceId yoksa otomatik ekle
    if (!normalized.deviceId) {
      normalized.deviceId = "dev_" + Math.random().toString(36).substring(2, 10);
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await markAttendance(
        normalized,
        normalizeId(studentId),
        normalizeName(studentName),
        normalized.deviceId
      );

      if (res?.ok || res?.success || res?.status === 200) {
        setMessage("✅ Yoklama başarıyla alındı."); // tek mesaj
        setSuccess(true);
        return;
      } else {
        setMessage("Hata: " + (res?.error || JSON.stringify(res)));
      }
    } catch (err) {
      console.error("markAttendance error:", err);
      const status = err?.response?.status;
      const dataErr = err?.response?.data?.error || err?.message || String(err);

      if (status === 409) {
        setMessage("⚠️ Bu öğrenci için zaten yoklama alınmış!");
      } else if (status === 400 && typeof dataErr === "string" && dataErr.includes("dolmuş")) {
        setMessage("❌ Oturum süresi dolmuş. Öğretmene danışın.");
      } else {
        setMessage("Sunucu hatası: " + dataErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (data) => {
    if (data) {
      setQrPayload(data);
      setMessage("QR kodu okundu. Yoklama için hazır.");
      setSuccess(false);
    }
  };

  const handleError = (err) => {
    if (["NotAllowedError", "NotFoundError"].includes(err?.name)) {
      setMessage("Kamera izni verilmedi veya cihazda kamera bulunamadı.");
    } else {
      setMessage("Tarayıcı hatası: " + (err?.message || String(err)));
    }
  };

  return (
    <div className="student-scanner-container">
      <h2 className="scanner-title">Öğrenci Yoklama Girişi</h2>

      <label className="input-label">Öğrenci Numarası / ID:</label>
      <input
        type="text"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ""))}
        placeholder="Örn: 12345"
        className="scanner-input"
        disabled={success}
      />

      <label className="input-label">İsim Soyisim:</label>
      <input
        type="text"
        value={studentName}
        onChange={(e) => setStudentName(e.target.value)}
        placeholder="Örn: Ahmet Yılmaz"
        className="scanner-input"
        disabled={success}
      />

      <label className="input-label">QR Kod Verisi (Manuel Giriş):</label>
      <textarea
        rows={3}
        value={typeof qrPayload === "object" ? JSON.stringify(qrPayload, null, 2) : qrPayload || ""}
        onChange={(e) => setQrPayload(e.target.value)}
        placeholder="QR payload (JSON veya sadece Session ID veya tam URL)"
        className="scanner-textarea"
        disabled={success}
      />

      <button
        onClick={() => handleMark()}
        disabled={loading || !studentId || !studentName || !qrPayload || success}
        className={`scanner-button btn-primary ${
          loading || !studentId || !studentName || !qrPayload || success ? "btn-disabled" : ""
        }`}
      >
        {loading ? "Gönderiliyor..." : success ? "Kaydedildi" : "Yoklamayı Gönder"}
      </button>

      {message && <p className="message-info" style={{ marginTop: 10 }}>{message}</p>}
    </div>
  );
}
