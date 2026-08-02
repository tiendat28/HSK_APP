const { sql, ensureSchema } = require('../lib/db');
const { getUserFromReq } = require('../lib/auth');

module.exports = async (req, res) => {
  const user = getUserFromReq(req);
  if (!user) return res.status(401).json({ error: 'Chua dang nhap' });

  try {
    await ensureSchema();

    if (req.method === 'GET') {
      const result = await sql`SELECT state FROM progress WHERE user_id = ${user.uid}`;
      const state = result.rows[0] ? result.rows[0].state : {};
      return res.status(200).json({ state });
    }

    if (req.method === 'POST') {
      const { state } = req.body || {};
      if (typeof state !== 'object' || state === null || Array.isArray(state)) {
        return res.status(400).json({ error: 'State khong hop le' });
      }
      await sql`
        INSERT INTO progress (user_id, state, updated_at)
        VALUES (${user.uid}, ${JSON.stringify(state)}::jsonb, NOW())
        ON CONFLICT (user_id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
      `;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('progress error:', err);
    res.status(500).json({ error: 'Loi may chu, thu lai sau' });
  }
};
