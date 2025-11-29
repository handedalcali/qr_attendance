require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const sessionsRoute = require('./routes/sessions');
const attendRoute = require('./routes/attend');

const app = express();

// TRUST_PROXY ayarı
app.set('trust proxy', process.env.TRUST_PROXY === 'true');

// -----------------------------
// Middleware
// -----------------------------
app.use(helmet());

// CSP header - mobil ve tüm cihazlara izinli
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src * 'unsafe-inline' 'unsafe-eval'; " +
    "img-src * data:; " +
    "script-src * 'unsafe-inline' 'unsafe-eval'; " +
    "style-src * 'unsafe-inline'; " +
    "connect-src *;"
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
// CORS - tüm mobil cihaz ve tarayıcılar için
// -----------------------------
app.use(cors({
  origin: "*",   // tüm cihaz ve tarayıcılara izin verir
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

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
