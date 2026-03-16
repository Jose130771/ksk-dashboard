import { useState } from "react";

const TABS = [
  { id: "cargo", icon: "🚗", label: "Calculadora de Carga" },
  { id: "route", icon: "🗺️", label: "Planificador de Ruta" },
  { id: "notify", icon: "📱", label: "Avisos a Clientes" },
  { id: "address", icon: "📍", label: "Verificador de Dirección" },
];

const TRUCK_TYPES = [
  { id: "standard", name: "Camión Estándar", capacity: 8, maxWeight: 18000, maxHeight: 1.65, maxLength: 4.8, icon: "🚛" },
  { id: "jumbo", name: "Camión Jumbo", capacity: 10, maxWeight: 22000, maxHeight: 1.80, maxLength: 5.2, icon: "🚚" },
  { id: "lowloader", name: "Plataforma Baja", capacity: 6, maxWeight: 30000, maxHeight: 2.10, maxLength: 5.5, icon: "🏗️" },
];

const CAR_MODELS = [
  { brand: "Toyota", model: "Yaris", height: 1.50, length: 3.94, weight: 1050, type: "Urbano" },
  { brand: "VW", model: "Golf", height: 1.46, length: 4.28, weight: 1350, type: "Compacto" },
  { brand: "BMW", model: "Serie 3", height: 1.44, length: 4.71, weight: 1550, type: "Berlina" },
  { brand: "Mercedes", model: "Clase C", height: 1.44, length: 4.75, weight: 1600, type: "Berlina" },
  { brand: "Audi", model: "A4", height: 1.43, length: 4.76, weight: 1490, type: "Berlina" },
  { brand: "Ford", model: "Focus", height: 1.47, length: 4.38, weight: 1280, type: "Compacto" },
  { brand: "Seat", model: "Ibiza", height: 1.44, length: 4.06, weight: 1080, type: "Urbano" },
  { brand: "BMW", model: "X5", height: 1.75, length: 4.93, weight: 2175, type: "SUV Grande" },
  { brand: "Mercedes", model: "GLE", height: 1.77, length: 4.92, weight: 2100, type: "SUV Grande" },
  { brand: "VW", model: "Tiguan", height: 1.67, length: 4.51, weight: 1615, type: "SUV Mediano" },
  { brand: "Toyota", model: "RAV4", height: 1.68, length: 4.60, weight: 1695, type: "SUV Mediano" },
  { brand: "Porsche", model: "911", height: 1.29, length: 4.52, weight: 1475, type: "Deportivo" },
  { brand: "Tesla", model: "Model 3", height: 1.44, length: 4.69, weight: 1752, type: "Electrico" },
  { brand: "Tesla", model: "Model X", height: 1.68, length: 5.04, weight: 2268, type: "SUV Electrico" },
  { brand: "Ford", model: "Transit", height: 1.97, length: 5.53, weight: 1980, type: "Furgoneta" },
  { brand: "VW", model: "Transporter", height: 1.97, length: 4.91, weight: 1860, type: "Furgoneta" },
  { brand: "Mercedes", model: "Sprinter", height: 2.37, length: 5.91, weight: 2100, type: "Furgoneta Grande" },
  { brand: "Range Rover", model: "Sport", height: 1.78, length: 4.88, weight: 2200, type: "SUV Lujo" },
];

async function callClaude(prompt) {
  const response = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.REACT_APP_ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "x-api-key": process.env.REACT_APP_ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: "Eres un experto en logística de transporte internacional de automóviles en Europa. Responde siempre en español, de forma clara y profesional.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || "Error al procesar";
}

