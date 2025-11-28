import React from 'react';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';

// Sayfa Bileşenleri
import TeacherPanel from './pages/TeacherPanel';
import StudentScanner from './pages/StudentScanner';

import './App.css';

// Ana Sayfa
const HomePage = () => (
  <div className="homepage-container">
    <h2 className="homepage-title">QR Yoklama Sistemi Giriş</h2>
    <div className="homepage-link-group">
      <Link to="/teacher" className="homepage-link teacher-link">
        Öğretmen Girişi (Oturum Başlat)
      </Link>
    </div>
    <div className="homepage-link-group">
      <Link to="/student" className="homepage-link student-link">
        Öğrenci Girişi (QR Tarama)
      </Link>
    </div>
  </div>
);

// Başarı Sayfası
const SuccessPage = () => {
  const sessionId = new URLSearchParams(window.location.search).get("sessionId");

  return (
    <div className="success-container">
      <h2 className="success-title">✅ Yoklamaya Başarıyla Katıldınız!</h2>
      <p className="success-text">Kaydınız başarıyla tamamlandı.</p>
      {sessionId && (
        <p className="session-code-text">
          Oturum Kodu: <strong>{sessionId}</strong>
        </p>
      )}
      <Link to="/student" className="success-home-button">Ana Sayfaya Dön</Link>
    </div>
  );
};

// 404 Sayfası
const NotFoundPage = () => (
  <div className="error-404-container">
    <h2>Sayfa Bulunamadı (404)</h2>
    <Link to="/" className="success-home-button">Ana Sayfaya Dön</Link>
  </div>
);

function App() {
  return (
    <Router>
      <div className="App">

        {/* ---- HEADER ARTIK TIKLANMIYOR ---- */}
        <header className="App-header">
          <h1
            style={{
              cursor: "default",
              userSelect: "none",
              pointerEvents: "none",
              margin: 0,
              padding: 0
            }}
          >
            QR Attendance System
          </h1>
        </header>

        <main className="App-main">
          <Switch>
            <Route exact path="/" component={HomePage} />
            <Route path="/teacher" component={TeacherPanel} />
            <Route path="/student" component={StudentScanner} />
            <Route path="/yoklama-basarili" component={SuccessPage} />
            <Route path="*" component={NotFoundPage} />
          </Switch>
        </main>
      </div>
    </Router>
  );
}

export default App;
