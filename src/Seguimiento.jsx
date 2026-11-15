import { useState } from "react";

// SEGUIMIENTO: lo que el agente "tiene pendiente" entre un cotejo y otro.
//
// - Reclamaciones: si a un camión le ha llegado una orden nueva y la anterior aún
//   tiene coches sin foto de descarga, algo falta. Hay tres casos y cada uno se
//   reclama distinto: falta la foto de descarga, el coche está en un punto
//   intermedio o no hay ninguna información del coche.
// - Coches en punto intermedio, con los días que llevan esperando.
// - Órdenes abiertas, con botones para corregir a mano lo que se sepa por teléfono.

const UI = {
  fr: {
    title: "📋 Suivi",
    loading: "Chargement du suivi…",
    claims: "À réclamer",
    claimWhy: (o, sig) => `Le camion ${o.camion} a déjà l'ordre ${sig}, mais l'ordre ${o.numero} n'est pas clôturé.`,
    waiting: "Véhicules en point relais",
    open: "Ordres ouverts",
    none: "Rien en attente. Les ordres apparaissent ici après chaque contrôle.",
    delivered: "✓ Livré", relay: "📍 Point relais", archive: "Archiver",
    askPlace: "Où est resté le véhicule ?", askDate: "Depuis quand ? (JJ/MM/AAAA)",
    copy: "📋 Copier la réclamation", copied: "Copié",
    days: (n) => `${n} j`,
    estados: { pendiente: "sans info", cargado: "chargé, sans photo de livraison", intermedio: "point relais", entregado: "livré" },
    faltaFoto: "photo du CMR de livraison",
    sinInfo: "aucune information : où est-il ?",
    enEspera: (l, n) => `attend depuis ${n} jours à ${l || "?"} : qui le récupère ?`,
    mensaje: (o, lineas) => `Bonjour. L'ordre ${o.numero} (camion ${o.camion}) n'est pas encore clôturé et il y a déjà un nouvel ordre pour ce camion. Il nous manque :\n${lineas}\nMerci.`,
    recordatorio: (c, n) => `Rappel : ${c.modelo} ${c.vin} attend depuis ${n} jours à ${c.espera_lugar || "?"} sans être chargé.`,
  },
  es: {
    title: "📋 Seguimiento",
    loading: "Cargando el seguimiento…",
    claims: "A reclamar",
    claimWhy: (o, sig) => `El camión ${o.camion} ya tiene la orden ${sig}, pero la orden ${o.numero} no está cerrada.`,
    waiting: "Coches en punto intermedio",
    open: "Órdenes abiertas",
    none: "Nada pendiente. Las órdenes aparecen aquí después de cada cotejo.",
    delivered: "✓ Entregado", relay: "📍 Punto intermedio", archive: "Archivar",
    askPlace: "¿Dónde se ha quedado el coche?", askDate: "¿Desde cuándo? (DD/MM/AAAA)",
    copy: "📋 Copiar reclamación", copied: "Copiado",
    days: (n) => `${n} d`,
    estados: { pendiente: "sin información", cargado: "cargado, sin foto de entrega", intermedio: "punto intermedio", entregado: "entregado" },
    faltaFoto: "foto del CMR de descarga",
    sinInfo: "ninguna información: ¿dónde está?",
    enEspera: (l, n) => `lleva ${n} días esperando en ${l || "?"}: ¿quién lo recoge?`,
    mensaje: (o, lineas) => `Hola. La orden ${o.numero} (camión ${o.camion}) sigue sin cerrar y ya hay otra orden para este camión. Nos falta:\n${lineas}\nGracias.`,
    recordatorio: (c, n) => `Recordatorio: ${c.modelo} ${c.vin} lleva ${n} días en ${c.espera_lugar || "?"} sin cargar.`,
  },
  en: {
    title: "📋 Follow-up",
    loading: "Loading follow-up…",
    claims: "To claim",
    claimWhy: (o, sig) => `Truck ${o.camion} already has order ${sig}, but order ${o.numero} is not closed.`,
    waiting: "Vehicles at a relay point",
    open: "Open orders",
    none: "Nothing pending. Orders show up here after each check.",
    delivered: "✓ Delivered", relay: "📍 Relay point", archive: "Archive",
    askPlace: "Where was the vehicle left?", askDate: "Since when? (DD/MM/YYYY)",
    copy: "📋 Copy claim", copied: "Copied",
    days: (n) => `${n} d`,
    estados: { pendiente: "no info", cargado: "loaded, no delivery photo", intermedio: "relay point", entregado: "delivered" },
    faltaFoto: "photo of the unloading CMR",
    sinInfo: "no information at all: where is it?",
    enEspera: (l, n) => `waiting ${n} days at ${l || "?"}: who picks it up?`,
    mensaje: (o, lineas) => `Hello. Order ${o.numero} (truck ${o.camion}) is still open and this truck already has a new order. We are missing:\n${lineas}\nThanks.`,
    recordatorio: (c, n) => `Reminder: ${c.modelo} ${c.vin} has been waiting ${n} days at ${c.espera_lugar || "?"} without being loaded.`,
  },
};

