import { useState } from "react";
import { callClaude, extraerJSON, ERR } from "./claude";

// HACER EL CMR DESDE LA ORDEN
//
// La orden de transporte llega en PDF hecho por ordenador. De ahí sale un CMR por
// destinatario, listo para imprimir en el camión: bastidores completos, matrículas,
// camión y fecha ya puestos, sin letra a mano. Si la carga es en KSK, sale con el
// sello de KSK como remitente; si es fuera, se deja el hueco para el sello de carga.
//
// Por ahora todo sale con la marca "EJEMPLO": hasta que el jefe y el gestor den el
// visto bueno (sobre todo al sello impreso), no es un documento para usar.

const DEMO = true;

// Datos de KSK tal como salen en su sello y en la casilla 16 de sus CMR.
const KSK = {
  nombre: "KSK TRANSPORT",
  lineas: [
    "ZI - Rue François Arago - 39800 POLIGNY",
    "Tél. : 03 84 37 02 41",
    "www.ksk-transport.com - E-mail : contact@ksk-transport.com",
    "T.V.A. FR 93 530 712 926 - APE 4941 B - SIRET 530 712 926 00027",
  ],
};

const UI = {
  fr: {
    title: "🖨️ Faire le CMR",
    intro: "Glissez l'ordre de transport (PDF). L'agent prépare un CMR par destinataire, prêt à imprimer dans le camion.",
    drop: "Glissez ici l'ordre (PDF), ou cliquez pour le choisir",
    read: "📄 Lire l'ordre", reading: "Lecture… (jusqu'à 1 min)",
    truck: "Tracteur", trailer: "Semi", date: "Date de chargement", copies: "Copies",
    sender: "Expéditeur", consignee: "Destinataire", atKsk: "Chargement chez KSK (tampon KSK imprimé)",
    vinWarn: "VIN incomplet dans l'ordre : à compléter avant d'imprimer",
    print: "🖨️ Imprimer ce CMR", printAll: "🖨️ Tout imprimer",
    warnings: "Avis", badAnswer: "Réponse illisible de l'IA, réessayez.",
    demo: "Les CMR sortent avec la mention EXEMPLE tant que le patron et le gestionnaire n'ont pas validé le tampon imprimé.",
  },
  es: {
    title: "🖨️ Hacer el CMR",
    intro: "Arrastra la orden de transporte (PDF). El agente prepara un CMR por destinatario, listo para imprimir en el camión.",
    drop: "Arrastra aquí la orden (PDF), o pulsa para elegirla",
    read: "📄 Leer la orden", reading: "Leyendo… (hasta 1 min)",
    truck: "Tractora", trailer: "Semi", date: "Fecha de carga", copies: "Copias",
    sender: "Remitente", consignee: "Destinatario", atKsk: "Carga en KSK (sello de KSK impreso)",
    vinWarn: "Bastidor incompleto en la orden: complétalo antes de imprimir",
    print: "🖨️ Imprimir este CMR", printAll: "🖨️ Imprimir todos",
    warnings: "Avisos", badAnswer: "La IA ha devuelto algo ilegible, inténtalo otra vez.",
    demo: "Los CMR salen con la marca EJEMPLO hasta que el jefe y el gestor den el visto bueno al sello impreso.",
  },
  en: {
    title: "🖨️ Make the CMR",
    intro: "Drop the transport order (PDF). The agent prepares one CMR per consignee, ready to print in the truck.",
    drop: "Drop the order (PDF) here, or click to choose it",
    read: "📄 Read the order", reading: "Reading… (up to 1 min)",
    truck: "Tractor", trailer: "Trailer", date: "Loading date", copies: "Copies",
    sender: "Sender", consignee: "Consignee", atKsk: "Loading at KSK (KSK stamp printed)",
    vinWarn: "Incomplete VIN in the order: complete it before printing",
    print: "🖨️ Print this CMR", printAll: "🖨️ Print all",
    warnings: "Warnings", badAnswer: "Unreadable answer from the AI, try again.",
    demo: "CMRs carry the EXAMPLE mark until the boss and the accountant approve the printed stamp.",
  },
};

const AI_LANG = { fr: "français", es: "español", en: "English" };

