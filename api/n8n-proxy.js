const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = 'https://loscroods.app.n8n.cloud/api/v1';

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  const n8nEndpoint = pathname.replace('/api/n8n-proxy', '');
  const n8nUrl = `${N8N_BASE_URL}${n8nEndpoint}`;

  try {
    const n8nRes = await fetch(n8nUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${N8N_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined,
    });

    const data = await n8nRes.json();
    res.status(n8nRes.status).json(data);
  } catch (error) {
    console.error('n8n proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy request' });
  }
};
