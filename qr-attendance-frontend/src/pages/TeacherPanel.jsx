import React, { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { createSession, getAttendance, regenerateQr, clearAttendance } from "../api";

function createQrUrl(payload, currentUrl) {
  if (!payload) return "";
  const url = new URL(currentUrl);
  url.pathname = "/student";
  url.search = "";
  url.searchParams.set("payload", encodeURIComponent(JSON.stringify(payload)));
  return url.toString();
}

function formatExpiry(expiresAt) {
  if (!expiresAt) return "—";
  const d = new Date(expiresAt);
  return isNaN(d) ? "Invalid Date" : d.toLocaleString();
}

export default function TeacherPanel() {
  const [duration, setDuration] = useState(10);
  const [teacherName, setTeacherName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [qrPayload, setQrPayload] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [studentQrUrl, setStudentQrUrl] = useState("");

  useEffect(() => {
    if (!sessionInfo?.sessionId) return;

    const fetchAttendance = async () => {
      try {
        const data = await getAttendance(sessionInfo.sessionId);
        setAttendance(data || []);
      } catch (err) {
        console.error("Yoklama çekilemedi:", err);
      }
    };

    fetchAttendance();
    const interval = setInterval(fetchAttendance, 5000);

    return () => clearInterval(interval);
  }, [sessionInfo?.sessionId]);

  const handleCreate = async () => {
    if (!teacherName.trim() || !courseName.trim()) {
      setMsg("Öğretmen adı ve ders adı zorunludur.");
      return;
    }

    setLoading(true);
    setMsg("");
    setSessionInfo(null);
    setAttendance([]);
    try {
      const res = await createSession(Number(duration || 10));
      const parsedPayload = res.qrText
        ? JSON.parse(res.qrText)
        : { sessionId: res.sessionId || res.id, expiresAt: res.expiresAt, sig: res.sig };
      const fullQrUrl = createQrUrl(parsedPayload, window.location.href);

      setSessionInfo({
        sessionId: res.sessionId || res.id,
        expiresAt: res.expiresAt,
        teacherName: teacherName.trim(),
        courseName: courseName.trim(),
      });
      setQrPayload(parsedPayload);
      setStudentQrUrl(fullQrUrl);
      setMsg("Oturum oluşturuldu: " + (res.sessionId || res.id || ""));
    } catch (err) {
      console.error(err);
      setMsg("Oturum oluşturulamadı: " + (err?.response?.data?.error || err?.message || "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAttendance = () => {
    if (!attendance.length) {
      setMsg("Yoklama listesi boş, indirme yapılamaz.");
      return;
    }
    const csvHeader = "Öğrenci Adı, Katılım Zamanı\n";
    const csvRows = attendance.map(s => `${s.name || s.id},${s.timestamp ? new Date(s.timestamp).toLocaleString() : ""}`).join("\n");
    const csvData = "data:text/csv;charset=utf-8," + encodeURIComponent(csvHeader + csvRows);
    const link = document.createElement("a");
    link.setAttribute("href", csvData);
    link.setAttribute("download", `yoklama_${sessionInfo.sessionId || Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMsg("Yoklama indirildi.");
  };

  const handleRegenerateQr = async () => {
    if (!sessionInfo?.sessionId) {
      setMsg("Önce bir oturum oluşturun.");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const res = await regenerateQr(sessionInfo.sessionId, Number(duration || 10));
      const parsedPayload = res.qrText
        ? JSON.parse(res.qrText)
        : { sessionId: res.sessionId || res.id, expiresAt: res.expiresAt, sig: res.sig };
      const fullQrUrl = createQrUrl(parsedPayload, window.location.href);

      setQrPayload(parsedPayload);
      setSessionInfo(prev => ({
        ...prev,
        sessionId: res.sessionId || res.id,
        expiresAt: res.expiresAt,
      }));
      setStudentQrUrl(fullQrUrl);
      setMsg("QR yenilendi. Yoklama listesi korunur.");
    } catch (err) {
      console.error(err);
      setMsg("QR yenilenemedi: " + (err?.response?.data?.error || err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleShowAttendance = async () => {
    if (!sessionInfo?.sessionId) return;
    setLoading(true);
    setMsg("");
    try {
      const data = await getAttendance(sessionInfo.sessionId);
      setAttendance(data || []);
      if (!data || data.length === 0) setMsg("Henüz yoklama alınmamış.");
    } catch (err) {
      console.error(err);
      setMsg("Yoklama alınamadı: " + (err?.response?.data?.error || err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleClearAttendance = async () => {
    if (!sessionInfo?.sessionId) {
      setMsg("Önce bir oturum oluşturun.");
      return;
    }
    if (!window.confirm("Yoklama listesini sıfırlamak istediğine emin misin?")) return;
    setLoading(true);
    setMsg("");
    try {
      const res = await clearAttendance(sessionInfo.sessionId);
      setAttendance([]);
      setMsg(res?.message || "Yoklama listesi sıfırlandı.");
    } catch (err) {
      console.error(err);
      setMsg("Yoklama sıfırlanamadı: " + (err?.response?.data?.error || err?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="teacher-panel-container">
      <h2 className="panel-title">Öğretmen Paneli</h2>

      <div className="control-group vertical">
        <label htmlFor="teacherNameInput">Öğretmen Adı-Soyadı:</label>
        <input
          id="teacherNameInput"
          type="text"
          value={teacherName}
          onChange={(e) => setTeacherName(e.target.value)}
          placeholder="Örn: Mehmet Yılmaz"
          className="text-input"
        />
      </div>

      <div className="control-group vertical">
        <label htmlFor="courseNameInput">Ders Adı:</label>
        <input
          id="courseNameInput"
          type="text"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          placeholder="Örn: Matematik"
          className="text-input"
        />
      </div>

      <div className="control-group vertical">
        <label htmlFor="durationInput">Oturum Süresi (dakika):</label>
        <input
          id="durationInput"
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          min={1}
          className="duration-input"
        />
      </div>

      {/* OTURUM OLUŞTUR + YOKLAMAYI İNDİR + ÖĞRENCİ EKLE */}
      <div className="session-create-buttons">
        <button onClick={handleCreate} disabled={loading} className="btn-create-session">
          {loading ? "Oluşturuluyor..." : "Oturum Oluştur"}
        </button>
        <button onClick={handleDownloadAttendance} disabled={!attendance.length} className="btn-download-session">
          Yoklamayı İndir
        </button>
        {/* Örnek Öğrenci Ekle Butonu */}
        <button className="btn-add-student">
          Öğrenci Ekle
        </button>
      </div>

      <div className="session-action-buttons">
        <button onClick={handleShowAttendance} disabled={loading || !sessionInfo} className="btn-show">
          Yoklamayı Göster
        </button>
        <button onClick={handleRegenerateQr} disabled={loading || !sessionInfo} className="btn-renew">
          QR Yenile
        </button>
        <button onClick={handleClearAttendance} disabled={loading || !sessionInfo} className="btn-clear">
          Yoklamayı Sıfırla
        </button>
      </div>

      {msg && <p className="message-info">{msg}</p>}

      {sessionInfo && (
        <div className="session-details">
          <p><strong>Session ID:</strong> {sessionInfo.sessionId}</p>
          <p><strong>Sona Erme Zamanı:</strong> {formatExpiry(sessionInfo.expiresAt)}</p>
          <p><strong>Öğretmen:</strong> {sessionInfo.teacherName || teacherName}</p>
          <p><strong>Ders:</strong> {sessionInfo.courseName || courseName}</p>
        </div>
      )}

      {studentQrUrl && (
        <div className="qr-container">
          <p className="qr-label"><strong>Öğrenci QR (Canvas):</strong></p>
          <div style={{ width: 260, height: 260 }}>
            <QRCodeCanvas value={String(studentQrUrl)} size={256} />
          </div>
          <p className="qr-label"><strong>QR İçeriği (Yönlendirme URL’i):</strong></p>
          <textarea readOnly rows={3} value={studentQrUrl} className="qr-url-textarea" />
        </div>
      )}

      {attendance.length > 0 && (
        <div className="attendance-list-container">
          <h3>Yoklama Listesi ({attendance.length})</h3>
          <ul className="attendance-list">
            {attendance.map((s, index) => (
              <li key={s.id || s._id || index} className="attendance-item">
                {s.name || s.id} {s.timestamp ? ` - (${new Date(s.timestamp).toLocaleTimeString()})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