const TXT = { type: "string" };
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tractora", "semi", "grupos", "avisos"],
  properties: {
    tractora: TXT,
    semi: TXT,
    avisos: { type: "array", items: TXT },
    grupos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["remitente", "destinatario", "lugar_entrega", "lugar_carga", "documentos", "carga_en_ksk", "verificar", "coches"],
        properties: {
          remitente: TXT,
          destinatario: TXT,
          lugar_entrega: TXT,
          lugar_carga: TXT,
          documentos: TXT,
          carga_en_ksk: { type: "boolean" },
          verificar: TXT,
          coches: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["modelo", "vin", "vin_completo", "matricula"],
              properties: { modelo: TXT, vin: TXT, vin_completo: { type: "boolean" }, matricula: TXT },
            },
          },
        },
      },
    },
  },
};

const instrucciones = (lang) => `Extraes de una orden de transporte de KSK Transport los datos para rellenar CMR.
- Un grupo por cada pareja distinta de lugar de carga + destinatario: cada grupo será un CMR.
- remitente: nombre y dirección completa del sitio de carga ("Expéditeur / Loading"), en varias líneas separadas por "\\n", con país. destinatario: nombre, dirección completa y país, en varias líneas, y su teléfono si viene.
- lugar_entrega: ciudad y país de entrega. lugar_carga: ciudad y país de carga.
- documentos: lote, referencias u otros números de la columna de observaciones que sirvan de documento anexo (p. ej. "LOTE 440250"); vacío si no hay.
- carga_en_ksk: true solo si el sitio de carga es KSK Transport (Poligny).
- verificar: elementos que la orden pide comprobar (rueda de repuesto o kit, llave de repuesto, manual, cables de carga, Becker...), en una línea en ${AI_LANG[lang] || "français"}; vacío si no pide nada.
- coches: modelo corto (marca y modelo), vin y matrícula. NO inventes nada del bastidor: si la orden lo da cortado (con "*" o con menos de 17 caracteres), pon lo que haya sin el "*" y vin_completo = false.
- tractora y semi: las matrículas que pone la orden ("TR:" y "SR:").
- avisos: en ${AI_LANG[lang] || "français"}, frases cortas sobre lo que falta o hay que revisar antes de imprimir (bastidores incompletos, direcciones a medias...).`;

function leerBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

const esc = (s) => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const lineas = (s) => esc(s).replace(/\n/g, "<br>");

const COPIAS = [
  { n: 1, fr: "Exemplaire de l'expéditeur", en: "Copy for sender", color: "#c2185b" },
  { n: 2, fr: "Exemplaire du destinataire", en: "Copy for consignee", color: "#1565c0" },
  { n: 3, fr: "Exemplaire du transporteur", en: "Copy for carrier", color: "#2e7d32" },
  { n: 4, fr: "Exemplaire supplémentaire", en: "Additional copy", color: "#555" },
];

const sello = () => `<div class="sello"><b>${KSK.nombre}</b><br>${KSK.lineas.map(esc).join("<br>")}</div>`;

