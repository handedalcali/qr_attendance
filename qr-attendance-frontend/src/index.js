// src/index.js
import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

// process polyfill (webpack / React 17+ uyumsuzluğu için)
window.process = { env: { NODE_ENV: 'development' } };

// React 16 render
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);

// opsiyonel: reportWebVitals
reportWebVitals();
