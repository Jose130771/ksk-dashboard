import { useState, useEffect } from "react";
import { callClaude, extraerJSON, ERR } from "./claude";
import { getToken, sessionExpired } from "./auth";
import { makeT, getSavedLang } from "./i18n";

// FICHA DE RECOGIDA
//
// Antes de mandar un camión a por un coche hay que saber si el coche está, dónde
// está exactamente, si rueda y quién abre. Cuando eso no se confirma, el camión
// sale para nada. Esta pantalla hace tres cosas:
//   1. Genera la solicitud al cliente en su idioma, con las preguntas que importan.
//   2. Analiza lo que conteste (pegado tal cual) y lo convierte en ficha + semáforo.
//   3. Guarda el registro para poder contar los viajes que se han evitado.
//
// Los textos de esta pantalla van en este diccionario interno y no en i18n.js,
// para no mezclar 50 claves de un solo módulo con las del resto del panel.
const UI = {
  fr: {
    title: "🛠️ Fiche de ramassage",
    intro: "Confirmez l'état du véhicule AVANT d'envoyer le camion.",
    secRequest: "1. Demande au client",
    secAnalyze: "2. Réponse du client",
    secLog: "3. Registre",
    client: "Client / assurance",
    ref: "Référence sinistre / dossier",
    vehicle: "Véhicule (marque, modèle, plaque)",
    contact: "Personne de contact",
    phone: "Téléphone (WhatsApp)",
    email: "E-mail",
    zone: "Zone / adresse approximative",
    msgLang: "Langue du message",
    generate: "✉️ Générer la demande",
    generating: "Génération...",
    copy: "📋 Copier",
    copied: "Copié",
    sendMail: "📧 Envoyer par e-mail",
    sending: "Envoi...",
    whatsapp: "💬 Ouvrir dans WhatsApp",
    pasteHere: "Collez ici la réponse du client (e-mail, WhatsApp, notes d'appel)...",
    analyze: "🔍 Analyser la réponse",
    analyzing: "Analyse...",
    missing: "Il manque encore :",
    means: "Moyen nécessaire",
    save: "💾 Enregistrer dans le registre",
    saved: "Enregistré",
    noLog: "Aucune fiche enregistrée pour l'instant.",
    fiches: "fiches",
    avoided: "trajets évités",
    export: "⬇️ Exporter CSV",
    clear: "🗑️ Vider le registre",
    confirmClear: "Vider tout le registre ?",
    needPhone: "Saisissez un téléphone pour WhatsApp",
    needEmail: "Saisissez un e-mail",
    needMsg: "Générez d'abord la demande",
    needAnswer: "Collez d'abord la réponse du client",
    badAnswer: "Réponse illisible, réessayez ou complétez à la main.",
    sentTo: "E-mail envoyé à",
    error: "Erreur :",
    green: "PRÊT — le camion peut partir",
    amber: "INCOMPLET — il manque des données",
    red: "NE PAS PARTIR",
    fields: {
      listo: "Disponible", fecha_disponible: "Disponible à partir du", direccion_exacta: "Adresse exacte",
      horario: "Horaires", contacto_sitio: "Contact sur place", rueda: "Roule / roulable",
      llaves: "Clés", ruedas_ok: "Pneus OK", danos_carga: "Dégâts gênant le chargement",
      documentacion: "Documents", autorizacion_salida: "Autorisation de sortie",
    },
  },
  es: {
    title: "🛠️ Ficha de recogida",
    intro: "Confirma el estado del coche ANTES de mandar el camión.",
    secRequest: "1. Solicitud al cliente",
    secAnalyze: "2. Respuesta del cliente",
    secLog: "3. Registro",
    client: "Cliente / aseguradora",
    ref: "Referencia siniestro / expediente",
    vehicle: "Vehículo (marca, modelo, matrícula)",
    contact: "Persona de contacto",
    phone: "Teléfono (WhatsApp)",
    email: "Email",
    zone: "Zona / dirección aproximada",
    msgLang: "Idioma del mensaje",
    generate: "✉️ Generar la solicitud",
    generating: "Generando...",
    copy: "📋 Copiar",
    copied: "Copiado",
    sendMail: "📧 Enviar por email",
    sending: "Enviando...",
    whatsapp: "💬 Abrir en WhatsApp",
    pasteHere: "Pega aquí la respuesta del cliente (email, WhatsApp, notas de la llamada)...",
    analyze: "🔍 Analizar la respuesta",
    analyzing: "Analizando...",
    missing: "Todavía falta:",
    means: "Medio necesario",
    save: "💾 Guardar en el registro",
    saved: "Guardado",
    noLog: "Todavía no hay fichas guardadas.",
    fiches: "fichas",
    avoided: "viajes evitados",
    export: "⬇️ Exportar CSV",
    clear: "🗑️ Vaciar registro",
    confirmClear: "¿Vaciar todo el registro?",
    needPhone: "Pon un teléfono para WhatsApp",
    needEmail: "Pon un email",
    needMsg: "Genera primero la solicitud",
    needAnswer: "Pega primero la respuesta del cliente",
    badAnswer: "Respuesta ilegible, prueba otra vez o complétala a mano.",
    sentTo: "Email enviado a",
    error: "Error:",
    green: "LISTO — el camión puede salir",
    amber: "INCOMPLETO — faltan datos",
    red: "NO SALIR",
    fields: {
      listo: "Disponible", fecha_disponible: "Disponible desde", direccion_exacta: "Dirección exacta",
      horario: "Horario", contacto_sitio: "Contacto en el sitio", rueda: "Rueda / remolcable",
      llaves: "Llaves", ruedas_ok: "Ruedas OK", danos_carga: "Daños que estorban la carga",
      documentacion: "Documentación", autorizacion_salida: "Autorización de salida",
    },
  },
  en: {
    title: "🛠️ Pickup check",
    intro: "Confirm the vehicle's status BEFORE sending the truck.",
    secRequest: "1. Request to the client",
    secAnalyze: "2. Client's reply",
    secLog: "3. Log",
    client: "Client / insurer",
    ref: "Claim / file reference",
    vehicle: "Vehicle (make, model, plate)",
    contact: "Contact person",
    phone: "Phone (WhatsApp)",
    email: "Email",
    zone: "Area / approximate address",
    msgLang: "Message language",
    generate: "✉️ Generate the request",
    generating: "Generating...",
    copy: "📋 Copy",
    copied: "Copied",
    sendMail: "📧 Send by email",
    sending: "Sending...",
    whatsapp: "💬 Open in WhatsApp",
    pasteHere: "Paste the client's reply here (email, WhatsApp, call notes)...",
    analyze: "🔍 Analyse the reply",
    analyzing: "Analysing...",
    missing: "Still missing:",
    means: "Equipment needed",
    save: "💾 Save to the log",
    saved: "Saved",
    noLog: "No checks saved yet.",
    fiches: "checks",
    avoided: "trips avoided",
    export: "⬇️ Export CSV",
    clear: "🗑️ Clear the log",
    confirmClear: "Clear the whole log?",
    needPhone: "Enter a phone number for WhatsApp",
    needEmail: "Enter an email address",
    needMsg: "Generate the request first",
    needAnswer: "Paste the client's reply first",
    badAnswer: "Could not read the reply, try again or fill it in by hand.",
    sentTo: "Email sent to",
    error: "Error:",
    green: "READY — the truck can go",
    amber: "INCOMPLETE — data missing",
    red: "DO NOT GO",
    fields: {
      listo: "Available", fecha_disponible: "Available from", direccion_exacta: "Exact address",
      horario: "Opening hours", contacto_sitio: "Contact on site", rueda: "Rolls / towable",
      llaves: "Keys", ruedas_ok: "Tyres OK", danos_carga: "Damage blocking loading",
      documentacion: "Paperwork", autorizacion_salida: "Release authorisation",
    },
  },
};