// Una página A4 con las casillas del CMR. Cada copia lleva su número y su color.
function paginaCMR(g, comun, copia) {
  const c = copia.color;
  // Un bastidor incompleto se imprime con huecos delante para completarlo a mano,
  // así nadie lo toma por bueno.
  const vin = (x) => {
    const v = String(x.vin || "").replace(/[^A-Za-z0-9]/g, "");
    return x.vin_completo ? esc(v) : "_".repeat(Math.max(17 - v.length, 0)) + esc(v);
  };
  const coches = g.coches.map((x, i) =>
    `<tr><td>${i + 1}.</td><td>${esc(x.modelo)}</td><td class="vin">${vin(x)}</td><td>${esc(x.matricula)}</td></tr>`).join("");
  const casilla = (n, fr, en, cuerpo, extra = "") =>
    `<div class="box ${extra}"><div class="lbl"><b>${n}</b> ${fr} / <i>${en}</i></div><div class="val">${cuerpo}</div></div>`;
  return `<section class="page" style="--c:${c}">
  ${DEMO ? `<div class="demo">EXEMPLE · EJEMPLO</div>` : ""}
  <div class="head">
    <div class="copy"><span class="num">${copia.n}</span> ${copia.fr}<br><i>${copia.en}</i></div>
    <div class="title">LETTRE DE VOITURE INTERNATIONALE<br><i>INTERNATIONAL CONSIGNMENT NOTE</i> <span class="cmr">CMR</span></div>
  </div>
  <div class="grid">
    ${casilla(1, "Expéditeur (nom, adresse, pays)", "Sender", g.carga_en_ksk ? sello() : lineas(g.remitente), "a1")}
    ${casilla(16, "Transporteur (nom, adresse, pays)", "Carrier", sello(), "a16")}
    ${casilla(2, "Destinataire (nom, adresse, pays)", "Consignee", lineas(g.destinatario), "a2")}
    ${casilla(17, "Transporteurs successifs", "Successive carriers", `N° Tracteur : <b>${esc(comun.tractora)}</b><br>N° Semi : <b>${esc(comun.semi)}</b>`, "a17")}
    ${casilla(3, "Lieu prévu pour la livraison", "Place of delivery", esc(g.lugar_entrega), "a3")}
    ${casilla(18, "Réserves et observations du transporteur", "Carrier's reservations", "", "a18")}
    ${casilla(4, "Lieu et date de la prise en charge", "Place and date of taking over", `${esc(g.lugar_carga)} — ${esc(comun.fecha)}`, "a4")}
    ${casilla(5, "Documents annexés", "Documents attached", esc(g.documentos), "a5")}
    <div class="box a6"><div class="lbl"><b>6–12</b> Marques, nature de la marchandise, VIN / <i>Marks, nature of the goods, VIN</i></div>
      <table class="cars"><tr><th></th><th>Véhicule</th><th>VIN</th><th>Immat.</th></tr>${coches}</table>
      <div class="tot">Nombre de véhicules / <i>Number of vehicles</i> : <b>${g.coches.length}</b></div></div>
    ${casilla(13, "Instructions de l'expéditeur", "Sender's instructions", esc(g.verificar), "a13")}
    <div class="box a19"><div class="lbl">Contrôle / <i>Check</i></div><div class="checks">${["Keys", "Documents", "SD/CD/Navi", "Spare wheel", "Book's/Manual", "Charging cable", "Antenna", "Used car"].map(k => `<span>☐ ${k}</span>`).join("")}</div></div>
    ${casilla(21, "Établie à / le", "Established in / on", `${esc(g.lugar_carga)} — ${esc(comun.fecha)}`, "a21")}
    ${casilla(22, "Signature et timbre de l'expéditeur", "Signature and stamp of the sender", g.carga_en_ksk ? sello() : "", "a22 sig")}
    ${casilla(23, "Signature et timbre du transporteur", "Signature and stamp of the carrier", sello(), "a23 sig")}
    ${casilla(24, "Marchandises reçues — Lieu / le", "Goods received — Place / on", "<div class='linea'>Lieu / Place : ____________________ &nbsp; Le / On : ___/___/20__</div>", "a24 sig")}
  </div>
  <div class="foot">LE REFUS NON MOTIVÉ DE SIGNATURE ENGAGE LA RESPONSABILITÉ DU REMETTANT OU DU DESTINATAIRE.</div>
</section>`;
}

const CSS = `
@page { size: A4; margin: 8mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #111; }
.page { position: relative; height: 279mm; page-break-after: always; border: 1.5px solid var(--c); padding: 4mm; overflow: hidden; }
.page:last-child { page-break-after: auto; }
.demo { position: absolute; top: 45%; left: 5%; right: 5%; text-align: center; font-size: 64px; font-weight: 700; color: rgba(200,0,0,0.12); transform: rotate(-30deg); pointer-events: none; }
.head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3mm; color: var(--c); }
.copy { font-size: 13px; } .num { font-size: 30px; font-weight: 700; vertical-align: middle; }
.title { text-align: right; font-size: 12px; font-weight: 700; }
.cmr { display: inline-block; border: 2px solid var(--c); border-radius: 50%; padding: 2px 10px; margin-left: 6px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-top: 1px solid var(--c); border-left: 1px solid var(--c); }
.box { border-right: 1px solid var(--c); border-bottom: 1px solid var(--c); padding: 1.5mm 2mm; min-height: 17mm; font-size: 11px; }
.lbl { font-size: 7.5px; color: var(--c); margin-bottom: 1mm; }
.val { line-height: 1.35; }
.a6 { grid-column: 1 / 3; min-height: 70mm; }
.a13, .a19 { min-height: 20mm; }
.a21 { grid-column: 1 / 3; min-height: 9mm; }
.sig { min-height: 36mm; }
.a24 { grid-column: 1 / 3; }
.cars { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-top: 1mm; }
.cars th { text-align: left; font-size: 8px; color: var(--c); border-bottom: 1px solid #ccc; }
.cars td { padding: 1.2mm 1mm; border-bottom: 1px dotted #ccc; }
.vin { font-family: "Courier New", monospace; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; }
.tot { margin-top: 2mm; font-size: 10px; }
.checks { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 3mm; font-size: 10.5px; }
.sello { display: inline-block; border: 1.5px solid #1a237e; color: #1a237e; border-radius: 3px; padding: 1.5mm 2.5mm; font-size: 9px; line-height: 1.35; }
.linea { margin-top: 24mm; font-size: 10px; }
.foot { position: absolute; bottom: 3mm; left: 4mm; right: 4mm; text-align: center; font-size: 8px; color: var(--c); }
`;

