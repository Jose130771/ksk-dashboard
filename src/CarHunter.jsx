CarHunter.jsx
import { useState } from "react";

async function askClaude(prompt) {
  const res = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const raw = (data.content?.[0]?.text || "").replace(/```json|```/g, "").trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON");
  return JSON.parse(match[0]);
}

// ── Shared UI primitives ─────────────────────────────────────────────────────

const Section = ({ title, children, style = {} }) => (
  <div style={{
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
    padding: "14px 16px", marginBottom: 12, ...style
  }}>
    {title && <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>{title}</div>}
    {children}
  </div>
);

const Btn = ({ onClick, disabled, children, variant = "primary", style = {} }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: variant === "primary" ? "10px 0" : "6px 12px",
    width: variant === "primary" ? "100%" : "auto",
    fontSize: variant === "primary" ? 15 : 12,
    fontWeight: 500,
    background: disabled ? "#f3f4f6" : variant === "primary" ? "#1d4ed8" : "transparent",
    color: disabled ? "#9ca3af" : variant === "primary" ? "#fff" : "#374151",
    border: variant === "primary" ? "none" : "1px solid #d1d5db",
    borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    transition: "background 0.15s", marginTop: variant === "primary" ? 8 : 0, ...style
  }}>{children}</button>
);

const Badge = ({ children, color = "blue" }) => {
  const colors = {
    blue: { bg: "#eff6ff", text: "#1d4ed8" },
    green: { bg: "#f0fdf4", text: "#15803d" },
    amber: { bg: "#fffbeb", text: "#b45309" },
    red: { bg: "#fef2f2", text: "#b91c1c" },
  };
  const c = colors[color] || colors.blue;
  return (
    <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, fontWeight: 500, background: c.bg, color: c.text, display: "inline-block" }}>
      {children}
    </span>
  );
};

const Field = ({ label, children }) => (
  <div>
    <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>{label}</label>
    {children}
  </div>
);

const Input = ({ ...props }) => (
  <input {...props} style={{ width: "100%", fontSize: 14, padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, boxSizing: "border-box", background: "#fff", color: "#111", ...props.style }} />
);

const Select = ({ children, ...props }) => (
  <select {...props} style={{ width: "100%", fontSize: 14, padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, boxSizing: "border-box", background: "#fff", color: "#111", ...props.style }}>
    {children}
  </select>
);

const Grid = ({ cols = 2, gap = 10, children }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap, marginBottom: 10 }}>
    {children}
  </div>
);

const Tags = ({ options, selected, onToggle }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
    {options.map(o => (
      <span key={o} onClick={() => onToggle(o)} style={{
        fontSize: 12, padding: "4px 10px", borderRadius: 20, cursor: "pointer",
        border: `1px solid ${selected.includes(o) ? "#3b82f6" : "#d1d5db"}`,
        background: selected.includes(o) ? "#eff6ff" : "transparent",
        color: selected.includes(o) ? "#1d4ed8" : "#6b7280",
        transition: "all 0.15s"
      }}>{o}</span>
    ))}
  </div>
);

const ScoreBar = ({ value, max = 10, color }) => (
  <div style={{ height: 4, background: "#f3f4f6", borderRadius: 2, marginTop: 4 }}>
    <div style={{ height: "100%", borderRadius: 2, width: `${(value / max) * 100}%`, background: color, transition: "width 0.4s" }} />
  </div>
);

const Metric = ({ label, value, color }) => (
  <div style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 12px" }}>
    <div style={{ fontSize: 18, fontWeight: 600, color: color || "#111" }}>{value}</div>
    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{label}</div>
  </div>
);

const Loading = ({ text = "Analizando" }) => (
  <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af", fontSize: 14 }}>
    {text}<span style={{ animation: "blink 1.2s infinite" }}>...</span>
    <style>{`@keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}`}</style>
  </div>
);

// ── Tab: Buscar ──────────────────────────────────────────────────────────────

