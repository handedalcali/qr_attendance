import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

// Sayfa Bileşenleri
import TeacherPanel from "./pages/TeacherPanel";
import StudentScanner from "./pages/StudentScanner";
import SuccessPage from "./pages/SuccessPage";

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
              padding: 0,
            }}
          >
            QR Attendance System
          </h1>
        </header>

        <main className="App-main">
          <Switch>
            <Route exact path="/" component={TeacherPanel} />
            <Route path="/scan">
              <StudentScanner sessionId={new URLSearchParams(window.location.search).get("sessionId")} />
            </Route>
            <Route path="/success" component={SuccessPage} />
          </Switch>
        </main>
      </div>
    </Router>
  );
}

export default App;
