export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ANTHROPIC_API_KEY es solo del servidor (sin prefijo REACT_APP_ para que CRA no la meta en el bundle)
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.REACT_APP_ANTHROPIC_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'Falta ANTHROPIC_API_KEY en las variables de entorno de Vercel' } });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: { message: `Fallo al conectar con Anthropic: ${err.message}` } });
  }
}