function BuscarTab({ onSendToRent }) {
  const [form, setForm] = useState({ marca: "", modelo: "", precioMax: "", anioMin: "", kmMax: "", zona: "" });
  const [tipos, setTipos] = useState(["Turismo"]);
  const [fuentes, setFuentes] = useState(["Wallapop", "Milanuncios", "Coches.net"]);
  const [estrategia, setEstrategia] = useState(["Flip rápido"]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const toggle = (arr, setArr, val) =>
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const search = async () => {
    setLoading(true);
    setResults(null);
    try {
      const data = await askClaude(`Eres experto en compraventa de coches. Genera 5 anuncios realistas con estos criterios:
Marca: ${form.marca || "popular"}, Modelo: ${form.modelo || "cualquiera"}, Precio máx: ${form.precioMax || "sin límite"}€,
Año mín: ${form.anioMin || "2015"}, Km máx: ${form.kmMax || "sin límite"}, Zona: ${form.zona || "España"},
Tipos: ${tipos.join(", ")}, Fuentes: ${fuentes.join(", ")}, Estrategia: ${estrategia.join(", ")}

Devuelve SOLO JSON sin backticks:
{"resumen":{"total":5,"precio_medio_mercado":18000,"mejor_ahorro":4500,"oportunidades_hot":2},
"coches":[{"titulo":"BMW 320d 2019","precio_venta":18900,"precio_mercado":23500,"ahorro":4600,"margen_reventa":3200,
"año":2019,"km":87000,"combustible":"Diesel","cambio":"Automático","potencia":"190 CV","zona":"Madrid",
"fuente":"Wallapop","url_busqueda":"https://es.wallapop.com/app/search?keywords=BMW+320d",
"score":8.5,"score_razon":"20% bajo mercado","hot":true,"alerta":"Precio bajo mercado","riesgos":"Revisar ITV"}]}`);
      setResults(data);
    } catch (e) {
      setResults({ error: true });
    }
    setLoading(false);
  };

  const scoreColor = (s) => s >= 8 ? "#15803d" : s >= 6.5 ? "#b45309" : "#b91c1c";

  return (
    <div>
      <Section title="Criterios">
        <Grid cols={2}><Field label="Marca"><Input value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} placeholder="BMW, Audi..." /></Field>
          <Field label="Modelo"><Input value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} placeholder="Serie 3, A4..." /></Field></Grid>
        <Grid cols={3}><Field label="Precio máx (€)"><Input type="number" value={form.precioMax} onChange={e => setForm({ ...form, precioMax: e.target.value })} placeholder="25000" /></Field>
          <Field label="Año mínimo"><Input type="number" value={form.anioMin} onChange={e => setForm({ ...form, anioMin: e.target.value })} placeholder="2018" /></Field>
          <Field label="Km máximos"><Input type="number" value={form.kmMax} onChange={e => setForm({ ...form, kmMax: e.target.value })} placeholder="100000" /></Field></Grid>
        <div style={{ marginBottom: 10 }}><Field label="Zona"><Input value={form.zona} onChange={e => setForm({ ...form, zona: e.target.value })} placeholder="Madrid, España..." /></Field></div>
        <div style={{ marginBottom: 10 }}><div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Tipo</div>
          <Tags options={["Turismo", "SUV", "Deportivo", "Eléctrico", "Híbrido", "Furgoneta", "Clásico"]} selected={tipos} onToggle={v => toggle(tipos, setTipos, v)} /></div>
        <div style={{ marginBottom: 10 }}><div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Fuentes</div>
          <Tags options={["Wallapop", "Milanuncios", "Coches.net", "AutoScout24", "Mobile.de", "eBay Motors"]} selected={fuentes} onToggle={v => toggle(fuentes, setFuentes, v)} /></div>
        <div style={{ marginBottom: 4 }}><div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Estrategia</div>
          <Tags options={["Flip rápido", "Importar EU", "Restaurar", "Colección"]} selected={estrategia} onToggle={v => toggle(estrategia, setEstrategia, v)} /></div>
        <Btn onClick={search} disabled={loading}>{loading ? "Buscando..." : "Buscar oportunidades"}</Btn>
      </Section>

      {loading && <Section><Loading text="Analizando mercado" /></Section>}

      {results && !results.error && (
        <Section title="Resultados">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
            <Metric label="Encontrados" value={results.coches?.length || 0} />
            <Metric label="Precio medio" value={`€${Number(results.resumen.precio_medio_mercado).toLocaleString()}`} />
            <Metric label="Mejor ahorro" value={`€${Number(results.resumen.mejor_ahorro).toLocaleString()}`} color="#15803d" />
            <Metric label="Chollos" value={results.resumen.oportunidades_hot} color="#15803d" />
          </div>
          {results.coches?.map((c, i) => {
            const pct = Math.round(((c.precio_mercado - c.precio_venta) / c.precio_mercado) * 100);
            const sc = scoreColor(c.score);
            return (
              <div key={i} style={{ border: `${c.hot ? "1.5px solid #16a34a" : "1px solid #e5e7eb"}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                      {c.hot && <Badge color="green">Chollo</Badge>}
                      <Badge color="blue">{c.fuente}</Badge>
                      {pct > 10 && <Badge color="green">-{pct}% mercado</Badge>}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{c.titulo}</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                      {[c.año, `${Number(c.km).toLocaleString()} km`, c.combustible, c.potencia, c.zona].map((v, j) => (
                        <span key={j} style={{ fontSize: 12, color: "#6b7280" }}>{v}</span>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 19, fontWeight: 700 }}>€{Number(c.precio_venta).toLocaleString()}</span>
                      <span style={{ fontSize: 13, color: "#9ca3af", textDecoration: "line-through" }}>€{Number(c.precio_mercado).toLocaleString()}</span>
                      <span style={{ fontSize: 13, color: "#15803d", fontWeight: 600 }}>+€{Number(c.margen_reventa).toLocaleString()}</span>
                    </div>
                    {c.alerta && <div style={{ fontSize: 12, color: "#15803d", marginBottom: 3 }}>{c.alerta}</div>}
                    {c.riesgos && <div style={{ fontSize: 12, color: "#b45309" }}>{c.riesgos}</div>}
                  </div>
                  <div style={{ textAlign: "center", minWidth: 50 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: sc }}>{c.score.toFixed(1)}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>score</div>
                    <ScoreBar value={c.score} color={sc} />
                  </div>
                </div>
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "#6b7280", flex: 1 }}>{c.score_razon}</div>
                  <Btn variant="secondary" onClick={() => onSendToRent(c.precio_venta)}>Calcular renta ↗</Btn>
                  <a href={c.url_busqueda} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#1d4ed8" }}>Ver →</a>
                </div>
              </div>
            );
          })}
        </Section>
      )}
      {results?.error && <Section><div style={{ textAlign: "center", color: "#9ca3af", padding: "1rem" }}>Error al buscar. Inténtalo de nuevo.</div></Section>}
    </div>
  );
}

// ── Tab: Rentabilidad ────────────────────────────────────────────────────────

function RentabilidadTab({ initPrecio }) {
  const [f, setF] = useState({ compra: initPrecio || "", venta: "", origen: "españa", cc: "", cv: "", combustible: "gasolina", venal: "", anio: "", extra: "", importar: false });

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const compra = parseFloat(f.compra) || 0;
  const venta = parseFloat(f.venta) || 0;
  const venal = parseFloat(f.venal) || compra;
  const cv = parseFloat(f.cv) || 120;
  const extra = parseFloat(f.extra) || 0;

  let transporte = 0, homologacion = 0, itv = 0, ivaImport = 0;
  if (f.importar && f.origen !== "españa") {
    transporte = f.origen === "uk" ? 800 : ["alemania", "belgica"].includes(f.origen) ? 350 : 250;
    homologacion = 300; itv = 60;
    if (f.origen === "uk") ivaImport = compra * 0.21;
  }

  let iedmt = 0;
  if (f.combustible !== "electrico" && cv > 0) {
    if (cv >= 200) iedmt = venal * 0.145;
    else if (cv >= 160) iedmt = venal * 0.096;
    else if (cv >= 120) iedmt = venal * 0.048;
    if (f.combustible === "hibrido") iedmt *= 0.7;
  }

  const gestoria = 200, transferencia = f.importar ? 110 : 55, seguro = 150;
  const totalCostes = compra + transporte + homologacion + itv + Math.round(iedmt) + Math.round(ivaImport) + gestoria + transferencia + seguro + extra;
  const beneficio = venta - totalCostes;
  const roi = totalCostes > 0 ? (beneficio / totalCostes) * 100 : 0;
  const margenPct = venta > 0 ? (beneficio / venta) * 100 : 0;
  const rentColor = roi > 15 ? "#15803d" : roi > 8 ? "#b45309" : "#b91c1c";
  const rentLabel = roi > 20 ? "Excelente" : roi > 12 ? "Buena" : roi > 5 ? "Aceptable" : "Baja";

  const rows = [
    { lbl: "Precio de compra", val: compra },
    f.importar && transporte ? { lbl: `Transporte (${f.origen})`, val: transporte } : null,
    f.importar && homologacion ? { lbl: "Homologación", val: homologacion } : null,
    f.importar && itv ? { lbl: "ITV importación", val: itv } : null,
    ivaImport ? { lbl: "IVA importación UK", val: Math.round(ivaImport) } : null,
    { lbl: iedmt > 0 ? `IEDMT (${cv} CV)` : "IEDMT", val: Math.round(iedmt), special: iedmt === 0 ? "Exento" : null },
    { lbl: "Gestoría + transferencia", val: gestoria + transferencia },
    { lbl: "Seguro obligatorio", val: seguro },
    extra ? { lbl: "Gastos adicionales", val: extra } : null,
  ].filter(Boolean);

  return (
    <div>
      <Section title="Datos del vehículo">
        <Grid cols={2}>
          <Field label="Precio de compra (€)"><Input type="number" value={f.compra} onChange={e => set("compra", e.target.value)} placeholder="15000" /></Field>
          <Field label="Precio de venta estimado (€)"><Input type="number" value={f.venta} onChange={e => set("venta", e.target.value)} placeholder="19000" /></Field>
        </Grid>
        <Grid cols={2}>
          <Field label="País de origen">
            <Select value={f.origen} onChange={e => set("origen", e.target.value)}>
              {["españa", "alemania", "francia", "portugal", "belgica", "uk"].map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
            </Select>
          </Field>
          <Field label="Potencia (CV)"><Input type="number" value={f.cv} onChange={e => set("cv", e.target.value)} placeholder="190" /></Field>
        </Grid>
        <Grid cols={2}>
          <Field label="Combustible">
            <Select value={f.combustible} onChange={e => set("combustible", e.target.value)}>
              <option value="gasolina">Gasolina</option>
              <option value="diesel">Diésel</option>
              <option value="electrico">Eléctrico</option>
              <option value="hibrido">Híbrido</option>
            </Select>
          </Field>
          <Field label="Valor venal Hacienda (€)"><Input type="number" value={f.venal} onChange={e => set("venal", e.target.value)} placeholder="20000" /></Field>
        </Grid>
        <div style={{ marginBottom: 10 }}><Field label="Gastos adicionales (€)"><Input type="number" value={f.extra} onChange={e => set("extra", e.target.value)} placeholder="800" /></Field></div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={f.importar} onChange={e => set("importar", e.target.checked)} style={{ width: "auto" }} />
          Vehículo importado desde otro país
        </label>
      </Section>

      {compra > 0 && venta > 0 && (
        <>
          <Section title="Desglose de costes">
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "7px 0", color: "#6b7280" }}>{r.lbl}</td>
                    <td style={{ padding: "7px 0", textAlign: "right", fontWeight: 500, color: r.special ? "#15803d" : "#111" }}>
                      {r.special || `€${r.val.toLocaleString()}`}
                    </td>
                  </tr>
                ))}
                <tr><td style={{ padding: "12px 0 4px", fontWeight: 600 }}>Coste total</td><td style={{ padding: "12px 0 4px", textAlign: "right", fontWeight: 700 }}>€{Math.round(totalCostes).toLocaleString()}</td></tr>
                <tr><td style={{ padding: "4px 0", fontWeight: 600 }}>Precio de venta</td><td style={{ padding: "4px 0", textAlign: "right", fontWeight: 700 }}>€{venta.toLocaleString()}</td></tr>
                <tr><td style={{ padding: "4px 0", fontWeight: 700, color: rentColor }}>Beneficio neto</td><td style={{ padding: "4px 0", textAlign: "right", fontWeight: 700, color: rentColor }}>€{Math.round(beneficio).toLocaleString()}</td></tr>
              </tbody>
            </table>
          </Section>
          <Section title="Rentabilidad">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
              <Metric label="Beneficio neto" value={`€${Math.round(beneficio).toLocaleString()}`} color={rentColor} />
              <Metric label="ROI" value={`${roi.toFixed(1)}%`} color={rentColor} />
              <Metric label="Margen" value={`${margenPct.toFixed(1)}%`} />
              <Metric label="Valoración" value={rentLabel} color={rentColor} />
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>ROI</div>
            <ScoreBar value={Math.min(Math.max(roi, 0), 40)} max={40} color={rentColor} />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 10, padding: "8px 10px", background: "#f9fafb", borderRadius: 8 }}>
              {iedmt > 0
                ? `IEDMT: €${Math.round(iedmt).toLocaleString()} (${Math.round(iedmt / compra * 100)}% del precio). Para reducirlo: busca vehículos con menos de 120 CV, eléctricos o híbridos.`
                : "Este vehículo está exento de IEDMT — ventaja fiscal importante para el margen."}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

// ── Tab: Comparar ────────────────────────────────────────────────────────────

function CompararTab() {
  const [slots, setSlots] = useState([
    { id: 1, titulo: "", precio: "", anio: "", km: "", cv: "" },
    { id: 2, titulo: "", precio: "", anio: "", km: "", cv: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const updateSlot = (id, k, v) => setSlots(slots.map(s => s.id === id ? { ...s, [k]: v } : s));
  const addSlot = () => setSlots([...slots, { id: Date.now(), titulo: "", precio: "", anio: "", km: "", cv: "" }]);
  const removeSlot = (id) => setSlots(slots.filter(s => s.id !== id));

  const compare = async () => {
    const vehicles = slots.filter(s => s.titulo);
    if (vehicles.length < 2) return;
    setLoading(true); setResult(null);
    try {
      const data = await askClaude(`Compara estos vehículos para negocio de compraventa: ${JSON.stringify(vehicles)}
Devuelve SOLO JSON sin backticks:
{"ganador":"título","razon":"Por qué es mejor en 1 frase","coches":[{"titulo":"BMW 320d 2019","precio":18000,"precio_mercado":23000,
"depreciacion_anual":12,"coste_mantenimiento":"Medio","facilidad_venta":"Alta","score_inversion":8.2,"margen_estimado":3800,
"tiempo_venta_dias":18,"ventajas":["Precio bajo mercado"],"desventajas":["Mantenimiento caro"],"winner":true}]}`);
      setResult(data);
    } catch { setResult({ error: true }); }
    setLoading(false);
  };

  return (
    <div>
      <Section title="Vehículos a comparar">
        {slots.map((s, i) => (
          <div key={s.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
              <span>Vehículo {i + 1}</span>
              {slots.length > 2 && <button onClick={() => removeSlot(s.id)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 12 }}>Eliminar</button>}
            </div>
            <Grid cols={2}><Field label="Marca y modelo"><Input value={s.titulo} onChange={e => updateSlot(s.id, "titulo", e.target.value)} placeholder="BMW 320d 2019" /></Field>
              <Field label="Precio (€)"><Input type="number" value={s.precio} onChange={e => updateSlot(s.id, "precio", e.target.value)} placeholder="18000" /></Field></Grid>
            <Grid cols={3}><Field label="Año"><Input type="number" value={s.anio} onChange={e => updateSlot(s.id, "anio", e.target.value)} placeholder="2019" /></Field>
              <Field label="Km"><Input type="number" value={s.km} onChange={e => updateSlot(s.id, "km", e.target.value)} placeholder="90000" /></Field>
              <Field label="CV"><Input type="number" value={s.cv} onChange={e => updateSlot(s.id, "cv", e.target.value)} placeholder="190" /></Field></Grid>
          </div>
        ))}
        <div onClick={addSlot} style={{ border: "1px dashed #d1d5db", borderRadius: 10, padding: 10, textAlign: "center", cursor: "pointer", color: "#9ca3af", fontSize: 13, marginBottom: 8 }}>
          + Añadir vehículo
        </div>
        <Btn onClick={compare} disabled={loading}>{loading ? "Comparando..." : "Comparar ahora"}</Btn>
      </Section>

      {loading && <Section><Loading text="Comparando vehículos" /></Section>}

      {result && !result.error && (
        <Section title="Comparativa">
          <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>Mejor inversión: {result.ganador}</div>
            <div style={{ fontSize: 12, color: "#15803d", marginTop: 2 }}>{result.razon}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${result.coches?.length || 2}, 1fr)`, gap: 8 }}>
            {result.coches?.map((c, i) => (
              <div key={i} style={{ border: `${c.winner ? "1.5px solid #16a34a" : "1px solid #e5e7eb"}`, borderRadius: 10, padding: 12 }}>
                {c.winner && <div style={{ marginBottom: 6 }}><Badge color="green">Mejor opción</Badge></div>}
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{c.titulo}</div>
                {[
                  ["Precio", `€${Number(c.precio).toLocaleString()}`],
                  ["Mercado", `€${Number(c.precio_mercado).toLocaleString()}`],
                  ["Margen", `€${Number(c.margen_estimado).toLocaleString()}`],
                  ["Venta est.", `${c.tiempo_venta_dias}d`],
                  ["Deprec./año", `${c.depreciacion_anual}%`],
                  ["Mant.", c.coste_mantenimiento],
                  ["Facilidad", c.facilidad_venta],
                ].map(([l, v], j) => (
                  <div key={j} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <span style={{ color: "#6b7280" }}>{l}</span>
                    <span style={{ fontWeight: 600, color: l === "Margen" && c.winner ? "#15803d" : "#111" }}>{v}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: c.winner ? "#15803d" : "#1d4ed8" }}>{c.score_inversion}</div>
                  <ScoreBar value={c.score_inversion} color={c.winner ? "#16a34a" : "#3b82f6"} />
                </div>
                <div style={{ marginTop: 8 }}>
                  {c.ventajas?.map((v, j) => <div key={j} style={{ fontSize: 11, color: "#15803d", marginBottom: 2 }}>+ {v}</div>)}
                  {c.desventajas?.map((d, j) => <div key={j} style={{ fontSize: 11, color: "#b45309", marginBottom: 2 }}>- {d}</div>)}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Tab: Marcas ──────────────────────────────────────────────────────────────

function MarcasTab() {
  const [marca, setMarca] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const analyze = async () => {
    if (!marca.trim()) return;
    setLoading(true); setResult(null);
    try {
      const data = await askClaude(`Analiza la marca "${marca}" para compraventa de coches en España.
Devuelve SOLO JSON sin backticks:
{"marca":"BMW","origen":"Alemania","segmento":"Premium","resumen":"1-2 frases para compraventa",
"puntuaciones":{"fiabilidad":8,"mantenimiento":5,"demanda":9,"depreciacion":6,"facilidad_venta":8,"rentabilidad_flip":7},
"mejores_modelos":[{"modelo":"320d","por_que":"Alta demanda","precio_entrada":12000,"margen_tipico":3000}],
"consejo":"Consejo específico","riesgo":"Principal riesgo"}`);
      setResult(data);
    } catch { setResult({ error: true }); }
    setLoading(false);
  };

  const scoreColor = (v) => v >= 7 ? "#15803d" : v >= 5 ? "#b45309" : "#b91c1c";

  return (
    <div>
      <Section title="Analizar marca">
        <Field label="Marca de vehículo"><Input value={marca} onChange={e => setMarca(e.target.value)} placeholder="BMW, Toyota, Ford..." onKeyDown={e => e.key === "Enter" && analyze()} /></Field>
        <Btn onClick={analyze} disabled={loading}>{loading ? "Analizando..." : "Analizar marca"}</Btn>
      </Section>

      {loading && <Section><Loading text={`Analizando ${marca}`} /></Section>}

      {result && !result.error && (
        <>
          <Section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{result.marca}</div>
                <div style={{ fontSize: 13, color: "#9ca3af" }}>{result.origen} · {result.segmento}</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>{result.resumen}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: scoreColor(parseFloat((Object.values(result.puntuaciones).reduce((a, b) => a + b, 0) / 6).toFixed(1))) }}>
                  {(Object.values(result.puntuaciones).reduce((a, b) => a + b, 0) / 6).toFixed(1)}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>score</div>
              </div>
            </div>
            {[
              ["Fiabilidad", result.puntuaciones.fiabilidad],
              ["Coste mantenimiento (inv.)", 11 - result.puntuaciones.mantenimiento],
              ["Demanda en España", result.puntuaciones.demanda],
              ["Depreciación (inv.)", 11 - result.puntuaciones.depreciacion],
              ["Facilidad de venta", result.puntuaciones.facilidad_venta],
              ["Rentabilidad flip", result.puntuaciones.rentabilidad_flip],
            ].map(([lbl, val], i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: "#6b7280" }}>{lbl}</span>
                  <span style={{ fontWeight: 600 }}>{val}/10</span>
                </div>
                <ScoreBar value={val} color={scoreColor(val)} />
              </div>
            ))}
          </Section>
          <Section title="Mejores modelos para flip">
            {result.mejores_modelos?.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < result.mejores_modelos.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{result.marca} {m.modelo}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{m.por_que}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13 }}>Desde €{Number(m.precio_entrada).toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: "#15803d", fontWeight: 600 }}>+€{Number(m.margen_tipico).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </Section>
          <Section>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Consejo para compraventa</div>
              <div style={{ fontSize: 13 }}>{result.consejo}</div>
            </div>
            <div style={{ background: "#fffbeb", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 12, color: "#b45309", fontWeight: 600, marginBottom: 2 }}>Riesgo principal</div>
              <div style={{ fontSize: 13, color: "#b45309" }}>{result.riesgo}</div>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

// ── Tab: Alertas ─────────────────────────────────────────────────────────────

function AlertasTab() {
  const [form, setForm] = useState({ email: "", coche: "", precio: "", score: "8", freq: "diaria" });
  const [fuentes, setFuentes] = useState(["Wallapop", "Milanuncios"]);
  const [alerts, setAlerts] = useState([]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const toggle = (v) => setFuentes(fuentes.includes(v) ? fuentes.filter(f => f !== v) : [...fuentes, v]);

  const save = () => {
    if (!form.email || !form.coche) return;
    setAlerts([...alerts, { ...form, fuentes: fuentes.join(", "), activa: true, id: Date.now() }]);
    setForm({ email: "", coche: "", precio: "", score: "8", freq: "diaria" });
  };

  const toggleAlert = (id) => setAlerts(alerts.map(a => a.id === id ? { ...a, activa: !a.activa } : a));
  const deleteAlert = (id) => setAlerts(alerts.filter(a => a.id !== id));

  return (
    <div>
      <Section title="Nueva alerta">
        <div style={{ marginBottom: 10 }}><Field label="Tu email"><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="tu@email.com" /></Field></div>
        <Grid cols={2}>
          <Field label="Vehículo a buscar"><Input value={form.coche} onChange={e => set("coche", e.target.value)} placeholder="BMW 320d, Audi A4..." /></Field>
          <Field label="Precio máximo (€)"><Input type="number" value={form.precio} onChange={e => set("precio", e.target.value)} placeholder="20000" /></Field>
        </Grid>
        <Grid cols={2}>
          <Field label="Score mínimo">
            <Select value={form.score} onChange={e => set("score", e.target.value)}>
              <option value="7">7 — Buena oportunidad</option>
              <option value="8">8 — Chollo</option>
              <option value="9">9 — Excepcional</option>
            </Select>
          </Field>
          <Field label="Frecuencia">
            <Select value={form.freq} onChange={e => set("freq", e.target.value)}>
              <option value="inmediata">Inmediata</option>
              <option value="diaria">Diaria</option>
              <option value="semanal">Semanal</option>
            </Select>
          </Field>
        </Grid>
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Fuentes</div>
          <Tags options={["Wallapop", "Milanuncios", "Coches.net", "AutoScout24", "Mobile.de"]} selected={fuentes} onToggle={toggle} />
        </div>
        <Btn onClick={save}>Guardar alerta</Btn>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8, padding: "8px 10px", background: "#f9fafb", borderRadius: 8 }}>
          Para envío real de emails conecta esta alerta a la función Vercel de KSK con tu cuenta Gmail.
        </div>
      </Section>

      <Section title={`Alertas activas (${alerts.length})`}>
        {alerts.length === 0
          ? <div style={{ textAlign: "center", color: "#9ca3af", padding: "1rem", fontSize: 14 }}>No hay alertas configuradas</div>
          : alerts.map(a => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{a.coche}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{a.email} · Score ≥{a.score} · {a.freq}</div>
                {a.precio && <div style={{ fontSize: 12, color: "#6b7280" }}>Máx €{Number(a.precio).toLocaleString()}</div>}
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{a.fuentes}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Badge color={a.activa ? "green" : "amber"}>{a.activa ? "Activa" : "Pausada"}</Badge>
                <Btn variant="secondary" onClick={() => toggleAlert(a.id)}>{a.activa ? "Pausar" : "Activar"}</Btn>
                <Btn variant="secondary" onClick={() => deleteAlert(a.id)} style={{ color: "#b91c1c" }}>X</Btn>
              </div>
            </div>
          ))
        }
      </Section>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function CarHunter() {
  const [activeTab, setActiveTab] = useState("buscar");
  const [rentPrecio, setRentPrecio] = useState("");

  const tabs = [
    { id: "buscar", label: "Buscar" },
    { id: "rentabilidad", label: "Rentabilidad" },
    { id: "comparar", label: "Comparar" },
    { id: "marcas", label: "Marcas" },
    { id: "alertas", label: "Alertas" },
  ];

  const handleSendToRent = (precio) => {
    setRentPrecio(String(precio));
    setActiveTab("rentabilidad");
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ padding: "16px 0 12px", borderBottom: "1px solid #f3f4f6", marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#111" }}>Car Deal Hunter</div>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>Busca, analiza y compara oportunidades de compraventa</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
            cursor: "pointer", border: "1px solid",
            borderColor: activeTab === t.id ? "#1d4ed8" : "#d1d5db",
            background: activeTab === t.id ? "#1d4ed8" : "transparent",
            color: activeTab === t.id ? "#fff" : "#6b7280",
            transition: "all 0.15s"
          }}>{t.label}</button>
        ))}
      </div>

      {/* Panels */}
      {activeTab === "buscar" && <BuscarTab onSendToRent={handleSendToRent} />}
      {activeTab === "rentabilidad" && <RentabilidadTab key={rentPrecio} initPrecio={rentPrecio} />}
      {activeTab === "comparar" && <CompararTab />}
      {activeTab === "marcas" && <MarcasTab />}
      {activeTab === "alertas" && <AlertasTab />}
    </div>
  );
}