function imprimir(grupos, comun) {
  const copias = COPIAS.slice(0, comun.copias);
  const paginas = grupos.flatMap(g => copias.map(c => paginaCMR(g, comun, c))).join("");
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>CMR</title><style>${CSS}</style></head><body>${paginas}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

const box = {
  width: "100%", padding: "8px 12px", background: "#1a2332",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
  color: "#fff", fontSize: 13, boxSizing: "border-box",
};
const label = { color: "#9ca3af", fontSize: 11, display: "block", marginBottom: 4 };

function btn(bg, border, color, disabled) {
  return {
    padding: "8px 16px", borderRadius: 8, background: disabled ? "rgba(255,255,255,0.05)" : bg,
    border: `1px solid ${disabled ? "#475569" : border}`, color: disabled ? "#94a3b8" : color,
    fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
  };
}

export default function CmrPrint({ lang = "fr" }) {
  const u = UI[lang] || UI.fr;
  const [file, setFile] = useState(null);
  const [reading, setReading] = useState(false);
  const [data, setData] = useState(null);
  const [comun, setComun] = useState({ tractora: "", semi: "", fecha: new Date().toLocaleDateString("fr-FR"), copias: 3 });

  const leer = async () => {
    if (!file) return;
    setReading(true);
    try {
      const pdf = await leerBase64(file);
      const res = await callClaude([
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } },
        { type: "text", text: "Extrae los datos para los CMR de esta orden." },
      ], lang, {
        model: "claude-opus-5-5",
        maxTokens: 8000,
        system: instrucciones(lang),
        beta: "server-side-fallback-2026-07-01",
        extra: { fallbacks: "default", output_config: { format: { type: "json_schema", schema: SCHEMA } } },
      });
      if (res.startsWith(ERR)) { alert(res); return; }
      let json = null;
      try { json = JSON.parse(res); } catch (e) { json = extraerJSON(res); }
      if (!json || !Array.isArray(json.grupos)) { alert(u.badAnswer); return; }
      setData(json);
      setComun(c => ({ ...c, tractora: json.tractora || c.tractora, semi: json.semi || c.semi }));
    } catch (e) {
      alert(`${ERR} ${e.message}`);
    } finally {
      setReading(false);
    }
  };

  // Cambiar a mano un dato de un grupo o de un coche antes de imprimir.
  const setGrupo = (gi, k, v) => setData(d => ({ ...d, grupos: d.grupos.map((g, i) => (i === gi ? { ...g, [k]: v } : g)) }));
  const setCoche = (gi, ci, k, v) => setData(d => ({
    ...d,
    grupos: d.grupos.map((g, i) => (i !== gi ? g : {
      ...g, coches: g.coches.map((c, j) => (j !== ci ? c : { ...c, [k]: v, ...(k === "vin" ? { vin_completo: v.replace(/[^A-Za-z0-9]/g, "").length === 17 } : {}) })),
    })),
  }));

  return (
    <div>
      <h2 style={{ color: "#38bdf8", marginBottom: 6, fontFamily: "'Rajdhani', sans-serif", fontSize: 22 }}>{u.title}</h2>
      <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 6 }}>{u.intro}</p>
      {DEMO && <p style={{ color: "#f59e0b", fontSize: 12, marginBottom: 14 }}>⚠️ {u.demo}</p>}

      <label
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = [...e.dataTransfer.files].find(x => x.type === "application/pdf"); if (f) { setFile(f); setData(null); } }}
        style={{ display: "block", padding: "22px 16px", borderRadius: 10, textAlign: "center", cursor: "pointer", border: "2px dashed rgba(255,255,255,0.15)", background: "#111827", color: "#cbd5e1", fontSize: 13 }}>
        <input type="file" accept="application/pdf" style={{ display: "none" }}
          onChange={e => { if (e.target.files[0]) { setFile(e.target.files[0]); setData(null); } e.target.value = ""; }} />
        📄 {file ? file.name : u.drop}
      </label>

      <button onClick={leer} disabled={!file || reading} style={{ ...btn("linear-gradient(135deg, #38bdf8, #0284c7)", "#38bdf8", "#000", !file || reading), marginTop: 12 }}>
        {reading ? u.reading : u.read}
      </button>

      {data && (
        <div style={{ marginTop: 20 }}>
          {data.avisos.length > 0 && (
            <div style={{ padding: 12, borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid #f59e0b", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>{u.warnings}</div>
              {data.avisos.map((a, i) => <div key={i} style={{ fontSize: 13, color: "#e2e8f0" }}>• {a}</div>)}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
            <div><label style={label}>{u.truck}</label><input style={box} value={comun.tractora} onChange={e => setComun({ ...comun, tractora: e.target.value })} /></div>
            <div><label style={label}>{u.trailer}</label><input style={box} value={comun.semi} onChange={e => setComun({ ...comun, semi: e.target.value })} /></div>
            <div><label style={label}>{u.date}</label><input style={box} value={comun.fecha} onChange={e => setComun({ ...comun, fecha: e.target.value })} /></div>
            <div><label style={label}>{u.copies}</label>
              <select style={box} value={comun.copias} onChange={e => setComun({ ...comun, copias: Number(e.target.value) })}>
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
              </select></div>
          </div>

          {data.grupos.map((g, gi) => (
            <div key={gi} style={{ padding: 14, borderRadius: 10, background: "#0f172a", border: "1px solid rgba(56,189,248,0.35)", marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={label}>{u.sender}</label>
                  <textarea rows={4} style={{ ...box, resize: "vertical", fontFamily: "inherit" }} value={g.remitente} onChange={e => setGrupo(gi, "remitente", e.target.value)} disabled={g.carga_en_ksk} /></div>
                <div><label style={label}>{u.consignee}</label>
                  <textarea rows={4} style={{ ...box, resize: "vertical", fontFamily: "inherit" }} value={g.destinatario} onChange={e => setGrupo(gi, "destinatario", e.target.value)} /></div>
              </div>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "#cbd5e1", margin: "10px 0" }}>
                <input type="checkbox" checked={g.carga_en_ksk} onChange={e => setGrupo(gi, "carga_en_ksk", e.target.checked)} /> {u.atKsk}
              </label>
              {g.coches.map((c, ci) => (
                <div key={ci} style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr", gap: 8, marginBottom: 6 }}>
                  <input style={box} value={c.modelo} onChange={e => setCoche(gi, ci, "modelo", e.target.value)} />
                  <div>
                    <input style={{ ...box, fontFamily: "monospace", border: c.vin_completo ? box.border : "1px solid #f59e0b" }} value={c.vin} onChange={e => setCoche(gi, ci, "vin", e.target.value.toUpperCase())} />
                    {!c.vin_completo && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 2 }}>⚠️ {u.vinWarn}</div>}
                  </div>
                  <input style={box} value={c.matricula} onChange={e => setCoche(gi, ci, "matricula", e.target.value)} />
                </div>
              ))}
              <button onClick={() => imprimir([g], comun)} style={{ ...btn("transparent", "#38bdf8", "#38bdf8", false), marginTop: 6 }}>{u.print}</button>
            </div>
          ))}
          {data.grupos.length > 1 && (
            <button onClick={() => imprimir(data.grupos, comun)} style={btn("linear-gradient(135deg, #38bdf8, #0284c7)", "#38bdf8", "#000", false)}>{u.printAll}</button>
          )}
        </div>
      )}
    </div>
  );
}
