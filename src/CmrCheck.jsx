import { useState } from "react";
import { callClaude, extraerJSON, ERR } from "./claude";

// COTEJO ORDEN + CMR
//
// La oficina manda la "Ordre de transport" en PDF (hecha por ordenador, fiable) y
// el chófer devuelve por WhatsApp fotos de los CMR, muchas veces escritos a mano.
// Esta pantalla los compara: coche por coche, ¿hay CMR?, ¿coincide el bastidor?,
// ¿firmó el destinatario?, ¿hay reservas? Así la oficina solo mira lo que falla.
//
// Regla de la casa: nada inventado. Lo que no se lee se marca como dudoso.

const UI = {
  fr: {
    title: "🔎 Contrôle ordre + CMR",
    intro: "Glissez l'ordre de transport (PDF) et les photos des CMR. L'agent compare tout et montre seulement ce qui ne va pas.",
    drop: "Glissez ici les PDF et les photos, ou cliquez pour choisir",
    hint: "Copie verte = après déchargement · copie bleue = avant chargement",
    orders: "Ordres", photos: "Photos CMR",
    check: "🔎 Lancer le contrôle", checking: "Contrôle en cours… (jusqu'à 1-2 min)",
    clear: "🗑️ Vider",
    needBoth: "Ajoutez au moins un ordre (PDF) et une photo de CMR.",
    tooBig: "Trop de fichiers d'un coup (max ~4 Mo). Faites le contrôle en plusieurs fois.",
    badAnswer: "Réponse illisible de l'IA, réessayez.",
    order: "Ordre", car: "Véhicule", vinOrder: "VIN ordre", vinCmr: "VIN CMR", plate: "Immat.", cmr: "CMR", phase: "Phase", notes: "Notes",
    problems: "À vérifier", noProblems: "Rien à signaler",
    orphan: "CMR sans ordre correspondant",
    deca: "🇪🇸 Transport intérieur en Espagne : document de contrôle électronique obligatoire",
    copy: "📋 Copier le résumé pour WhatsApp", copied: "Copié",
    phases: { carga: "chargement", descarga: "déchargement", intermedio: "point relais", desconocida: "?", sin_cmr: "pas de CMR" },
    notesLabel: "Notes du chauffeur / du bureau (facultatif)",
    notesPh: "Ex. : la Mercedes GLC laissée le 9/11 au parking de … pour qu'un collègue la récupère",
    waiting: "En attente",
  },
  es: {
    title: "🔎 Cotejo orden + CMR",
    intro: "Arrastra la orden de transporte (PDF) y las fotos de los CMR. El agente lo compara todo y te enseña solo lo que falla.",
    drop: "Arrastra aquí los PDF y las fotos, o pulsa para elegirlos",
    hint: "Copia verde = después de descargar · copia azul = antes de cargar",
    orders: "Órdenes", photos: "Fotos CMR",
    check: "🔎 Hacer el cotejo", checking: "Cotejando… (hasta 1-2 min)",
    clear: "🗑️ Vaciar",
    needBoth: "Añade al menos una orden (PDF) y una foto de CMR.",
    tooBig: "Demasiados archivos de golpe (máx. ~4 MB). Haz el cotejo en varias veces.",
    badAnswer: "La IA ha devuelto algo ilegible, inténtalo otra vez.",
    order: "Orden", car: "Vehículo", vinOrder: "Bastidor orden", vinCmr: "Bastidor CMR", plate: "Matrícula", cmr: "CMR", phase: "Fase", notes: "Notas",
    problems: "A revisar", noProblems: "Nada que señalar",
    orphan: "CMR sin orden que le corresponda",
    deca: "🇪🇸 Transporte dentro de España: documento de control electrónico obligatorio",
    copy: "📋 Copiar resumen para WhatsApp", copied: "Copiado",
    phases: { carga: "carga", descarga: "descarga", intermedio: "punto intermedio", desconocida: "?", sin_cmr: "sin CMR" },
    notesLabel: "Notas del chófer / de la oficina (opcional)",
    notesPh: "Ej.: el Mercedes GLC lo dejé el 9/11 en el parking de … para que lo recoja otro compañero",
    waiting: "En espera",
  },
  en: {
    title: "🔎 Order + CMR check",
    intro: "Drop the transport order (PDF) and the CMR photos. The agent compares everything and shows only what is wrong.",
    drop: "Drop the PDFs and photos here, or click to choose them",
    hint: "Green copy = after unloading · blue copy = before loading",
    orders: "Orders", photos: "CMR photos",
    check: "🔎 Run the check", checking: "Checking… (up to 1-2 min)",
    clear: "🗑️ Clear",
    needBoth: "Add at least one order (PDF) and one CMR photo.",
    tooBig: "Too many files at once (max ~4 MB). Split the check.",
    badAnswer: "Unreadable answer from the AI, try again.",
    order: "Order", car: "Vehicle", vinOrder: "Order VIN", vinCmr: "CMR VIN", plate: "Plate", cmr: "CMR", phase: "Phase", notes: "Notes",
    problems: "To check", noProblems: "Nothing to report",
    orphan: "CMR without a matching order",
    deca: "🇪🇸 Domestic transport in Spain: electronic control document required",
    copy: "📋 Copy summary for WhatsApp", copied: "Copied",
    phases: { carga: "loading", descarga: "unloading", intermedio: "relay point", desconocida: "?", sin_cmr: "no CMR" },
    notesLabel: "Driver / office notes (optional)",
    notesPh: "E.g. the Mercedes GLC was left on 9/11 at … parking for a colleague to pick up",
    waiting: "Waiting",
  },
};

