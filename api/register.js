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
    if (typeof username !== 'string' || username.length < 3 || username.length > 24 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Ten dang nhap 3-24 ky tu, chi gom chu, so, dau gach duoi' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Mat khau can toi thieu 6 ky tu' });
    }

    const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ten dang nhap nay da co nguoi dung' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await sql`
      INSERT INTO users (username, password_hash) VALUES (${username}, ${passwordHash})
      RETURNING id, username
    `;
    const user = inserted.rows[0];

    await sql`
      INSERT INTO progress (user_id, state) VALUES (${user.id}, '{}'::jsonb)
      ON CONFLICT (user_id) DO NOTHING
    `;

    const token = signToken({ uid: user.id, username: user.username });
    setAuthCookie(res, token);
    res.status(200).json({ username: user.username });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Loi may chu, thu lai sau' });
  }
};
