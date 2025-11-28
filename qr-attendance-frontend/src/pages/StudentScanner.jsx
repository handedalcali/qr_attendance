// StudentScanner.jsx
import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { markAttendance } from "../api";

export default function StudentScanner({ studentsList = [] }) {
  const location = useLocation();

  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [qrPayload, setQrPayload] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isMountedRef = useRef(true);

  // ---------- Mount: payload oku ----------
  useEffect(() => {
    isMountedRef.current = true;
    const params = new URLSearchParams(location.search);
    const payloadParam = params.get("payload");

    if (!payloadParam) {
      setMessage("Geçerli bir session yok.");
      return () => (isMountedRef.current = false);
    }

    // payload param genelde encodeURIComponent(JSON.stringify(payloadWithDevice))
    try {
      const decoded = decodeURIComponent(payloadParam);
      try {
        const parsed = JSON.parse(decoded);
        setQrPayload(parsed);
        setMessage("QR kodu başarıyla okundu. Yoklama için hazır.");
        console.debug("StudentScanner: parsed payload", parsed);
      } catch (innerErr) {
        // bazen payloadParam doğrudan JSON string değil; dene JSON.parse(payloadParam)
        try {
          const parsed2 = JSON.parse(payloadParam);
          setQrPayload(parsed2);
          setMessage("QR kodu başarıyla okundu. Yoklama için hazır.");
          console.debug("StudentScanner: parsed payload (direct)", parsed2);
        } catch (e2) {
          // string / sessionId gibi bir şey geldi
          setQrPayload(payloadParam);
          setMessage("QR verisi okunamadı JSON olarak; manuel deneyebilirsiniz.");
          console.warn("StudentScanner: payload not JSON, stored as raw:", payloadParam);
        }
      }
    } catch (err) {
      // decodeURIComponent hatası vs.
      setQrPayload(payloadParam);
      setMessage("QR parametresi çözümlenemedi; manuel deneyin.");
      console.warn("StudentScanner: decodeURIComponent failed:", err, "raw:", payloadParam);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [location.search]);

  // ---------- normalize helpers ----------
  const normalizeId = (id) => String(id ?? "").trim();
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
      if (input._id) return { sessionId: input._id, ...input };
    }
    const s = String(input || "").trim();
    if (!s) return null;
    // JSON string?
    if (s.startsWith("{") && s.endsWith("}")) {
      try {
        return JSON.parse(s);
      } catch {}
    }
    // URL with payload=...
    if (s.includes("payload=")) {
      try {
        const url = new URL(s);
        const p = url.searchParams.get("payload");
        if (p) return JSON.parse(decodeURIComponent(p));
      } catch {}
    }
    // fallback: treat as sessionId
    return { sessionId: s };
  };

  // ---------- send attendance ----------
  const handleMark = async () => {
    if (success) return;
    if (!qrPayload) {
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

    const normalizedId = normalizeId(studentId);
    const normalizedName = normalizeName(studentName);

    // ----- kontrol: studentsList'te hem id hem isim eşleşmeli -----
    const found = (studentsList || []).some((s) => {
      try {
        const sid = normalizeId(s.id);
        const sname = normalizeName(s.name || s.fullname || "");
        return sid === normalizedId && sname === normalizedName;
      } catch (e) {
        return false;
      }
    });

    if (studentsList.length && !found) {
      setMessage("⚠️ Bu öğrenci yoklama listesinde yok veya bilgiler yanlış.");
      return;
    }

    let normalized = normalizePayload(qrPayload);
    if (!normalized || !normalized.sessionId) {
      setMessage("QR payload geçersiz veya Session ID eksik.");
      return;
    }

    // deviceId ekle (backend kontrolü için)
    if (!normalized.deviceId) {
      normalized.deviceId = "dev_" + Math.random().toString(36).substring(2, 10);
      console.debug("StudentScanner: deviceId auto-generated:", normalized.deviceId);
    }

    // güvenlik: expiresAt varsa kontrol et (opsiyonel)
    if (normalized.expiresAt) {
      const now = Date.now();
      const exp = Number(normalized.expiresAt);
      if (!isNaN(exp) && now > exp) {
        setMessage("❌ Oturum süresi dolmuş. Öğretmene danışın.");
        return;
      }
    }

    try {
      setLoading(true);
      setMessage("");

      // markAttendance(payloadObj, studentId, name, deviceId)
      const res = await markAttendance(
        normalized,
        normalizedId,
        normalizedName,
        normalized.deviceId
      );

      // bazı API client'ları başarılı cevabı farklı şekillerde döndürebilir
      if (res?.ok || res?.success || res?.status === 200 || (res && typeof res === "object" && !res.error)) {
        setMessage("✅ Yoklama başarıyla alındı.");
        setSuccess(true);
        console.info("StudentScanner: attendance success", { session: normalized.sessionId, studentId: normalizedId });
        return;
      }

      // hata mesajı
      setMessage("Hata: " + (res?.error || JSON.stringify(res)));
      console.warn("StudentScanner: unexpected markAttendance response:", res);
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

  return (
    <div className="student-scanner-container">
      {/* header artık link değil ve tıklamaya kapalı */}
      <h2
        className="scanner-title"
        style={{ cursor: "default", userSelect: "none", pointerEvents: "none" }}
        aria-hidden="true"
      >
        Öğrenci Yoklama Girişi
      </h2>

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

      <label className="input-label">QR Kod Verisi:</label>
      <textarea
        rows={3}
        value={typeof qrPayload === "object" ? JSON.stringify(qrPayload, null, 2) : qrPayload || ""}
        onChange={(e) => setQrPayload(e.target.value)}
        placeholder="QR payload (JSON, Session ID veya tam URL)"
        className="scanner-textarea"
        disabled={success}
      />

      <button
        onClick={handleMark}
        disabled={loading || !studentId || !studentName || !qrPayload || success}
        className={`scanner-button btn-primary ${loading || !studentId || !studentName || !qrPayload || success ? "btn-disabled" : ""}`}
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