const AI_LANG = { fr: "français", es: "español", en: "English" };

const SEMAFORO = {
  verde: { color: "#10b981", icon: "🟢" },
  naranja: { color: "#f59e0b", icon: "🟠" },
  rojo: { color: "#ef4444", icon: "🔴" },
  info: { color: "#64748b", icon: "ℹ️" },
};

// Vercel corta las peticiones de más de 4,5 MB; dejamos margen para el texto.
const MAX_BYTES = 4 * 1024 * 1024;

// Esquema de la respuesta: con salida estructurada la IA devuelve siempre este JSON.
const ESTADO = { type: "string", enum: ["verde", "naranja", "rojo"] };
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["estado_global", "resumen", "ordenes", "cmrs_sin_orden", "texto_whatsapp"],
  properties: {
    estado_global: ESTADO,
    resumen: { type: "string" },
    ordenes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["numero", "estado", "transporte_interior_espana", "coches", "problemas"],
        properties: {
          numero: { type: "string" },
          estado: ESTADO,
          transporte_interior_espana: { type: "boolean" },
          coches: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["modelo", "vin_orden", "vin_cmr", "matricula", "cmr_numero", "fase", "espera", "estado", "notas"],
              properties: {
                modelo: { type: "string" },
                vin_orden: { type: "string" },
                vin_cmr: { type: "string" },
                matricula: { type: "string" },
                cmr_numero: { type: "string" },
                fase: { type: "string", enum: ["carga", "descarga", "intermedio", "desconocida", "sin_cmr"] },
                espera: { type: "string" },
                estado: ESTADO,
                notas: { type: "string" },
              },
            },
          },
          problemas: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["gravedad", "texto"],
              properties: {
                gravedad: { type: "string", enum: ["rojo", "naranja", "info"] },
                texto: { type: "string" },
              },
            },
          },
        },
      },
    },
    cmrs_sin_orden: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["cmr_numero", "descripcion"],
        properties: { cmr_numero: { type: "string" }, descripcion: { type: "string" } },
      },
    },
    texto_whatsapp: { type: "string" },
  },
};

