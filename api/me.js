const { getUserFromReq } = require('../lib/auth');

module.exports = async (req, res) => {
  const user = getUserFromReq(req);
  if (!user) return res.status(401).json({ error: 'Chua dang nhap' });
  res.status(200).json({ username: user.username });
};
