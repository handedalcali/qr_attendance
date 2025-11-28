require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { URL } = require('url');

const sessionsRoute = require('./routes/sessions');
const attendRoute = require('./routes/attend');

const app = express();
app.set('trust proxy', process.env.TRUST_PROXY === 'true');

app.use(helmet());

const rawFrontends = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '';
const allowedOrigins = rawFrontends.split(',').map(s => s.trim()).filter(Boolean);
const connectSrcValue = "'self'" + (allowedOrigins.length ? ' ' + allowedOrigins.join(' ') : '');

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src " + connectSrcValue
  );
  next();
});

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

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    try {
      const u = new URL(origin);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return callback(null, true);
    } catch {}
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS policy: origin not allowed - ${origin}`));
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204
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

app.get('/favicon.ico', (req, res) => res.status(204).end());

(async () => {
  try { await connectDB(); console.log('Database connected successfully'); }
  catch (err) { console.error('Database connection failed:', err); process.exit(1); }
})();

app.use('/api/sessions', sessionsRoute);
app.use('/api/attend', attendRoute);
app.get('/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) res.status(500).json({ error: err.message || 'Sunucu hatası.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