const instrucciones = (lang) => `Eres el agente de control documental de KSK Transport (transporte de vehículos en portacoches por Europa).
Recibes una o varias ÓRDENES DE TRANSPORTE en PDF (generadas por ordenador, son la referencia fiable) y FOTOS de CMR (a menudo escritos a mano).
Tu trabajo: comparar cada coche de cada orden con los CMR y señalar SOLO lo que falla o falta, para que la oficina no tenga que revisarlo todo.

REGLAS ESTRICTAS
- Nada inventado. Si algo no se lee con seguridad en la foto, dilo ("dudoso: se lee X o Y") en vez de adivinar. Si un dato no aparece, déjalo vacío.
- Bastidor (VIN): la orden a veces trae solo el final (un "*" indica que está cortado). Compáralo por el final, carácter a carácter. Si el CMR a mano tiene un carácter ambiguo (1/7, 0/D, 5/S, 8/B, G/C...), márcalo "naranja" diciendo cuál.
- Copia del CMR: la copia VERDE de KSK se fotografía después de descargar y la AZUL antes de cargar. En CMR de otros remitentes, decide la fase por la casilla 24: con firma o sello del destinatario es "descarga"; vacía, "carga". Si no se puede saber, "desconocida".
- Tras la descarga, en la casilla 24 tiene que haber sello y firma del destinatario y, a ser posible, lugar y fecha. Sin firma ni sello es "rojo". Con firma pero sin fecha es "naranja".
- Reservas o daños anotados (casilla 18 del transportista o notas del destinatario): "rojo", copiando lo que pone. Si en la casilla 18 solo pone algo como "adjunto fotos antes de cargar", no es una reserva de daños: no lo marques.
- Si la orden pide verificar elementos (rueda de repuesto o kit, llave de repuesto, manual, cables de carga...) y el CMR tiene esas casillas (Keys, Spare wheel, Book's/Manual...) sin marcar: "naranja".
- Coche de la orden sin CMR entre las fotos: fase "sin_cmr", estado "naranja" ("CMR no recibido"). Puede que simplemente no se haya subido todavía.
- PUNTO INTERMEDIO: a veces un coche se deja en un punto intermedio (parking, campa, otro concesionario) para que lo recoja otro compañero. Si las notas o un CMR lo indican, ese coche va con fase "intermedio" (no "sin_cmr"), estado "naranja", y en "espera" pon dónde está, desde qué fecha y cuántos días lleva contando hasta HOY (p. ej. "Parking X · desde 09/11 · 6 días"). Si lleva 3 días o más, estado "rojo". Añade un problema recordando a quien organiza las cargas que el coche sigue esperando. Si no hay ningún dato de punto intermedio, "espera" va vacío.
- "Date Chg" de la orden parece ser la fecha desde la que el coche está disponible, no la de carga real: si no coincide con la fecha del CMR, ponlo como "info", no como error.
- Otras diferencias entre orden y CMR (modelo, versión HEV/PHEV, destinatario, dirección, matrícula del camión, nº de coches, pesos que no suman): "naranja".
- transporte_interior_espana = true si la carga y la descarga son las dos en España. Si un CMR de ese viaje no lleva el NIF del cargador, añádelo como "info" (dato necesario para el documento de control).
- Estado de cada orden = el peor de sus coches y problemas. estado_global = el peor de todo.
- cmrs_sin_orden: CMR de las fotos que no corresponden a ninguna orden subida.
- texto_whatsapp: resumen corto en texto plano para pegar en WhatsApp (una línea por orden con su semáforo 🟢🟠🔴 y lo que falla, sin markdown). Cada coche en punto intermedio lleva su propia línea de recordatorio: modelo, bastidor, dónde está y cuántos días lleva esperando.
- Las NOTAS del chófer o de la oficina, si las hay, son datos fiables sobre lo que ha pasado en el viaje.
- Escribe todos los textos (resumen, notas, problemas, texto_whatsapp) en ${AI_LANG[lang] || "français"}, frases cortas y concretas.`;

function leerBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

// Las fotos del móvil pueden pesar varios MB: se re-comprimen a JPEG manteniendo
// resolución de sobra para leer letra a mano.
function comprimirFoto(file, lado = 2000, calidad = 0.85) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, lado / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", calidad).split(",")[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(file.name)); };
    img.src = url;
  });
}

const box = {
  width: "100%", padding: "10px 14px", background: "#1a2332",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
  color: "#fff", fontSize: 13, boxSizing: "border-box",
};
const th = { textAlign: "left", padding: "6px 8px", color: "#9ca3af", fontWeight: 600, fontSize: 11, borderBottom: "1px solid rgba(255,255,255,0.1)" };
const td = { padding: "6px 8px", fontSize: 12, color: "#e2e8f0", borderBottom: "1px solid rgba(255,255,255,0.05)", verticalAlign: "top" };

