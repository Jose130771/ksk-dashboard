const Anthropic = require('@anthropic-ai/sdk');
const nodemailer = require('nodemailer');

const ALERTAS = [
  {
    email: process.env.ALERT_EMAIL_1 || "",
    coche: "BMW 330e",
    precioMax: 20000,
    scoreMin: 8,
    zona: "Europa",
    fuentes: "Wallapop, AutoScout24, Mobile.de",
    estrategia: "Flip rápido"
  },
];

async function buscarChollos(alerta) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [{
      role: "user",
      content: `Eres experto en compraventa de coches. Busca oportunidades con estos criterios:
Vehículo: ${alerta.coche}, Precio máx: ${alerta.precioMax}€, Zona: ${alerta.zona}, Fuentes: ${alerta.fuentes}
Devuelve SOLO JSON sin backticks:
{"chollos":[{"titulo":"BMW 330e Sport 2019","precio_venta":17500,"precio_mercado":22000,"ahorro":4500,"margen_reventa":3200,"año":2019,"km":89000,"combustible":"Híbrido","zona":"Madrid","fuente":"AutoScout24","url":"https://www.autoscout24.es","score":8.7,"motivo":"19% bajo mercado","riesgos":"Revisar batería"}]}`
    }]
  });
  const raw = response.content[0].text.replace(/```json|```/g, '').trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON');
  return JSON.parse(match[0]);
}

async function enviarTelegram(chatId, mensaje) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: mensaje, parse_mode: 'HTML' })
  });
  return res.json();
}

async function enviarEmail(to, subject, body) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: `KSK Car Hunter <${process.env.GMAIL_USER}>`,
    to, subject, text: body,
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || 'ksk-cron-2024';
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const resultados = [];
  for (const alerta of ALERTAS) {
    try {
      const { chollos } = await buscarChollos(alerta);
      const top = chollos.filter(c => c.score >= alerta.scoreMin);

      if (top.length > 0) {
        // Telegram — instantáneo
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (chatId) {
          const msg = `🚗 <b>Car Hunter — ${top.length} chollo(s) encontrado(s)</b>\n\n` +
            top.map((c, i) => `${i+1}. <b>${c.titulo}</b>
💰 €${c.precio_venta.toLocaleString()} <s>€${c.precio_mercado.toLocaleString()}</s>
📈 Margen: +€${c.margen_reventa.toLocaleString()}
⭐ Score: ${c.score}/10
📍 ${c.zona} · ${c.fuente}
✅ ${c.motivo}
⚠️ ${c.riesgos}
🔗 ${c.url}`).join('\n\n―――――――――――\n\n') +
            `\n\n🔎 Ver dashboard: ksk-dashboard-iwzs.vercel.app`;
          await enviarTelegram(chatId, msg);
        }

        // Email también
        if (alerta.email) {
          const subject = `🚗 Car Hunter: ${top.length} chollo(s) — ${alerta.coche}`;
          const body = top.map((c, i) => `${i+1}. ${c.titulo}
   💰 €${c.precio_venta.toLocaleString()} (mercado: €${c.precio_mercado.toLocaleString()})
   📈 Margen: +€${c.margen_reventa.toLocaleString()}
   ⭐ Score: ${c.score}/10
   📍 ${c.zona} · ${c.fuente}
   ✅ ${c.motivo}
   ⚠️ ${c.riesgos}
   🔗 ${c.url}`).join('\n\n---\n\n');
          await enviarEmail(alerta.email, subject, body);
        }

        resultados.push({ coche: alerta.coche, enviado: true, chollos: top.length });
      } else {
        resultados.push({ coche: alerta.coche, enviado: false, motivo: 'Sin chollos suficientes' });
      }
    } catch (error) {
      resultados.push({ coche: alerta.coche, enviado: false, error: error.message });
    }
  }
  return res.status(200).json({ success: true, resultados, ejecutado: new Date().toISOString() });
}
