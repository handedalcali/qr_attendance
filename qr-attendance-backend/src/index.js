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
app.use(helmet());

// CSP header
const rawFrontends = process.env.FRONTEND_URLS || '';
const allowedOrigins = rawFrontends.split(',').map(s => s.trim()).filter(Boolean);
const connectSrcValue = "'self'" + (allowedOrigins.length ? ' ' + allowedOrigins.join(' ') : '');

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "img-src 'self' data:; " +
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
  handler: (req, res) => res.status(429).json({ error: 'Çok fazla istek. Lütfen bekleyin.' })
}));

app.use(express.json());

// -----------------------------
// CORS
// -----------------------------
// -----------------------------
// CORS
// -----------------------------
const corsOptions = {
  origin: (origin, callback) => {
    // origin boş ise (örn: Postman veya mobil cihazlar) izin ver
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Browser', 'X-Client-OS', 'X-Client-UA'],
  credentials: true,
  optionsSuccessStatus: 200, // legacy tarayıcılar için
};

app.use(cors(corsOptions));

// Preflight (OPTIONS) tüm route’larda çalışsın
app.options('*', cors(corsOptions));

// Boş favicon route'u
app.get('/favicon.ico', (req, res) => res.status(204).end());

// -----------------------------
// DB Bağlantısı
// -----------------------------
connectDB().then(() => console.log('Database init done')).catch(err => {
  console.error('DB connection failed:', err);
  process.exit(1);
});

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
app.listen(PORT, '0.0.0.0', () => console.log(`Server listening on ${PORT}`));