function btn(bg, border, color, disabled) {
  return {
    padding: "8px 16px", borderRadius: 8, background: disabled ? "rgba(255,255,255,0.05)" : bg,
    border: `1px solid ${disabled ? "#475569" : border}`, color: disabled ? "#94a3b8" : color,
    fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
  };
}

export default function CmrCheck({ lang = "fr" }) {
  const u = UI[lang] || UI.fr;
  const [files, setFiles] = useState([]);
  const [over, setOver] = useState(false);
  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState(null);
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState("");

  const pdfs = files.filter(f => f.type === "application/pdf");
  const fotos = files.filter(f => f.type.startsWith("image/"));

  const add = (list) => {
    const nuevos = Array.from(list).filter(f => f.type === "application/pdf" || f.type.startsWith("image/"));
    setFiles(prev => [...prev, ...nuevos.filter(n => !prev.some(p => p.name === n.name && p.size === n.size))]);
    setReport(null);
  };

  const remove = (i) => { setFiles(files.filter((_, j) => j !== i)); setReport(null); };

  const check = async () => {
    if (!pdfs.length || !fotos.length) { alert(u.needBoth); return; }
    setChecking(true);
    setReport(null);
    try {
      // Primero las órdenes, luego las fotos, cada una con su nombre de archivo
      // para que la IA pueda referirse a ellas.
      const content = [];
      let bytes = 0;
      for (const f of pdfs) {
        const data = await leerBase64(f);
        bytes += data.length;
        content.push({ type: "text", text: `ORDEN (PDF): ${f.name}` });
        content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
      }
      for (const f of fotos) {
        const data = await comprimirFoto(f);
        bytes += data.length;
        content.push({ type: "text", text: `FOTO CMR: ${f.name}` });
        content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } });
      }
      if (bytes > MAX_BYTES) { alert(u.tooBig); return; }
      if (notes.trim()) content.push({ type: "text", text: `NOTAS DEL CHÓFER / DE LA OFICINA:
${notes.trim()}` });
      content.push({ type: "text", text: `Hoy es ${new Date().toLocaleDateString("es-ES")}. Haz el cotejo de las órdenes con los CMR siguiendo las reglas.` });

      const res = await callClaude(content, lang, {
        model: "claude-opus-5-5",
        maxTokens: 16000,
        system: instrucciones(lang),
        beta: "server-side-fallback-2026-07-01",
        extra: {
          fallbacks: "default",
          output_config: { effort: "high", format: { type: "json_schema", schema: SCHEMA } },
        },
      });
      if (res.startsWith(ERR)) { alert(res); return; }
      let json = null;
      try { json = JSON.parse(res); } catch (e) { json = extraerJSON(res); }
      if (!json || !Array.isArray(json.ordenes)) { alert(u.badAnswer); return; }
      setReport(json);
    } catch (e) {
      alert(`${ERR} ${e.message}`);
    } finally {
      setChecking(false);
    }
  };

  const copyWhatsapp = async () => {
    try {
      await navigator.clipboard.writeText(report.texto_whatsapp || report.resumen || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) { /* sin permiso de portapapeles: no pasa nada */ }
  };

  const g = report ? (SEMAFORO[report.estado_global] || SEMAFORO.naranja) : null;

  return (
    <div>
      <h2 style={{ color: "#22c55e", marginBottom: 6, fontFamily: "'Rajdhani', sans-serif", fontSize: 22 }}>{u.title}</h2>
      <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 16 }}>{u.intro}</p>

      <label
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
        style={{
          display: "block", padding: "28px 16px", borderRadius: 10, textAlign: "center", cursor: "pointer",
          border: `2px dashed ${over ? "#22c55e" : "rgba(255,255,255,0.15)"}`,
          background: over ? "rgba(34,197,94,0.08)" : "#111827", color: "#cbd5e1", fontSize: 13,
        }}>
        <input type="file" multiple accept="application/pdf,image/*" style={{ display: "none" }}
          onChange={e => { add(e.target.files); e.target.value = ""; }} />
        📄📸 {u.drop}
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>{u.hint}</div>
      </label>

      {files.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {files.map((f, i) => (
            <span key={f.name + f.size} style={{ ...box, width: "auto", padding: "5px 10px", fontSize: 12, display: "inline-flex", gap: 8, alignItems: "center" }}>
              {f.type === "application/pdf" ? "📄" : "📸"} {f.name}
              <button onClick={() => remove(i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>✕</button>
            </span>
          ))}
        </div>
      )}

      <label style={{ color: "#9ca3af", fontSize: 12, display: "block", margin: "14px 0 6px" }}>{u.notesLabel}</label>
      <textarea value={notes} onChange={e => { setNotes(e.target.value); setReport(null); }} rows={2} placeholder={u.notesPh}
        style={{ ...box, resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }} />

      <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={check} disabled={checking || !files.length}
          style={btn("linear-gradient(135deg, #22c55e, #16a34a)", "#22c55e", "#000", checking || !files.length)}>
          {checking ? u.checking : u.check}
        </button>
        {files.length > 0 && !checking && (
          <button onClick={() => { setFiles([]); setReport(null); }} style={btn("transparent", "#475569", "#cbd5e1", false)}>{u.clear}</button>
        )}
        <span style={{ fontSize: 12, color: "#64748b" }}>{u.orders}: {pdfs.length} · {u.photos}: {fotos.length}</span>
      </div>

      {report && (
        <div style={{ marginTop: 22 }}>
          <div style={{ padding: 16, borderRadius: 10, background: `${g.color}14`, border: `1px solid ${g.color}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 22 }}>{g.icon}</span>
            <div style={{ flex: 1, fontSize: 13, lineHeight: 1.6, color: "#e2e8f0" }}>{report.resumen}</div>
            <button onClick={copyWhatsapp} style={btn("rgba(37,211,102,0.15)", "#25d366", "#25d366", false)}>
              {copied ? u.copied : u.copy}
            </button>
          </div>

          {report.ordenes.map((o, k) => {
            const s = SEMAFORO[o.estado] || SEMAFORO.naranja;
            return (
              <div key={k} style={{ marginTop: 16, padding: 16, borderRadius: 10, background: "#0f172a", border: `1px solid ${s.color}55` }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 10 }}>
                  {s.icon} {u.order} {o.numero}
                </div>
                {o.transporte_interior_espana && (
                  <div style={{ fontSize: 12, color: "#fbbf24", marginBottom: 10 }}>{u.deca}</div>
                )}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={th}></th><th style={th}>{u.car}</th><th style={th}>{u.vinOrder}</th><th style={th}>{u.vinCmr}</th>
                        <th style={th}>{u.plate}</th><th style={th}>{u.cmr}</th><th style={th}>{u.phase}</th><th style={th}>{u.waiting}</th><th style={th}>{u.notes}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.coches.map((c, j) => (
                        <tr key={j}>
                          <td style={td}>{(SEMAFORO[c.estado] || SEMAFORO.naranja).icon}</td>
                          <td style={td}>{c.modelo}</td>
                          <td style={{ ...td, fontFamily: "monospace" }}>{c.vin_orden}</td>
                          <td style={{ ...td, fontFamily: "monospace" }}>{c.vin_cmr}</td>
                          <td style={td}>{c.matricula}</td>
                          <td style={td}>{c.cmr_numero}</td>
                          <td style={td}>{u.phases[c.fase] || c.fase}</td>
                          <td style={{ ...td, color: c.espera ? "#fbbf24" : "#e2e8f0" }}>{c.espera}</td>
                          <td style={{ ...td, color: "#cbd5e1" }}>{c.notas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{u.problems}</div>
                {o.problemas.length === 0
                  ? <div style={{ fontSize: 12, color: "#10b981", marginTop: 4 }}>✓ {u.noProblems}</div>
                  : o.problemas.map((p, j) => (
                    <div key={j} style={{ fontSize: 13, color: "#e2e8f0", marginTop: 6, lineHeight: 1.5 }}>
                      {(SEMAFORO[p.gravedad] || SEMAFORO.info).icon} {p.texto}
                    </div>
                  ))}
              </div>
            );
          })}

          {report.cmrs_sin_orden.length > 0 && (
            <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: "#0f172a", border: "1px solid #f59e0b55" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>🟠 {u.orphan}</div>
              {report.cmrs_sin_orden.map((c, j) => (
                <div key={j} style={{ fontSize: 13, color: "#e2e8f0", marginTop: 4 }}>CMR {c.cmr_numero}: {c.descripcion}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
