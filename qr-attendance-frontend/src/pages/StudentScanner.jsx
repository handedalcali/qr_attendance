import '../StudentScanner.css';
import React, { useEffect, useState, useRef } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { markAttendance } from "../api";

export default function StudentScanner() {
  const location = useLocation();
  const history = useHistory();

  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [qrPayload, setQrPayload] = useState(null);
  const [loading, setLoading] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const params = new URLSearchParams(location.search);
    const payloadParam = params.get("payload");

    if (!payloadParam) return () => (isMountedRef.current = false);

    try {
      const decoded = decodeURIComponent(payloadParam);
      const parsed = JSON.parse(decoded);
      if (isMountedRef.current) setQrPayload(parsed);
    } catch {
      if (isMountedRef.current) setQrPayload(payloadParam);
    }

    return () => { isMountedRef.current = false; };
  }, [location.search]);

  const handleMark = async () => {
    if (!qrPayload || !studentId || !studentName.trim()) return;

    setLoading(true);

    try {
      const res = await markAttendance(qrPayload, studentId, studentName);

      // Başarılı
      if (res?.ok) {
        history.push(`/yoklama-basarili?sessionId=${qrPayload.sessionId}&status=success`);
        return;
      }

      // Backend error mesajı
      if (res?.error) {
        history.push(`/yoklama-basarili?error=${encodeURIComponent(res.error)}&status=error`);
        return;
      }

      history.push(`/yoklama-basarili?error=${encodeURIComponent("Bilinmeyen hata.")}&status=error`);

    } catch (err) {
      // 🎯 409 HATASINI DOĞRU YAKALIYORUZ
      if (err?.response?.status === 409) {
        const msg = err.response.data.error || "Bu öğrenci zaten yoklamaya katılmış.";
        history.push(`/yoklama-basarili?error=${encodeURIComponent(msg)}&status=error`);
        setLoading(false);
        return;
      }

      // Diğer hatalar
      const errMsg =
        err?.response?.data?.error ||
        err?.message ||
        "Bir hata oluştu.";

      history.push(`/yoklama-basarili?error=${encodeURIComponent(errMsg)}&status=error`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-scanner-container">
      <h2>Öğrenci Yoklama Girişi</h2>

      <label>Öğrenci Numarası / ID:</label>
      <input
        type="text"
        value={studentId}
        onChange={e => setStudentId(e.target.value.replace(/\D/g, ""))}
      />

      <label>İsim Soyisim:</label>
      <input
        type="text"
        value={studentName}
        onChange={e => setStudentName(e.target.value)}
      />

      <button onClick={handleMark} disabled={loading || !studentId || !studentName || !qrPayload}>
        {loading ? "Gönderiliyor..." : "Yoklamayı Gönder"}
      </button>
    </div>
  );
}