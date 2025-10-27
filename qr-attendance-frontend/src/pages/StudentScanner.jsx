// src/pages/StudentScanner.jsx
import React, { useEffect, useState } from "react";
import QrReader from "react-qr-reader"; // v2.2.1 -> default import
import { useLocation, useHistory } from "react-router-dom";
import { markAttendance } from "../api";

export default function StudentScanner() {
  const location = useLocation();
  const history = useHistory();

  const [studentId, setStudentId] = useState("");
  const [qrPayload, setQrPayload] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const payloadJson = params.get("payload");
    if (payloadJson) {
      try {
        const parsed = JSON.parse(decodeURIComponent(payloadJson));
        setQrPayload(parsed);
        setMessage("QR kodu başarıyla okundu. Lütfen ID'nizi girin ve gönderin.");
      } catch (e) {
        setQrPayload(payloadJson);
        setMessage("QR verisi okunamadı ama manuel deneyebilirsiniz.");
      }
    }
  }, [location]);

  const normalizePayload = (input) => {
    if (!input) return null;
    if (typeof input === "object") {
      if (input.sessionId) return input;
      if (input._id) return { sessionId: input._id };
    }
    const s = String(input).trim();
    if (!s) return null;

    if (s.startsWith("{") && s.endsWith("}")) {
      try { return JSON.parse(s); } catch { }
    }

    if (s.includes("payload=")) {
      try {
        const url = new URL(s);
        const p = url.searchParams.get("payload");
        if (p) return JSON.parse(decodeURIComponent(p));
      } catch { }
    }

    return { sessionId: s };
  };

  const handleMark = async (payloadOverride) => {
    const payloadToUse = payloadOverride || qrPayload;
    setMessage("");

    if (!studentId) { setMessage("Öğrenci ID girin."); return; }
    if (!payloadToUse) { setMessage("QR payload eksik."); return; }

    const normalized = normalizePayload(payloadToUse);
    if (!normalized || !normalized.sessionId) {
      setMessage("QR payload geçersiz veya Oturum ID eksik.");
      return;
    }

    setLoading(true);
    try {
      const res = await markAttendance(normalized, studentId);

      if (res?.ok || res?.success || res?.status === 200) {
        setMessage("✅ Yoklama başarıyla alındı.");
        history.push(`/yoklama-basarili?sessionId=${encodeURIComponent(normalized.sessionId)}`);
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

  const handleManualTest = async () => {
    const manual = typeof qrPayload === "string" ? qrPayload : (qrPayload ? JSON.stringify(qrPayload) : "");
    if (!manual) {
      setMessage("Manuel payload boş. Lütfen textarea'ya payload girin.");
      return;
    }

    const normalized = normalizePayload(manual);
    if (!normalized || !normalized.sessionId) {
      setMessage("Manuel payload geçersiz. Lütfen JSON veya sessionId girin.");
      return;
    }

    await handleMark(normalized);
  };

  const handleScan = (data) => {
    if (data) {
      setQrPayload(data);
      setMessage("QR kodu okundu. Göndermek için ID girip butona basın.");
      setShowScanner(false);
    }
  };

  const handleError = (err) => {
    console.error("QR Tarayıcı Hatası:", err);
    if (["NotAllowedError", "NotFoundError"].includes(err?.name)) {
      setMessage("Kamera izni verilmedi veya cihazda kamera bulunamadı.");
    } else {
      setMessage("Tarayıcı hatası: " + (err?.message || String(err)));
    }
  };

  return (
    <div className="student-scanner-container">
      <h2 className="scanner-title">Öğrenci Yoklama Girişi</h2>

      <label htmlFor="studentIdInput" className="input-label">Öğrenci Numarası / ID:</label>
      <input
        id="studentIdInput"
        type="text"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        placeholder="Örn: 12345"
        className="scanner-input"
      />

      <button
        onClick={() => setShowScanner(!showScanner)}
        className={`scanner-button ${showScanner ? 'btn-danger' : 'btn-success'}`}
        disabled={loading}
      >
        {showScanner ? "Tarayıcıyı Kapat" : "QR Kod Tarayıcıyı Başlat (Kamera)"}
      </button>

      {showScanner && (
        <div className="qr-reader-frame">
          <QrReader
            delay={500}
            onError={handleError}
            onScan={handleScan}
            facingMode="environment"
            style={{ width: "100%" }}
          />
        </div>
      )}

      <label htmlFor="qrPayloadInput" className="input-label">QR Kod Verisi (Manuel Giriş):</label>
      <textarea
        id="qrPayloadInput"
        rows={3}
        value={typeof qrPayload === 'object' ? JSON.stringify(qrPayload, null, 2) : (qrPayload || '')}
        onChange={(e) => setQrPayload(e.target.value)}
        placeholder='QR payload (JSON veya sadece Session ID veya tam URL)'
        className="scanner-textarea"
      />

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          onClick={() => handleMark()}
          disabled={loading || !studentId || !qrPayload}
          className={`scanner-button btn-primary ${loading || !studentId || !qrPayload ? 'btn-disabled' : ''}`}
        >
          {loading ? "Gönderiliyor..." : "Yoklamayı Gönder"}
        </button>

        <button
          onClick={handleManualTest}
          disabled={loading || !qrPayload}
          className={`scanner-button btn-test ${loading || !qrPayload ? 'btn-disabled' : ''}`}
          title="Textarea'daki payload ile test gönderimi yapar"
        >
          Manuel Test Gönder
        </button>
      </div>

      {message && <p className="message-info" style={{ marginTop: 10 }}>{message}</p>}
    </div>
  );
}