function CargoCalculator() {
  const [selectedTruck, setSelectedTruck] = useState(TRUCK_TYPES[0]);
  const [selectedCars, setSelectedCars] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const addCar = (car) => {
    setSelectedCars([...selectedCars, { ...car, id: Date.now() }]);
    setResult(null);
  };

  const removeCar = (id) => {
    setSelectedCars(selectedCars.filter(c => c.id !== id));
    setResult(null);
  };

  const calculate = async () => {
    if (selectedCars.length === 0) return;
    setLoading(true);
    const totalWeight = selectedCars.reduce((sum, c) => sum + c.weight, 0);
    const oversized = selectedCars.filter(c => c.height > selectedTruck.maxHeight || c.length > selectedTruck.maxLength);
    const fits = selectedCars.length <= selectedTruck.capacity && totalWeight <= selectedTruck.maxWeight && oversized.length === 0;

    const prompt = `Tengo un ${selectedTruck.name} con capacidad para ${selectedTruck.capacity} vehículos, peso máximo ${selectedTruck.maxWeight}kg, altura máxima ${selectedTruck.maxHeight}m.

Vehículos a cargar:
${selectedCars.map((c, i) => `${i + 1}. ${c.brand} ${c.model} (${c.type}) - Altura: ${c.height}m, Longitud: ${c.length}m, Peso: ${c.weight}kg`).join('\n')}

Total: ${selectedCars.length} vehículos, ${totalWeight}kg

${fits ? '¿Cómo distribuyo óptimamente estos vehículos en el camión (nivel superior e inferior)? Da instrucciones específicas de carga.' : '¿Cómo puedo adaptar esta carga? ¿Qué vehículos debo separar o qué camión alternativo necesito?'}`;

    const res = await callClaude(prompt);
    setResult({ fits, totalWeight, oversized, text: res });
    setLoading(false);
  };

  return (
    <div>
      <h2 style={{ color: "#f59e0b", marginBottom: 20, fontFamily: "'Rajdhani', sans-serif", fontSize: 22 }}>🚗 Calculadora de Carga</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div>
          <label style={{ color: "#9ca3af", fontSize: 13, display: "block", marginBottom: 8 }}>Tipo de camión:</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TRUCK_TYPES.map(t => (
              <button key={t.id} onClick={() => setSelectedTruck(t)} style={{
                padding: "10px 14px", borderRadius: 8, textAlign: "left",
                background: selectedTruck.id === t.id ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
                border: selectedTruck.id === t.id ? "1px solid #f59e0b" : "1px solid rgba(255,255,255,0.08)",
                color: selectedTruck.id === t.id ? "#f59e0b" : "#9ca3af",
                cursor: "pointer", fontSize: 13,
              }}>
                {t.icon} {t.name} — {t.capacity} veh. máx
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ color: "#9ca3af", fontSize: 13, display: "block", marginBottom: 8 }}>
            Vehículos a cargar ({selectedCars.length}/{selectedTruck.capacity}):
          </label>
          <div style={{ maxHeight: 160, overflowY: "auto", marginBottom: 8 }}>
            {selectedCars.map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 6, marginBottom: 4, fontSize: 12 }}>
                <span>{c.brand} {c.model}</span>
                <button onClick={() => removeCar(c.id)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
            ))}
          </div>
          <select onChange={e => { if (e.target.value) { addCar(CAR_MODELS[parseInt(e.target.value)]); e.target.value = ""; }}}
            style={{ width: "100%", padding: "8px 12px", background: "#1a2332", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 13 }}>
            <option value="">+ Añadir vehículo...</option>
            {CAR_MODELS.map((c, i) => (
              <option key={i} value={i}>{c.brand} {c.model} ({c.type})</option>
            ))}
          </select>
        </div>
      </div>

      <button onClick={calculate} disabled={loading || selectedCars.length === 0} style={{
        padding: "12px 24px", borderRadius: 8, border: "none", cursor: "pointer",
        background: selectedCars.length > 0 ? "linear-gradient(135deg, #f59e0b, #d97706)" : "rgba(255,255,255,0.05)",
        color: selectedCars.length > 0 ? "#000" : "#666", fontWeight: 700, fontSize: 14,
      }}>
        {loading ? "Calculando..." : "🔢 Calcular configuración de carga"}
      </button>

      {result && (
        <div style={{ marginTop: 20, padding: 20, borderRadius: 10, background: result.fits ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${result.fits ? "#10b981" : "#ef4444"}` }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ padding: "4px 12px", borderRadius: 20, background: result.fits ? "#10b981" : "#ef4444", color: "#000", fontSize: 12, fontWeight: 700 }}>
              {result.fits ? "✅ CARGA VÁLIDA" : "❌ PROBLEMA DE CARGA"}
            </span>
            <span style={{ color: "#9ca3af", fontSize: 13 }}>Peso total: {result.totalWeight.toLocaleString()}kg / {selectedTruck.maxWeight.toLocaleString()}kg</span>
            {result.oversized.length > 0 && <span style={{ color: "#f87171", fontSize: 13 }}>⚠️ {result.oversized.length} veh. sobredimensionados</span>}
          </div>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, color: "#e2e8f0" }}>{result.text}</div>
        </div>
      )}
    </div>
  );
}

function RoutePlanner() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [vehicles, setVehicles] = useState(6);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const plan = async () => {
    if (!origin || !destination) return;
    setLoading(true);
    const prompt = `Planifica una ruta de transporte de automóviles en camión portacoches de ${origin} a ${destination} con ${vehicles} vehículos.

Incluye:
1. RUTA ÓPTIMA: autopistas principales, distancia km, tiempo estimado
2. PARADAS OBLIGATORIAS: según reglamento 561/2006 (tiempos conducción/descanso)
3. RESTRICCIONES: por países, fines de semana, túneles/puentes con límites altura
4. PEAJES: estimación por países
5. DOCUMENTACIÓN: CMR y documentos necesarios por frontera
6. ALERTAS: condiciones especiales, pasos de montaña, zonas ZBE
7. COSTE ESTIMADO: combustible, peajes, dietas conductor`;

    const res = await callClaude(prompt);
    setResult(res);
    setLoading(false);
  };

  return (
    <div>
      <h2 style={{ color: "#3b82f6", marginBottom: 20, fontFamily: "'Rajdhani', sans-serif", fontSize: 22 }}>🗺️ Planificador de Ruta Europa</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 6 }}>Origen:</label>
          <input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Ej: Madrid, España"
            style={{ width: "100%", padding: "10px 14px", background: "#1a2332", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 6 }}>Destino:</label>
          <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Ej: Múnich, Alemania"
            style={{ width: "100%", padding: "10px 14px", background: "#1a2332", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 6 }}>Vehículos:</label>
          <input type="number" value={vehicles} onChange={e => setVehicles(e.target.value)} min={1} max={10}
            style={{ width: "100%", padding: "10px 14px", background: "#1a2332", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
        </div>
      </div>
      <button onClick={plan} disabled={loading || !origin || !destination} style={{
        padding: "12px 24px", borderRadius: 8, border: "none", cursor: "pointer",
        background: origin && destination ? "linear-gradient(135deg, #3b82f6, #1d4ed8)" : "rgba(255,255,255,0.05)",
        color: origin && destination ? "#fff" : "#666", fontWeight: 700, fontSize: 14,
      }}>
        {loading ? "Planificando..." : "🗺️ Planificar ruta"}
      </button>
      {result && (
        <div style={{ marginTop: 20, padding: 20, borderRadius: 10, background: "rgba(59,130,246,0.08)", border: "1px solid #3b82f6", whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, color: "#e2e8f0" }}>
          {result}
        </div>
      )}
    </div>
  );
}

function ClientNotifier() {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [eta, setEta] = useState("");
  const [address, setAddress] = useState("");
  const [language, setLanguage] = useState("es");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!clientName || !vehicle || !eta) return;
    setLoading(true);
    const langs = { es: "español", en: "inglés", de: "alemán", fr: "francés", it: "italiano", ro: "rumano" };
    const prompt = `Genera un email profesional de aviso de entrega de vehículo para KSK Transport en ${langs[language]}.

Datos:
- Cliente: ${clientName}
- Email: ${clientEmail || "no indicado"}
- Vehículo: ${vehicle}
- Llegada estimada: ${eta}
- Dirección de entrega: ${address || "según CMR"}

El email debe:
1. Ser profesional y cordial
2. Informar de la llegada estimada del camión portacoches
3. Pedir confirmación de disponibilidad del cliente
4. Indicar que necesitan espacio para maniobrar un camión de gran tonelaje
5. Dar un número de contacto del transportista (usar 612 XXX XXX como placeholder)
6. Incluir instrucciones para la entrega

Genera SOLO el email, sin explicaciones adicionales.`;

    const res = await callClaude(prompt);
    setResult(res);
    setLoading(false);
  };

  return (
    <div>
      <h2 style={{ color: "#10b981", marginBottom: 20, fontFamily: "'Rajdhani', sans-serif", fontSize: 22 }}>📱 Avisos Automáticos a Clientes</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {[
          { label: "Nombre del cliente", value: clientName, set: setClientName, placeholder: "Juan García" },
          { label: "Email del cliente", value: clientEmail, set: setClientEmail, placeholder: "cliente@email.com" },
          { label: "Vehículo", value: vehicle, set: setVehicle, placeholder: "BMW Serie 3, matrícula 1234ABC" },
          { label: "Llegada estimada", value: eta, set: setEta, placeholder: "Martes 18 de marzo, 10:00-14:00h" },
        ].map(f => (
          <div key={f.label}>
            <label style={{ color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 6 }}>{f.label}:</label>
            <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
              style={{ width: "100%", padding: "10px 14px", background: "#1a2332", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 13, boxSizing: "border-box" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 6 }}>Dirección de entrega:</label>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Calle Mayor 1, 28001 Madrid"
            style={{ width: "100%", padding: "10px 14px", background: "#1a2332", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 13, boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 6 }}>Idioma del email:</label>
          <select value={language} onChange={e => setLanguage(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", background: "#1a2332", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 13 }}>
            <option value="es">🇪🇸 Español</option>
            <option value="en">🇬🇧 Inglés</option>
            <option value="de">🇩🇪 Alemán</option>
            <option value="fr">🇫🇷 Francés</option>
            <option value="it">🇮🇹 Italiano</option>
            <option value="ro">🇷🇴 Rumano</option>
          </select>
        </div>
      </div>
      <button onClick={generate} disabled={loading || !clientName || !vehicle || !eta} style={{
        padding: "12px 24px", borderRadius: 8, border: "none", cursor: "pointer",
        background: clientName && vehicle && eta ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(255,255,255,0.05)",
        color: clientName && vehicle && eta ? "#000" : "#666", fontWeight: 700, fontSize: 14,
      }}>
        {loading ? "Generando..." : "✉️ Generar email de aviso"}
      </button>
      {result && (
        <div style={{ marginTop: 20, padding: 20, borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid #10b981" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ color: "#10b981", fontWeight: 700, fontSize: 13 }}>✅ Email generado</span>
            <button onClick={() => navigator.clipboard.writeText(result)} style={{
              padding: "4px 12px", borderRadius: 6, background: "rgba(16,185,129,0.2)", border: "1px solid #10b981",
              color: "#10b981", fontSize: 12, cursor: "pointer",
            }}>📋 Copiar</button>
          </div>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, color: "#e2e8f0" }}>{result}</div>
        </div>
      )}
    </div>
  );
}

function AddressVerifier() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (!address) return;
    setLoading(true);
    const prompt = `Soy transportista con un camión portacoches (remolque de 19 metros de longitud total, 4 metros de altura, necesita radio de giro de al menos 25 metros).

Necesito entregar vehículos en esta dirección: "${address}"

Analiza:
1. ¿Es accesible esta dirección para un camión de gran tonelaje? (calles estrechas, centros históricos, zonas peatonales, etc.)
2. ¿Hay restricciones conocidas en esa zona? (ZBE, horarios, peso máximo)
3. Si NO es accesible, sugiere 2-3 puntos alternativos de entrega cercanos (polígonos industriales, grandes aparcamientos, gasolineras con espacio)
4. Instrucciones específicas para llegar con el camión si es posible
5. Recomendación final clara: ✅ ACCESIBLE / ⚠️ ACCESO DIFÍCIL / ❌ NO ACCESIBLE`;

    const res = await callClaude(prompt);
    setResult(res);
    setLoading(false);
  };

  return (
    <div>
      <h2 style={{ color: "#a855f7", marginBottom: 20, fontFamily: "'Rajdhani', sans-serif", fontSize: 22 }}>📍 Verificador de Acceso para Camión</h2>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>Verifica si la dirección de entrega del CMR es accesible para un camión portacoches de gran tonelaje</p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 6 }}>Dirección de entrega (del CMR):</label>
        <input value={address} onChange={e => setAddress(e.target.value)}
          placeholder="Ej: Calle Mayor 5, 28001 Madrid, España"
          style={{ width: "100%", padding: "12px 16px", background: "#1a2332", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
      </div>
      <button onClick={verify} disabled={loading || !address} style={{
        padding: "12px 24px", borderRadius: 8, border: "none", cursor: "pointer",
        background: address ? "linear-gradient(135deg, #a855f7, #7c3aed)" : "rgba(255,255,255,0.05)",
        color: address ? "#fff" : "#666", fontWeight: 700, fontSize: 14,
      }}>
        {loading ? "Verificando..." : "🔍 Verificar acceso"}
      </button>

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        {["Calle Sierpes 10, Sevilla", "Polígono Industrial, Leganés", "Gran Vía 1, Madrid", "Rambla Catalunya, Barcelona"].map(ex => (
          <button key={ex} onClick={() => setAddress(ex)} style={{
            padding: "6px 12px", borderRadius: 16, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)",
            color: "#a855f7", fontSize: 11, cursor: "pointer",
          }}>{ex}</button>
        ))}
      </div>

      {result && (
        <div style={{ marginTop: 20, padding: 20, borderRadius: 10, background: "rgba(168,85,247,0.08)", border: "1px solid #a855f7", whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, color: "#e2e8f0" }}>
          {result}
        </div>
      )}
    </div>
  );
}

export default function KSKDashboard() {
  const [activeTab, setActiveTab] = useState("cargo");

  const tabColors = { cargo: "#f59e0b", route: "#3b82f6", notify: "#10b981", address: "#a855f7" };
  const color = tabColors[activeTab];

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", fontFamily: "'DM Sans', sans-serif", color: "#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Rajdhani:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select { outline: none; }
        button { font-family: inherit; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ background: "rgba(8,12,20,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", borderRadius: 10, padding: "8px 14px", fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>
            🚛 KSK TRANSPORT
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Pro Dashboard v2.0</div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
          <span>🇪🇺 Europa</span>
          <span>📋 CMR</span>
          <span>⚡ IA Activa</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "rgba(8,12,20,0.9)", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", overflowX: "auto", padding: "0 28px" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "14px 20px", background: "transparent", border: "none",
            borderBottom: activeTab === t.id ? `2px solid ${tabColors[t.id]}` : "2px solid transparent",
            color: activeTab === t.id ? tabColors[t.id] : "rgba(255,255,255,0.4)",
            fontSize: 13, fontWeight: activeTab === t.id ? 600 : 400,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
            transition: "all 0.2s",
          }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 28, maxWidth: 1000, margin: "0 auto" }}>
        {activeTab === "cargo" && <CargoCalculator />}
        {activeTab === "route" && <RoutePlanner />}
        {activeTab === "notify" && <ClientNotifier />}
        {activeTab === "address" && <AddressVerifier />}
      </div>
    </div>
  );
}
