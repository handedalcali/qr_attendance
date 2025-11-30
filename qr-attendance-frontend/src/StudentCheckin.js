import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { markAttendance } from "../api";

export default function StudentCheckin() {
  const location = useLocation();
  const [sessionId, setSessionId] = useState("");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" | "error"
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const payloadJson = params.get("payload");
    if (payloadJson) {
      try {
        const parsed = JSON.parse(decodeURIComponent(payloadJson));
        setSessionId(parsed.sessionId || parsed._id || "");
      } catch (e) {
        setSessionId(payloadJson);
      }
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    if (!sessionId) { 
      setMessage("Oturum bilgisi bulunamadı."); 
      setMessageType("error");
      return; 
    }
    if (!studentId && !name) { 
      setMessage("Lütfen ad veya öğrenci numarası girin."); 
      setMessageType("error");
      return; 
    }

    setLoading(true);
    try {
      const res = await markAttendance({ sessionId }, studentId, name);

      if (res?.ok) {
        setMessage("✅ Yoklama başarıyla kaydedildi. Teşekkürler!");
        setMessageType("success");
      } else if (res?.error) {
        setMessage("⚠️ " + res.error);
        setMessageType("error");
      } else {
        setMessage("⚠️ Bilgilerinizi kontrol edin.");
        setMessageType("error");
      }
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 409) {
        setMessage("⚠️ Bu öğrenci için zaten yoklama alınmış!");
        setMessageType("error");
      } else {
        setMessage("⚠️ Sunucu hatası: " + (err?.response?.data?.error || err?.message || String(err)));
        setMessageType("error");
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
        <input 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="İsim Soyisim" 
          disabled={messageType === "success"} 
        />

        <label>Öğrenci Numarası</label>
        <input 
          value={studentId} 
          onChange={(e) => setStudentId(e.target.value)} 
          placeholder="Örn: 12345" 
          disabled={messageType === "success"} 
        />

        <button 
          type="submit" 
          disabled={loading || !sessionId || messageType === "success"}
        >
          {loading ? "Gönderiliyor..." : "Yoklamaya Katıl"}
        </button>
      </form>

      {message && (
        <p className={messageType === "success" ? "message-success" : "message-error"}>
          {message}
        </p>
      )}
    </div>
  );
}