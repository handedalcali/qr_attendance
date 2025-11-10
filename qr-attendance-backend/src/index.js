require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { URL } = require('url');

// Rota importları
const sessionsRoute = require('./routes/sessions');
const attendRoute = require('./routes/attend');

const app = express();

// TRUST_PROXY ayarı
app.set('trust proxy', process.env.TRUST_PROXY === 'true');

// -----------------------------
// Middleware
// -----------------------------
app.use(helmet()); // Güvenlik headerları

// CSP header ekleme - base64 resimlere ve izin verilen frontendlere izin ver
const rawFrontends = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '';
const allowedOrigins = rawFrontends.split(',').map(s => s.trim()).filter(Boolean);

// connect-src değeri için originleri boşsa 'self' bırakıyoruz
const connectSrcValue = "'self'" + (allowedOrigins.length ? ' ' + allowedOrigins.join(' ') : '');

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "img-src 'self' data:; " +            // base64/data: için izin
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +
    `connect-src ${connectSrcValue};`
  );
  next();
});

// Rate limit
app.use(rateLimit({
  windowMs: 10000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Çok fazla istek. Lütfen bekleyin.' });
  }
}));

app.use(express.json());

// CORS
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Postman / curl gibi origin yoksa izin ver
    try {
      const u = new URL(origin);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return callback(null, true);
    } catch {}
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS policy: origin not allowed - ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use((req, res, next) => {
  cors(corsOptions)(req, res, (err) => {
    if (err) {
      console.warn('CORS error:', err.message);
      res.status(403).json({ error: 'CORS error: ' + err.message });
      return;
    }
    next();
  });
});

// -----------------------------
// Boş favicon route'u - 204 döndürür (404 loglarını engeller)
// -----------------------------
app.get('/favicon.ico', (req, res) => res.status(204).end());

// -----------------------------
// DB Bağlantısı
// -----------------------------
(async () => {
  try {
    await connectDB();
    console.log('Database connected successfully');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
})();

// -----------------------------
// ROTALAR
// -----------------------------
app.use('/api/sessions', sessionsRoute);
app.use('/api/attend', attendRoute);

// Sağlık kontrolü
app.get('/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) res.status(500).json({ error: err.message || 'Sunucu hatası.' });
});

// -----------------------------
// SERVER START
// -----------------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
