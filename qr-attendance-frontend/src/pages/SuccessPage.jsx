import { useLocation } from "react-router-dom";

export default function SuccessPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get("sessionId");
  const error = params.get("error");

  // Hata varsa
  if (error) {
    return (
      <div className="error-container">
        <h2 className="error-title">⚠️ Yoklama Kaydı Hatası</h2>
        <p className="error-text">{error}</p>
      </div>
    );
  }

  // Başarı durumu
  if (sessionId) {
    return (
      <div className="success-container">
        <h2 className="success-title">✅ Öğrenci Bilgileriniz Gönderildi</h2>
        <p className="success-text">Yanlış bilgi giren öğrenciler yoklamada gözükmez!</p>
        <p className="session-code-text">
          Oturum Kodu: <strong>{sessionId}</strong>
        </p>
      </div>
    );
  }

  return null;
}