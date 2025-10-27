const crypto = require('crypto');
const HMAC_SECRET = process.env.HMAC_SECRET || 'test_secret';

function sign(payload){
  // payload string (ör: sessionId|expiry)
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
}

function verify(payload, signature){
  const expected = sign(payload);
  return expected === signature;
}

module.exports = { sign, verify };