const mat = (m) => String(m || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const fechaOrden = (o) => o.fecha_emision || (o.creada || "").slice(0, 10);

export function diasDesde(iso) {
  if (!iso) return 0;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

const ddmm = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");

// Órdenes abiertas cuyo camión ya tiene una orden posterior y aún les faltan coches por cerrar.
export function calcularReclamaciones(datos) {
  const abiertas = Object.values(datos?.ordenes || {}).filter(o => !o.archivada);
  const porCamion = {};
  for (const o of Object.values(datos?.ordenes || {})) {
    if (!mat(o.camion)) continue;
    (porCamion[mat(o.camion)] = porCamion[mat(o.camion)] || []).push(o);
  }
  const out = [];
  for (const o of abiertas) {
    const faltan = (o.coches || []).filter(c => c.estado !== "entregado");
    if (!faltan.length || !mat(o.camion)) continue;
    const posteriores = porCamion[mat(o.camion)]
      .filter(x => x.numero !== o.numero && fechaOrden(x) > fechaOrden(o))
      .sort((a, b) => fechaOrden(a).localeCompare(fechaOrden(b)));
    if (posteriores.length) out.push({ orden: o, siguiente: posteriores[0].numero, faltan });
  }
  return out;
}

const SEM = (n) => (n >= 3 ? "🔴" : "🟠");

function btnMini(color) {
  return { padding: "3px 8px", borderRadius: 6, background: "transparent", border: `1px solid ${color}`, color, fontSize: 11, cursor: "pointer" };
}

export default function Seguimiento({ lang = "fr", datos, cargando, error, accion }) {
  const u = UI[lang] || UI.fr;
  const [copiado, setCopiado] = useState(null);

  if (cargando && !datos) return <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>{u.loading}</div>;
  if (error) return <div style={{ fontSize: 12, color: "#f59e0b", marginBottom: 16 }}>⚠️ {error}</div>;
  if (!datos) return null;

  const abiertas = Object.values(datos.ordenes || {}).filter(o => !o.archivada)
    .sort((a, b) => fechaOrden(b).localeCompare(fechaOrden(a)));
  const reclamaciones = calcularReclamaciones(datos);
  const enEspera = abiertas.flatMap(o => (o.coches || [])
    .map((c, i) => ({ o, c, i }))
    .filter(x => x.c.estado === "intermedio"));

  const linea = (c) => {
    const quien = `${c.modelo || ""} ${c.vin ? `(${String(c.vin).slice(-8)})` : ""}`.trim();
    if (c.estado === "cargado") return `- ${quien}: ${u.faltaFoto}`;
    if (c.estado === "intermedio") return `- ${quien}: ${u.enEspera(c.espera_lugar, diasDesde(c.espera_desde))}`;
    return `- ${quien}: ${u.sinInfo}`;
  };

  const copiar = async (clave, texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      setTimeout(() => setCopiado(null), 1500);
    } catch (e) { /* sin permiso de portapapeles */ }
  };

  const marcarIntermedio = (o, i) => {
    const lugar = window.prompt(u.askPlace);
    if (lugar === null) return;
    const hoy = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    const f = window.prompt(u.askDate, hoy);
    if (f === null) return;
    const [d, m, y] = f.split(/[/.-]/);
    const iso = y && m && d ? `${y.padStart(4, "20")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : "";
    accion({ accion: "coche", orden: o.numero, indice: i, estado: "intermedio", espera_lugar: lugar, espera_desde: iso });
  };

  const card = (borde) => ({ marginTop: 10, padding: 14, borderRadius: 10, background: "#0f172a", border: `1px solid ${borde}` });
  const sub = { fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: "16px 0 4px" };

  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ color: "#22c55e", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{u.title}</h3>
      {!abiertas.length && <div style={{ fontSize: 12, color: "#64748b" }}>{u.none}</div>}

      {reclamaciones.length > 0 && <div style={sub}>🔴 {u.claims} ({reclamaciones.length})</div>}
      {reclamaciones.map(r => {
        const texto = u.mensaje(r.orden, r.faltan.map(linea).join("\n"));
        return (
          <div key={r.orden.numero} style={card("#ef444488")}>
            <div style={{ fontSize: 12, color: "#fca5a5", marginBottom: 6 }}>{u.claimWhy(r.orden, r.siguiente)}</div>
            <div style={{ fontSize: 13, color: "#e2e8f0", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{texto}</div>
            <button onClick={() => copiar(r.orden.numero, texto)} style={{ ...btnMini("#25d366"), marginTop: 8, fontSize: 12, padding: "5px 10px" }}>
              {copiado === r.orden.numero ? u.copied : u.copy}
            </button>
          </div>
        );
      })}

      {enEspera.length > 0 && <div style={sub}>📍 {u.waiting} ({enEspera.length})</div>}
      {enEspera.map(({ o, c, i }) => {
        const n = diasDesde(c.espera_desde);
        const texto = u.recordatorio(c, n);
        return (
          <div key={o.numero + i} style={{ ...card(n >= 3 ? "#ef444488" : "#f59e0b88"), display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span>{SEM(n)}</span>
            <span style={{ fontSize: 13, color: "#e2e8f0", flex: 1 }}>
              <b>{c.modelo}</b> {c.vin} · {c.espera_lugar || "?"} · {ddmm(c.espera_desde)} · <b>{u.days(n)}</b> · {o.numero}
            </span>
            <button onClick={() => copiar(o.numero + i, texto)} style={btnMini("#25d366")}>{copiado === o.numero + i ? u.copied : u.copy}</button>
            <button onClick={() => accion({ accion: "coche", orden: o.numero, indice: i, estado: "entregado" })} style={btnMini("#10b981")}>{u.delivered}</button>
          </div>
        );
      })}

      {abiertas.length > 0 && <div style={sub}>{u.open} ({abiertas.length})</div>}
      {abiertas.map(o => {
        const hechos = (o.coches || []).filter(c => c.estado === "entregado").length;
        const total = (o.coches || []).length;
        return (
          <details key={o.numero} style={card("rgba(255,255,255,0.08)")}>
            <summary style={{ cursor: "pointer", fontSize: 13, color: "#e2e8f0" }}>
              {hechos === total && total > 0 ? "🟢" : "🟠"} <b>{o.numero}</b> · {o.camion || "?"} · {ddmm(fechaOrden(o))} · {hechos}/{total}
            </summary>
            {(o.coches || []).map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12, color: "#cbd5e1", marginTop: 8 }}>
                <span style={{ flex: 1, minWidth: 220 }}>
                  {c.estado === "entregado" ? "✅" : "⏳"} {c.modelo} <span style={{ fontFamily: "monospace" }}>{c.vin}</span> {c.destino ? `→ ${c.destino}` : ""} · <i>{u.estados[c.estado] || c.estado}</i>
                </span>
                {c.estado !== "entregado" && (
                  <>
                    <button onClick={() => accion({ accion: "coche", orden: o.numero, indice: i, estado: "entregado" })} style={btnMini("#10b981")}>{u.delivered}</button>
                    <button onClick={() => marcarIntermedio(o, i)} style={btnMini("#f59e0b")}>{u.relay}</button>
                  </>
                )}
              </div>
            ))}
            <button onClick={() => accion({ accion: "archivar", orden: o.numero })} style={{ ...btnMini("#64748b"), marginTop: 10 }}>{u.archive}</button>
          </details>
        );
      })}
    </div>
  );
}
