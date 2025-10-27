// src/pages/TeacherPanel.jsx
import React, { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { createSession, getAttendance, regenerateQr, clearAttendance } from "../api";

function createQrUrl(payload, currentUrl) {
  if (!payload) return "";
  let obj;
  if (typeof payload === "string") {
    try { obj = JSON.parse(decodeURIComponent(payload)); } catch { obj = { sessionId: payload }; }
  } else obj = payload;
  const sessionId = obj?.sessionId || obj?.id || obj?._id;
  if (!sessionId) {
    const raw = encodeURIComponent(JSON.stringify(obj));
    const url = new URL(currentUrl);
    url.pathname = "/student";
    url.search = "";
    url.searchParams.set("payload", raw);
    return url.toString();
  }
  const url = new URL(currentUrl);
  url.pathname = "/student";
  url.search = "";
  url.searchParams.set("payload", encodeURIComponent(JSON.stringify({ sessionId })));
  return url.toString();
}

function formatExpiry(expiresAt) {
  if (!expiresAt) return "—";
  const d = new Date(expiresAt);
  return isNaN(d) ? "Invalid Date" : d.toLocaleString();
}

export default function TeacherPanel() {
  const [duration, setDuration] = useState(10);
  const [qrPayload, setQrPayload] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [studentQrUrl, setStudentQrUrl] = useState("");

  useEffect(() => {
    if (!sessionInfo?.sessionId) return;
    const interval = setInterval(async () => {
      try {
        const data = await getAttendance(sessionInfo.sessionId);
        setAttendance(data || []);
      } catch (err) {
        console.error("Yoklama çekilemedi:", err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [sessionInfo]);

  const handleCreate = async () => {
    setLoading(true); setMsg(""); setSessionInfo(null); setAttendance([]);
    try {
      const res = await createSession(Number(duration || 10));
      let parsedPayload = null;
      if (res?.qrText) {
        try { parsedPayload = JSON.parse(res.qrText); } catch { parsedPayload = res.qrText; }
      } else parsedPayload = { sessionId: res.sessionId || res.id || res._id };
      const fullQrUrl = createQrUrl(parsedPayload, window.location.href);
      setSessionInfo({ sessionId: res.sessionId || res.id, expiresAt: res.expiresAt });
      setQrPayload(parsedPayload);
      setStudentQrUrl(fullQrUrl);
      setMsg("Oturum oluşturuldu: " + (res.sessionId || res.id || ""));
    } catch (err) {
      console.error(err);
      setMsg("Oturum oluşturulamadı: " + (err?.response?.data?.error || err?.message || "Bilinmeyen hata"));
    } finally { setLoading(false); }
  };

  const handleRegenerateQr = async () => {
    if (!sessionInfo?.sessionId) { setMsg("Önce bir oturum oluşturun."); return; }
    setLoading(true); setMsg("");
    try {
      const res = await regenerateQr(sessionInfo.sessionId, Number(duration || 10));
      let parsedPayload = null;
      if (res?.qrText) {
        try { parsedPayload = JSON.parse(res.qrText); } catch { parsedPayload = res.qrText; }
      } else parsedPayload = { sessionId: res.sessionId || res.id };
      const fullQrUrl = createQrUrl(parsedPayload, window.location.href);
      setQrPayload(parsedPayload);
      setSessionInfo({ sessionId: res.sessionId || res.id, expiresAt: res.expiresAt });
      setStudentQrUrl(fullQrUrl);
      setMsg("QR yenilendi. Yoklama listesi korunur.");
    } catch (err) {
      console.error(err);
      setMsg("QR yenilenemedi: " + (err?.response?.data?.error || err?.message));
    } finally { setLoading(false); }
  };

  const handleShowAttendance = async () => {
    if (!sessionInfo?.sessionId) return;
    setLoading(true); setMsg("");
    try {
      const data = await getAttendance(sessionInfo.sessionId);
      setAttendance(data || []);
      if (!data || data.length === 0) setMsg("Henüz yoklama alınmamış.");
    } catch (err) {
      console.error(err);
      setMsg("Yoklama alınamadı: " + (err?.response?.data?.error || err?.message));
    } finally { setLoading(false); }
  };

  const handleClearAttendance = async () => {
    if (!sessionInfo?.sessionId) { setMsg("Önce bir oturum oluşturun."); return; }
    if (!window.confirm("Yoklama listesini sıfırlamak istediğine emin misin?")) return;
    setLoading(true); setMsg("");
    try {
      const res = await clearAttendance(sessionInfo.sessionId);
      setAttendance([]);
      setMsg(res?.message || "Yoklama listesi sıfırlandı.");
    } catch (err) {
      console.error(err);
      setMsg("Yoklama sıfırlanamadı: " + (err?.response?.data?.error || err?.message));
    } finally { setLoading(false); }
  };

  return (
    <div className="teacher-panel-container">
      <h2 className="panel-title">Öğretmen Paneli</h2>

      <div className="control-group">
        <label htmlFor="durationInput">Oturum Süresi (dakika)</label>
        <input
          id="durationInput"
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          min={1}
          className="duration-input"
        />
        <button onClick={handleCreate} disabled={loading} className="btn btn-create">
          {loading ? "Oluşturuluyor..." : "Oturum Oluştur"}
        </button>
      </div>

      <div className="button-group">
        <button onClick={handleShowAttendance} disabled={loading || !sessionInfo} className="btn btn-show">Yoklamayı Göster</button>
        <button onClick={handleRegenerateQr} disabled={loading || !sessionInfo} className="btn btn-renew">QR Yenile</button>
        <button onClick={handleClearAttendance} disabled={loading || !sessionInfo} className="btn btn-clear">Yoklamayı Sıfırla</button>
      </div>

      {msg && <p className="message-info">{msg}</p>}

      {sessionInfo && (
        <div className="session-details">
          <p><strong>Session ID:</strong> {sessionInfo.sessionId}</p>
          <p><strong>Sona Erme Zamanı:</strong> {formatExpiry(sessionInfo.expiresAt)}</p>
        </div>
      )}

      {studentQrUrl && (
        <div className="qr-container">
          <p className="qr-label"><strong>Öğrenci QR (Canvas):</strong></p>
          <div style={{ width: 260, height: 260 }}>
            <QRCodeCanvas value={String(studentQrUrl)} size={256} />
          </div>

          <p className="qr-label"><strong>QR İçeriği (Yönlendirme URL'i):</strong></p>
          <textarea readOnly rows={3} value={studentQrUrl} className="qr-url-textarea" />
        </div>
      )}

      {attendance.length > 0 && (
        <div className="attendance-list-container">
          <h3>Yoklama Listesi ({attendance.length})</h3>
          <ul className="attendance-list">
            {attendance.map((s, index) => (
              <li key={s.id || s._id || index} className="attendance-item">
                {s.name || s.id} {s.timestamp ? ` - (${new Date(s.timestamp).toLocaleTimeString()})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
