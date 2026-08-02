const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const COOKIE_NAME = 'hsk_token';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 ngay

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) {
    throw new Error('Thieu bien moi truong JWT_SECRET. Vao Vercel Settings > Environment Variables de them.');
  }
  return s;
}

function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '180d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch (e) {
    return null;
  }
}

function getTokenFromReq(req) {
  const raw = req.headers.cookie || '';
  const parsed = cookie.parse(raw);
  return parsed[COOKIE_NAME];
}

// Tra ve { uid, username } neu token hop le, nguoc lai null.
function getUserFromReq(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  return verifyToken(token);
}

function setAuthCookie(res, token) {
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  }));
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  }));
}

module.exports = { signToken, verifyToken, getUserFromReq, setAuthCookie, clearAuthCookie };