const MSG_LANGS = [
  { code: "fr", label: "🇫🇷 Français", name: "francés" },
  { code: "es", label: "🇪🇸 Español", name: "español" },
  { code: "en", label: "🇬🇧 English", name: "inglés" },
  { code: "de", label: "🇩🇪 Deutsch", name: "alemán" },
  { code: "it", label: "🇮🇹 Italiano", name: "italiano" },
  { code: "ro", label: "🇷🇴 Română", name: "rumano" },
];

const LOG_KEY = "pickup_log_v1";

const SEMAFORO = {
  verde: { color: "#10b981", icon: "🟢" },
  ambar: { color: "#f59e0b", icon: "🟡" },
  rojo: { color: "#ef4444", icon: "🔴" },
};

const box = {
  width: "100%", padding: "10px 14px", background: "#1a2332",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
  color: "#fff", fontSize: 13, boxSizing: "border-box",
};
const labelStyle = { color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 6 };
const sectionTitle = { color: "#e2e8f0", fontSize: 14, fontWeight: 700, margin: "24px 0 12px" };

function btn(bg, border, color, disabled) {
  return {
    padding: "8px 16px", borderRadius: 8, background: disabled ? "rgba(255,255,255,0.05)" : bg,
    border: `1px solid ${disabled ? "#475569" : border}`, color: disabled ? "#94a3b8" : color,
    fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
  };
}

