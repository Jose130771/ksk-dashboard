// Llamada a la IA a través del proxy del servidor (/api/anthropic).
// Vive en su propio módulo para que la puedan usar varias pantallas sin importarse
// unas a otras. La API key nunca sale del servidor.

import { makeT, getSavedLang } from "./i18n";
import { getToken, sessionExpired } from "./auth";
import { AI_LANG_NAME } from "./i18n";

// Marca con la que empiezan los textos de error: así quien llame sabe que la
// generación ha fallado sin depender del idioma del mensaje.
export const ERR = "⚠️";

export async function callClaude(prompt, lang = "fr", opts = {}) {
  const tt = makeT(getSavedLang());

  const token = getToken();
  if (!token) {
    sessionExpired(tt("session_expired"));
    return `${ERR} ${tt("session_expired")}`;
  }

  let response;
  let data = {};
  try {
    // prompt puede ser texto o una lista de bloques (PDF, fotos y texto).
    // opts.beta va como cabecera anthropic-beta y opts.extra se añade tal cual al cuerpo.
    response = await fetch("/api/anthropic", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(opts.beta ? { "anthropic-beta": opts.beta } : {}),
      },
      body: JSON.stringify({
        model: opts.model || "claude-sonnet-5",
        max_tokens: opts.maxTokens || 1000,
        system: opts.system ||
          `Eres un experto en logística de transporte internacional de automóviles en Europa. Responde SIEMPRE en ${AI_LANG_NAME[lang] || "français"}, de forma clara y profesional.`,
        messages: [{ role: "user", content: prompt }],
        ...(opts.extra || {}),
      }),
    });
    data = await response.json().catch(() => ({}));
  } catch (e) {
    return `${ERR} ${tt("notify_error")} ${e.message}`;
  }

  // El servidor ha rechazado el token: sesión caducada, de vuelta al login.
  if (response.status === 401) {
    sessionExpired(tt("session_expired"));
    return `${ERR} ${tt("session_expired")}`;
  }

  // El modelo puede devolver un bloque "thinking" antes del texto: hay que buscar el de tipo "text".
  const texto = data.content?.find((b) => b.type === "text")?.text;
  if (!response.ok || !texto) {
    const motivo = data.error?.message || `HTTP ${response.status}`;
    return `${ERR} ${tt("notify_error")} ${motivo}`;
  }
  return texto;
}

// Saca el primer objeto JSON de una respuesta, aunque venga con backticks o texto alrededor.
export function extraerJSON(texto) {
  const limpio = String(texto).replace(/```json|```/g, "").trim();
  const match = limpio.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    return null;
  }
}
