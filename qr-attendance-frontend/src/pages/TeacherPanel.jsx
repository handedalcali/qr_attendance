import React, { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { createSession, getAttendance, regenerateQr, clearAttendance } from "../api";
import { useHistory, useLocation } from "react-router-dom";

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

function generateDeviceId() {
  return 'dev_' + Math.random().toString(36).substring(2, 10);
}

export default function TeacherPanel() {
  const history = useHistory();
  const location = useLocation();

  const [duration, setDuration] = useState(10);
  const [teacherName, setTeacherName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [qrPayload, setQrPayload] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [studentQrUrl, setStudentQrUrl] = useState("");
  const [filter, setFilter] = useState("all");

  // LocalStorage update
  useEffect(() => {
    localStorage.setItem("teacher_info", JSON.stringify({ name: teacherName, course: courseName, duration }));
  }, [teacherName, courseName, duration]);

  useEffect(() => {
    localStorage.setItem("teacher_students_list", JSON.stringify(studentsList));
  }, [studentsList]);

  useEffect(() => {
    localStorage.setItem("teacher_attendance", JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    if (qrPayload) {
      try { localStorage.setItem("teacher_qr_payload", JSON.stringify(qrPayload)); } catch {}
    }
  }, [qrPayload]);

  // Load session info from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const returnedSession = params.get("sessionInfo");
    if (returnedSession) {
      try {
        const sessionObj = JSON.parse(decodeURIComponent(returnedSession));
        setSessionInfo(prev => ({ ...prev, ...sessionObj }));

        let payloadWithDevice;
        if (!sessionObj.sig) {
          try {
            const savedPayloadRaw = localStorage.getItem("teacher_qr_payload");
            if (savedPayloadRaw) {
              const savedPayload = JSON.parse(savedPayloadRaw);
              if (savedPayload && savedPayload.sessionId === sessionObj.sessionId) {
                payloadWithDevice = { ...savedPayload, deviceId: generateDeviceId() };
              }
            }
          } catch (err) { console.warn("teacher_qr_payload okunamadı:", err); }
        } else {
          payloadWithDevice = { sessionId: sessionObj.sessionId, expiresAt: sessionObj.expiresAt, sig: sessionObj.sig, deviceId: generateDeviceId() };
        }

        if (payloadWithDevice) {
          setQrPayload(payloadWithDevice);
          setStudentQrUrl(createQrUrl(payloadWithDevice, window.location.href));
        }

        if (!teacherName) {
          const savedTeacherRaw = localStorage.getItem("teacher_info");
          if (savedTeacherRaw) {
            const parsed = JSON.parse(savedTeacherRaw);
            setTeacherName(parsed.name || "");
            setCourseName(parsed.course || "");
            setDuration(parsed.duration || 10);
          }
        }

        if (!studentsList.length) {
          const savedStudents = localStorage.getItem("teacher_students_list");
          if (savedStudents) setStudentsList(JSON.parse(savedStudents));
        }

        if (!attendance.length) {
          const savedAttendance = localStorage.getItem("teacher_attendance");
          if (savedAttendance) setAttendance(JSON.parse(savedAttendance));
        }
      } catch (err) {
        console.error("Geri dönüş session yüklenemedi:", err);
      }
    }
  }, [location.search]);

  // Fetch attendance periodically
  useEffect(() => {
    if (!sessionInfo?.sessionId) return;
    const fetchAttendance = async () => {
      try {
        const data = await getAttendance(sessionInfo.sessionId);
        if (data) {
          setAttendance(Array.isArray(data.attendance) ? data.attendance : []);
          if (data.session) {
            setSessionInfo(prev => ({
              ...prev,
              teacherName: data.session.createdBy || prev?.teacherName,
              courseName: data.session.courseName || prev?.courseName,
              sessionId: data.session.sessionId || prev?.sessionId,
              expiresAt: data.session.expiresAt || prev?.expiresAt
            }));
          }
        }
      } catch (err) {
        console.error("Yoklama çekilemedi:", err);
      }
    };
    fetchAttendance();
    const interval = setInterval(fetchAttendance, 5000);
    return () => clearInterval(interval);
  }, [sessionInfo?.sessionId]);

  // Session create
  const handleCreate = async () => {
    if (!teacherName.trim() || !courseName.trim()) { setMsg("Öğretmen adı ve ders adı zorunludur."); return; }
    setLoading(true); setMsg(""); setSessionInfo(null); setAttendance([]);
    try {
      const res = await createSession(Number(duration || 10), teacherName.trim(), courseName.trim());
      const parsedPayload = res.qrText ? JSON.parse(res.qrText) : { sessionId: res.sessionId || res.id, expiresAt: res.expiresAt, sig: res.sig };
      const payloadWithDevice = { ...parsedPayload, deviceId: generateDeviceId() };
      setSessionInfo({ sessionId: res.sessionId || res.id, expiresAt: res.expiresAt, teacherName: teacherName.trim(), courseName: courseName.trim(), sig: parsedPayload.sig || res.sig || null });
      setQrPayload(payloadWithDevice);
      setStudentQrUrl(createQrUrl(payloadWithDevice, window.location.href));
      try { localStorage.setItem("teacher_qr_payload", JSON.stringify(payloadWithDevice)); } catch {}
      setMsg("Oturum oluşturuldu: " + (res.sessionId || res.id || ""));
    } catch (err) {
      console.error(err);
      setMsg("Oturum oluşturulamadı: " + (err?.response?.data?.error || err?.message || "Bilinmeyen hata"));
    } finally { setLoading(false); }
  };

  // Download attendance
  const handleDownloadAttendance = () => {
    if (!studentsList.length && !attendance.length) { setMsg("İndirilecek öğrenci listesi yok."); return; }
    const byId = {};
    attendance.forEach(r => { const sid = r.studentId || r.id || r._id || ""; if (sid) byId[String(sid)] = r; });
    const sheetData = studentsList.map(student => {
      const id = student.id || student.studentId || student.studentNumber || "";
      const record = byId[String(id)];
      return { "Öğrenci Numarası": id || "", "Öğrenci Adı Soyadı": student.name || "", "Tarih": record && record.timestamp ? new Date(record.timestamp).toLocaleString() : "", "Var / Yok": record && record.timestamp ? "Var" : "Yok" };
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetData, { header: ["Öğrenci Numarası", "Öğrenci Adı Soyadı", "Tarih", "Var / Yok"] });
    XLSX.utils.book_append_sheet(wb, ws, "Yoklama");
    const safeTeacher = (sessionInfo?.teacherName || teacherName || "Ogretmen").replace(/[^a-z0-9_\-ğüşöçıİĞÜŞÖÇ\s]/gi, "").replace(/\s+/g, "_");
    const safeCourse = (sessionInfo?.courseName || courseName || "Ders").replace(/[^a-z0-9_\-ğüşöçıİĞÜŞÖÇ\s]/gi, "").replace(/\s+/g, "_");
    const fileName = `yoklama_${safeTeacher}_${safeCourse}_${sessionInfo?.sessionId || Date.now()}.xlsx`;
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]), fileName);
    setMsg("Yoklama Excel olarak indirildi.");
  };

  // QR regenerate
  const handleRegenerateQr = async () => {
    if (!sessionInfo?.sessionId) { setMsg("Önce bir oturum oluşturun."); return; }
    setLoading(true); setMsg("");
    try {
      const res = await regenerateQr(sessionInfo.sessionId, Number(duration || 10));
      const parsedPayload = res.qrText ? JSON.parse(res.qrText) : { sessionId: res.sessionId || res.id, expiresAt: res.expiresAt, sig: res.sig };
      const payloadWithDevice = { ...parsedPayload, deviceId: generateDeviceId() };
      setQrPayload(payloadWithDevice);
      setSessionInfo(prev => ({ ...prev, sessionId: res.sessionId || res.id, expiresAt: res.expiresAt, sig: payloadWithDevice.sig || prev?.sig }));
      setStudentQrUrl(createQrUrl(payloadWithDevice, window.location.href));
      try { localStorage.setItem("teacher_qr_payload", JSON.stringify(payloadWithDevice)); } catch {}
      setMsg("QR yenilendi. Yoklama listesi korunur.");
    } catch (err) {
      console.error(err);
      setMsg("QR yenilenemedi: " + (err?.response?.data?.error || err?.message));
    } finally { setLoading(false); }
  };

  // Show, clear attendance & excel upload
  const handleShowAttendance = async () => {
    if (!sessionInfo?.sessionId) return;
    setLoading(true);
    setMsg("");
    try {
      const data = await getAttendance(sessionInfo.sessionId);
      setAttendance(Array.isArray(data.attendance) ? data.attendance : []);
      if (!data.attendance?.length && !studentsList?.length) setMsg("Henüz yoklama alınmamış.");
    } catch (err) { console.error(err); setMsg("Yoklama alınamadı: " + (err?.response?.data?.error || err?.message)); }
    finally { setLoading(false); }
  };

  const handleClearAttendance = async () => {
    if (!sessionInfo?.sessionId) { setMsg("Önce bir oturum oluşturun."); return; }
    if (!window.confirm("Yoklama listesini sıfırlamak istediğine emin misin?")) return;
    setLoading(true);
    setMsg("");
    try { const res = await clearAttendance(sessionInfo.sessionId); setAttendance([]); setMsg(res?.message || "Yoklama listesi sıfırlandı."); }
    catch (err) { console.error(err); setMsg("Yoklama sıfırlanamadı: " + (err?.response?.data?.error || err?.message)); }
    finally { setLoading(false); }
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: ["id", "name"], defval: "" });
      let students = json.map(r => ({ id: String(r.id).trim(), name: String(r.name).trim() })).filter(r => r.id && r.name);
      students = students.slice(1);
      setStudentsList(students);
      setMsg(`${students.length} öğrenci master listeye yüklendi.`);
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredStudents = studentsList.filter(s => {
    const rec = attendance.find(a => a.studentId === s.id);
    if (filter === "present") return rec && rec.timestamp;
    if (filter === "absent") return !rec || !rec.timestamp;
    return true;
  });

  const handleAddStudent = () => {
    let sessionObj = qrPayload?.sessionId ? qrPayload : sessionInfo ? { ...sessionInfo, sig: qrPayload?.sig || sessionInfo.sig || null } : null;
    if (!sessionObj?.sessionId) { alert("Önce oturum oluşturun veya QR kodu alın."); return; }
    const payloadWithDevice = { ...sessionObj, deviceId: generateDeviceId() };
    const payloadStr = encodeURIComponent(JSON.stringify(payloadWithDevice));
    const sessionStr = `&sessionInfo=${encodeURIComponent(JSON.stringify(sessionObj))}`;
    const newTabUrl = `/student?payload=${payloadStr}&returnUrl=${encodeURIComponent("/teacher")}${sessionStr}`;
    window.open(newTabUrl, "_blank");
  };

  return (
    <div className="teacher-panel-container">
      <h2 className="panel-title">Öğretmen Paneli</h2>

      <div className="control-group vertical">
        <label>Öğretmen Adı-Soyadı:</label>
        <input type="text" value={teacherName} onChange={e => setTeacherName(e.target.value)} placeholder="Örn: Mehmet Yılmaz" className="text-input" />
      </div>

      <div className="control-group vertical">
        <label>Ders Adı:</label>
        <input type="text" value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Örn: Matematik" className="text-input" />
      </div>

      <div className="control-group vertical">
        <label>Oturum Süresi (dakika):</label>
        <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min={1} className="duration-input" />
      </div>

      <div className="control-group vertical">
        <label>Öğrenci Listesi Yükle (Excel - CSV uyumlu):</label>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="file-input" />
      </div>

      <div className="session-create-buttons">
        <button onClick={handleCreate} disabled={loading} className="btn-create-session">{loading ? "Oluşturuluyor..." : "Oturum Oluştur"}</button>
        <button onClick={handleDownloadAttendance} disabled={!studentsList.length && !attendance.length} className="btn-download-session">Yoklamayı İndir</button>
        <button onClick={handleAddStudent} className="btn-add-student">Öğrenci Ekle</button>
      </div>

      <div className="session-action-buttons">
        <button onClick={handleShowAttendance} disabled={loading || !sessionInfo} className="btn-show">Yoklamayı Göster</button>
        <button onClick={handleRegenerateQr} disabled={loading || !sessionInfo} className="btn-renew">QR Yenile</button>
        <button onClick={handleClearAttendance} disabled={loading || !sessionInfo} className="btn-clear">Yoklamayı Sıfırla</button>
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
          <p className="qr-label"><strong>QR İçeriği (Yönlendirme URL’i):</strong></p>
          <textarea readOnly rows={3} value={studentQrUrl} className="qr-url-textarea" />
        </div>
      )}

      {studentsList.length > 0 && (
        <div className="attendance-list-container">
          <h3>Yoklama Listesi ({filteredStudents.length})</h3>

          <div className="filter-buttons">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Tümü</button>
            <button className={filter === "present" ? "active" : ""} onClick={() => setFilter("present")}>Katılanlar</button>
            <button className={filter === "absent" ? "active" : ""} onClick={() => setFilter("absent")}>Katılmayanlar</button>
          </div>

          <table className="attendance-table">
            <thead>
              <tr>
                <th>Öğrenci Numarası</th>
                <th>Adı Soyadı</th>
                <th>Var / Yok</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(s => {
                const rec = attendance.find(a => a.studentId === s.id);
                return (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{s.name}</td>
                    <td>{rec && rec.timestamp ? "✅" : "❌"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