function leerLog() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

export default function PickupCheck({ lang = "fr" }) {
  const u = UI[lang] || UI.fr;
  const t = makeT(getSavedLang());

  const [client, setClient] = useState("");
  const [ref, setRef] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [zone, setZone] = useState("");
  const [msgLang, setMsgLang] = useState("fr");

  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const [answer, setAnswer] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [ficha, setFicha] = useState(null);

  const [log, setLog] = useState([]);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => { setLog(leerLog()); }, []);

  const guardarLog = (nuevo) => {
    setLog(nuevo);
    try { localStorage.setItem(LOG_KEY, JSON.stringify(nuevo)); } catch (e) { /* navegador sin storage */ }
  };

  // --- 1. Generar la solicitud -------------------------------------------------
  const generate = async () => {
    if (!vehicle) return;
    setGenerating(true);
    const nombreIdioma = MSG_LANGS.find(l => l.code === msgLang)?.name || "francés";
    const prompt = `Redacta un mensaje corto y profesional de KSK Transport en ${nombreIdioma}, dirigido al cliente, para confirmar los datos de una recogida de vehículo ANTES de enviar el camión portacoches.

Datos que ya tenemos:
- Cliente/aseguradora: ${client || "no indicado"}
- Referencia: ${ref || "no indicada"}
- Vehículo: ${vehicle}
- Persona de contacto: ${contact || "no indicada"}
- Zona aproximada: ${zone || "no indicada"}

El mensaje debe empezar con una línea "Asunto:" y después pedir, en una lista numerada y breve, EXACTAMENTE estos puntos:
1. Si el vehículo ya está disponible y desde qué fecha.
2. Dirección exacta donde está (depósito, taller o domicilio), con nombre del sitio.
3. Horario de apertura y días.
4. Nombre y teléfono de quien nos atiende allí.
5. Si el vehículo rueda y se puede empujar/arrastrar, o si está bloqueado (ruedas, dirección o frenos).
6. Si tiene las llaves disponibles.
7. Daños que puedan impedir subirlo a la rampa.
8. Si la documentación y la autorización de salida están listas.

Añade una frase final explicando que sin estos datos no podemos garantizar la recogida y que el camión podría desplazarse en balde. Tono cordial y directo, sin florituras. No inventes datos que no te he dado. Devuelve SOLO el mensaje.`;

    const res = await callClaude(prompt, lang);
    setMessage(res);
    setGenerating(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // WhatsApp sin API: abre la app con el texto ya escrito y lo envía una persona.
  // Es la vía legal mientras la empresa no tenga WhatsApp Business Platform.
  const openWhatsApp = () => {
    if (!message) { alert(u.needMsg); return; }
    const num = phone.replace(/[^0-9]/g, "");
    if (!num) { alert(u.needPhone); return; }
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  };

  const sendMail = async () => {
    if (sending) return;
    if (!message) { alert(u.needMsg); return; }
    if (message.startsWith(ERR)) { alert(t("notify_alertGenFailed")); return; }
    if (!email) { alert(u.needEmail); return; }
    const token = getToken();
    if (!token) { sessionExpired(t("session_expired")); return; }

    const ls = message.split("\n");
    const subjectLine = ls.find(l => /asunto:|objet\s*:|subject:|betreff:|oggetto:|subiect:/i.test(l)) || "";
    const subject = subjectLine.replace(/.*(asunto|objet|subject|betreff|oggetto|subiect)\s*:\s*/i, "").trim()
      || `KSK Transport — ${vehicle}`;

    setSending(true);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: email, subject, body: message }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { sessionExpired(t("session_expired")); return; }
      if (res.ok && data.success) alert(`${u.sentTo} ${email}`);
      else alert(`${u.error} ${data.error || `HTTP ${res.status}`}`);
    } catch (e) {
      alert(`${u.error} ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  // --- 2. Analizar la respuesta ------------------------------------------------
  const analyze = async () => {
    if (!answer.trim()) { alert(u.needAnswer); return; }
    setAnalyzing(true);
    const prompt = `Analiza la respuesta de un cliente sobre la recogida de un vehículo y extrae los datos en JSON.

Vehículo: ${vehicle || "no indicado"}
Referencia: ${ref || "no indicada"}

RESPUESTA DEL CLIENTE (puede estar en cualquier idioma, ser un email, un WhatsApp o notas de una llamada):
"""
${answer}
"""

Reglas estrictas:
- Usa SOLO lo que diga el texto. Lo que no aparezca va como "desconocido" o cadena vacía. No deduzcas ni inventes.
- "rueda" es "no" si el coche está bloqueado, siniestrado de forma que no gira o sin ruedas.
- semaforo: "rojo" si el vehículo no está disponible aún, o si hay algo que impide la recogida; "ambar" si falta cualquier dato imprescindible (dirección exacta, horario, contacto, si rueda, llaves o autorización); "verde" solo si están todos.
- medio: "portacoches" si rueda con normalidad, "plataforma_grua" si no rueda o está bloqueado, "desconocido" si no se sabe.
- "faltan" es la lista de datos imprescindibles que siguen sin estar, escritos en ${MSG_LANGS.find(l => l.code === lang)?.name || "francés"}.

Devuelve SOLO este JSON, sin backticks ni explicaciones:
{"listo":"si|no|desconocido","fecha_disponible":"","direccion_exacta":"","horario":"","contacto_sitio":"","rueda":"si|no|desconocido","llaves":"si|no|desconocido","ruedas_ok":"si|no|desconocido","danos_carga":"","documentacion":"si|no|desconocido","autorizacion_salida":"si|no|desconocido","faltan":[],"semaforo":"verde|ambar|rojo","motivo":"","medio":"portacoches|plataforma_grua|desconocido"}`;

    const res = await callClaude(prompt, lang, { maxTokens: 1200 });
    setAnalyzing(false);
    if (res.startsWith(ERR)) { alert(res); return; }
    const json = extraerJSON(res);
    if (!json) { alert(u.badAnswer); return; }
    setFicha(json);
  };

  const saveToLog = () => {
    if (!ficha) return;
    const entry = {
      fecha: new Date().toISOString(),
      cliente: client, ref, vehiculo: vehicle,
      semaforo: ficha.semaforo || "ambar",
      medio: ficha.medio || "desconocido",
      motivo: ficha.motivo || "",
      // Una ficha en rojo o ámbar es un camión que NO ha salido para nada.
      evitado: ficha.semaforo === "rojo" || ficha.semaforo === "ambar",
    };
    guardarLog([entry, ...log]);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const exportCSV = () => {
    const cab = "fecha;cliente;referencia;vehiculo;semaforo;medio;motivo;viaje_evitado";
    const filas = log.map(e => [
      new Date(e.fecha).toLocaleString(), e.cliente, e.ref, e.vehiculo,
      e.semaforo, e.medio, String(e.motivo).replace(/[;\n]/g, " "), e.evitado ? "si" : "no",
    ].join(";"));
    const blob = new Blob(["﻿" + [cab, ...filas].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recogidas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const evitados = log.filter(e => e.evitado).length;
  const sem = ficha ? (SEMAFORO[ficha.semaforo] || SEMAFORO.ambar) : null;
  const semText = ficha ? (ficha.semaforo === "verde" ? u.green : ficha.semaforo === "rojo" ? u.red : u.amber) : "";

  const campos = ["listo", "fecha_disponible", "direccion_exacta", "horario", "contacto_sitio",
    "rueda", "llaves", "ruedas_ok", "danos_carga", "documentacion", "autorizacion_salida"];

  return (
    <div>
      <h2 style={{ color: "#f97316", marginBottom: 6, fontFamily: "'Rajdhani', sans-serif", fontSize: 22 }}>{u.title}</h2>
      <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 4 }}>{u.intro}</p>

      {/* 1. Solicitud */}
      <h3 style={sectionTitle}>{u.secRequest}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div><label style={labelStyle}>{u.client}:</label><input style={box} value={client} onChange={e => setClient(e.target.value)} /></div>
        <div><label style={labelStyle}>{u.ref}:</label><input style={box} value={ref} onChange={e => setRef(e.target.value)} /></div>
        <div><label style={labelStyle}>{u.vehicle}:</label><input style={box} value={vehicle} onChange={e => setVehicle(e.target.value)} /></div>
        <div><label style={labelStyle}>{u.contact}:</label><input style={box} value={contact} onChange={e => setContact(e.target.value)} /></div>
        <div><label style={labelStyle}>{u.phone}:</label><input style={box} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+34 600 000 000" /></div>
        <div><label style={labelStyle}>{u.email}:</label><input style={box} value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@email.com" /></div>
        <div><label style={labelStyle}>{u.zone}:</label><input style={box} value={zone} onChange={e => setZone(e.target.value)} /></div>
        <div>
          <label style={labelStyle}>{u.msgLang}:</label>
          <select style={box} value={msgLang} onChange={e => setMsgLang(e.target.value)}>
            {MSG_LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
      </div>

      <button onClick={generate} disabled={generating || !vehicle}
        style={btn("linear-gradient(135deg, #f97316, #ea580c)", "#f97316", "#000", generating || !vehicle)}>
        {generating ? u.generating : u.generate}
      </button>

      {message && (
        <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: "rgba(249,115,22,0.08)", border: "1px solid #f97316" }}>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={12}
            style={{ ...box, background: "transparent", border: "none", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button onClick={copy} style={btn("rgba(249,115,22,0.2)", "#f97316", "#f97316")}>{copied ? u.copied : u.copy}</button>
            <button onClick={sendMail} disabled={sending} style={btn("rgba(59,130,246,0.2)", "#3b82f6", "#3b82f6", sending)}>
              {sending ? u.sending : u.sendMail}
            </button>
            <button onClick={openWhatsApp} style={btn("rgba(37,211,102,0.2)", "#25d366", "#25d366")}>{u.whatsapp}</button>
          </div>
        </div>
      )}

      {/* 2. Respuesta */}
      <h3 style={sectionTitle}>{u.secAnalyze}</h3>
      <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={6} placeholder={u.pasteHere}
        style={{ ...box, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit", marginBottom: 12 }} />
      <button onClick={analyze} disabled={analyzing || !answer.trim()}
        style={btn("linear-gradient(135deg, #3b82f6, #1d4ed8)", "#3b82f6", "#fff", analyzing || !answer.trim())}>
        {analyzing ? u.analyzing : u.analyze}
      </button>

      {ficha && (
        <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${sem.color}` }}>
          <div style={{ color: sem.color, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            {sem.icon} {semText}
          </div>
          {ficha.motivo && <div style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 12 }}>{ficha.motivo}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginBottom: 12 }}>
            {campos.map(c => (
              <div key={c} style={{ fontSize: 12, display: "flex", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "4px 0" }}>
                <span style={{ color: "#64748b", minWidth: 150 }}>{u.fields[c]}:</span>
                <span style={{ color: !ficha[c] || ficha[c] === "desconocido" ? "#f59e0b" : "#e2e8f0" }}>
                  {ficha[c] || "—"}
                </span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
            <strong style={{ color: "#cbd5e1" }}>{u.means}:</strong>{" "}
            {ficha.medio === "plataforma_grua" ? "🚨 plataforma / grúa" : ficha.medio === "portacoches" ? "🚛 portacoches" : "❓"}
          </div>

          {Array.isArray(ficha.faltan) && ficha.faltan.length > 0 && (
            <div style={{ padding: 12, borderRadius: 8, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", marginBottom: 12 }}>
              <div style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{u.missing}</div>
              <ul style={{ paddingLeft: 18, color: "#e2e8f0", fontSize: 13, lineHeight: 1.7 }}>
                {ficha.faltan.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}

          <button onClick={saveToLog} style={btn("rgba(16,185,129,0.2)", "#10b981", "#10b981")}>
            {justSaved ? u.saved : u.save}
          </button>
        </div>
      )}

      {/* 3. Registro */}
      <h3 style={sectionTitle}>{u.secLog}</h3>
      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: "#cbd5e1" }}>
          <strong style={{ color: "#fff", fontSize: 20 }}>{log.length}</strong> {u.fiches}
          {"  ·  "}
          <strong style={{ color: "#10b981", fontSize: 20 }}>{evitados}</strong> {u.avoided}
        </div>
        {log.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={exportCSV} style={btn("rgba(255,255,255,0.06)", "#475569", "#cbd5e1")}>{u.export}</button>
            <button onClick={() => { if (window.confirm(u.confirmClear)) guardarLog([]); }}
              style={btn("rgba(239,68,68,0.15)", "#ef4444", "#ef4444")}>{u.clear}</button>
          </div>
        )}
      </div>

      {log.length === 0 ? (
        <p style={{ color: "#64748b", fontSize: 13 }}>{u.noLog}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {log.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
              <span>{(SEMAFORO[e.semaforo] || SEMAFORO.ambar).icon}</span>
              <span style={{ color: "#64748b", minWidth: 120 }}>{new Date(e.fecha).toLocaleString()}</span>
              <span style={{ color: "#e2e8f0", flex: 1 }}>{[e.vehiculo, e.cliente, e.ref].filter(Boolean).join(" · ")}</span>
              {e.evitado && <span style={{ color: "#10b981" }}>✔</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
