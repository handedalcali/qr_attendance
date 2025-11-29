const crypto = require('crypto');
const HMAC_SECRET = process.env.HMAC_SECRET || 'test_secret';

/* ----------------------------- */
/*    QR SIGN / VERIFY KISMI     */
/* ----------------------------- */

function sign(payload) {
  return crypto.createHmac('sha256', HMAC_SECRET)
               .update(payload)
               .digest('hex');
}

function verify(payload, signature) {
  const expected = sign(payload);
  return expected === signature;
}

/* ----------------------------- */
/*     TARAYICI KISITLAMASI      */
/* ----------------------------- */

// İzin verilen tarayıcılar
const ALLOWED_BROWSERS = ["Chrome", "Firefox", "Edge"];

// İzin verilen işletim sistemleri
const ALLOWED_OS = ["Windows", "MacOS", "Linux", "Android", "iOS"];

// Header’dan bilgiyi topla
function getClientInfo(req) {
  return {
    browser: req.headers["x-client-browser"] || "Unknown",
    os: req.headers["x-client-os"] || "Unknown",
    ua: req.headers["x-client-ua"] || "Unknown"
  };
}

// Tarayıcı doğrulama
function verifyBrowser(req) {
  const { browser, os } = getClientInfo(req);

  if (!ALLOWED_BROWSERS.includes(browser)) {
    return { ok: false, reason: `Tarayıcı desteklenmiyor: ${browser}` };
  }

  if (!ALLOWED_OS.includes(os)) {
    return { ok: false, reason: `İşletim sistemi desteklenmiyor: ${os}` };
  }

  return { ok: true };
}

// Örnek: Sign ve Device ile kullanımı
function generateSignedPayload(sessionId, deviceId, studentId = "") {
  const payload = studentId
    ? `${sessionId}|${studentId}|${deviceId}`
    : `${sessionId}|${deviceId}`;
  return sign(payload);
}

module.exports = {
  sign,
  verify,
  verifyBrowser,
  getClientInfo,
  generateSignedPayload
};
