import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { markAttendance } from "../api";

export default function StudentCheckin() {
  const location = useLocation();
  const [sessionId, setSessionId] = useState("");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const payloadJson = params.get("payload");
    if (payloadJson) {
      try {
        const parsed = JSON.parse(decodeURIComponent(payloadJson));
        setSessionId(parsed.sessionId || parsed._id || "");
      } catch (e) {
        // eğer payload doğrudan sessionId string ise
        setSessionId(payloadJson);
      }
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!sessionId) { setMessage("Oturum bilgisi bulunamadı."); return; }
    if (!studentId && !name) { setMessage("Lütfen ad veya öğrenci numarası girin."); return; }

    setLoading(true);
    try {
      // Backend API: markAttendance({ sessionId, studentId, name }) gibi çalışmalı
      const res = await markAttendance({ sessionId, studentId, name });
      if (res?.ok || res?.success || res?.status === 200) {
        setMessage("Yoklama başarıyla kaydedildi. Teşekkürler!");
      } else {
        setMessage("Hata: " + (res?.error || JSON.stringify(res)));
      }
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 409) {
        setMessage("Bu öğrenci için zaten yoklama alınmış.");
      } else {
        setMessage("Sunucu hatası: " + (err?.response?.data?.error || err?.message || String(err)));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-checkin-container">
      <h2>Öğrenci Yoklama Sayfası</h2>
      <p>Oturum ID: <strong>{sessionId || "(bulunamadı)"}</strong></p>

      <form onSubmit={handleSubmit} className="checkin-form">
        <label>Ad Soyad</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="İsim Soyisim" />

        <label>Öğrenci Numarası</label>
        <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Örn: 12345" />

        <button type="submit" disabled={loading || !sessionId}>
          {loading ? "Gönderiliyor..." : "Yoklamaya Katıl"}
        </button>
      </form>

      {message && <p className="message-info">{message}</p>}
    </div>
  );
}
