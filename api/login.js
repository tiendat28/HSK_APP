const bcrypt = require('bcryptjs');
const { sql, ensureSchema } = require('../lib/db');
const { signToken, setAuthCookie } = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await ensureSchema();
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Thieu ten dang nhap hoac mat khau' });
    }

    const result = await sql`SELECT id, username, password_hash FROM users WHERE username = ${username}`;
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Sai ten dang nhap hoac mat khau' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Sai ten dang nhap hoac mat khau' });
    }

    const token = signToken({ uid: user.id, username: user.username });
    setAuthCookie(res, token);
    res.status(200).json({ username: user.username });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Loi may chu, thu lai sau' });
  }
};
