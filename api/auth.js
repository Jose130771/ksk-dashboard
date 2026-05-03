const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret-key';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user, pass } = req.body;

  if (user !== process.env.DASH_USER || pass !== process.env.DASH_PASS) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ user }, SECRET, { expiresIn: '8h' });

  return res.json({ token, expiresIn: 28800 });
};
