const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Solo usuarios logueados pueden enviar emails (evita que usen tu Gmail para spam)
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
  } catch (e) {
    return res.status(401).json({ error: 'Sesión caducada o no válida. Cierra sesión y vuelve a entrar.' });
  }

  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Faltan campos: to, subject, body' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: `KSK Transport <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text: body,
    });
    return res.status(200).json({ success: true, message: 'Email enviado correctamente' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
