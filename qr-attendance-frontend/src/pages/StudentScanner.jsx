// StudentScanner.js
import React, { useEffect, useState, useRef } from "react";
import QrReader from "react-qr-reader";
import { useLocation } from "react-router-dom";
import { markAttendance } from "../api";

export default function StudentScanner() {
  const location = useLocation();

  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [qrPayload, setQrPayload] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
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
          setMessage("QR kodu başarıyla okundu. Lütfen ID ve isim girin.");
        }
      } catch (e) {
        if (isMountedRef.current) {
          setQrPayload(payloadJson);
          setMessage("QR verisi okunamadı ama manuel deneyebilirsiniz.");
        }
      }
    }
    return () => {
      isMountedRef.current = false;
    };
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
      try {
        return JSON.parse(s);
      } catch {}
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

  const normalizeName = (name) => {
    if (!name && name !== "") return "";
    return String(name)
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
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

    let storedStudents = [];
    try {
      storedStudents = JSON.parse(localStorage.getItem("teacher_students_list") || "[]");
    } catch (err) {
      console.warn("Excel listesi okunamadı:", err);
      storedStudents = [];
    }

    const idStr = String(studentId).trim();
    const foundById = storedStudents.find(s => String(s.id).trim() === idStr);

    if (!foundById) {
      setMessage("❌ Numaranız listede bulunamadı veya yanlış girdiniz.");
      return;
    }

    const inputNameNorm = normalizeName(studentName);
    const storedNameNorm = normalizeName(foundById.name || "");
    if (!storedNameNorm) {
      setMessage("❌ Öğrenci adı listede eksik; lütfen öğretmene danışın.");
      return;
    }
    if (inputNameNorm !== storedNameNorm) {
      setMessage("❌ ID bulundu ama isim eşleşmiyor. Lütfen adınızı doğru girin veya öğretmene danışın.");
      return;
    }

    const normalized = normalizePayload(payloadToUse);
    if (!normalized || !normalized.sessionId) {
      setMessage("QR payload geçersiz veya Oturum ID eksik.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      // **QR + yoklama gömme çözümü entegre edildi**
      const attendancePayload = {
        ...normalized,
        studentId: idStr,
        name: String(studentName).trim(),
        timestamp: new Date().toISOString()
      };

      const res = await markAttendance(attendancePayload, idStr, String(studentName).trim());

      if (res?.ok || res?.success || res?.status === 200) {
        setMessage("✅ Yoklama başarıyla alındı.");
        setSuccess(true);

        try {
          const studentsList = storedStudents.slice();
          const exists = studentsList.some(s => String(s.id).trim() === idStr);
          if (!exists) {
            studentsList.push({ id: idStr, name: String(studentName).trim() });
            localStorage.setItem("teacher_students_list", JSON.stringify(studentsList));
          }

          const savedAttendance = localStorage.getItem("teacher_attendance");
          const attendanceList = savedAttendance ? JSON.parse(savedAttendance) : [];
          const attendanceExists = attendanceList.some(a => a.studentId === idStr);
          if (!attendanceExists) {
            attendanceList.push(attendancePayload);
            localStorage.setItem("teacher_attendance", JSON.stringify(attendanceList));
          }
        } catch (e) {
          console.warn("LocalStorage güncellenirken hata:", e);
        }

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
      setMessage("QR kodu okundu. Göndermek için ID ve isim girip butona basın.");
      setShowScanner(false);
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

      <label htmlFor="studentIdInput" className="input-label">Öğrenci Numarası / ID:</label>
      <input
        id="studentIdInput"
        type="text"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ""))}
        placeholder="Örn: 12345"
        className="scanner-input"
        disabled={success}
      />

      <label htmlFor="studentNameInput" className="input-label">İsim Soyisim:</label>
      <input
        id="studentNameInput"
        type="text"
        value={studentName}
        onChange={(e) => setStudentName(e.target.value)}
        placeholder="Örn: Ahmet Yılmaz"
        className="scanner-input"
        disabled={success}
      />

      <button
        onClick={() => setShowScanner(!showScanner)}
        className={`scanner-button ${showScanner ? 'btn-danger' : 'btn-success'}`}
        disabled={loading || success}
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
        disabled={success}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          onClick={() => handleMark()}
          disabled={loading || !studentId || !studentName || !qrPayload || success}
          className={`scanner-button btn-primary ${loading || !studentId || !studentName || !qrPayload || success ? 'btn-disabled' : ''}`}
        >
          {loading ? "Gönderiliyor..." : (success ? "Kaydedildi" : "Yoklamayı Gönder")}
        </button>
      </div>

      {message && <p className="message-info" style={{ marginTop: 10 }}>{message}</p>}
      {success && <p style={{ color: "green", fontWeight: "600" }}>✅ Kaydınız alındı — teşekkürler!</p>}
    </div>
  );
}
