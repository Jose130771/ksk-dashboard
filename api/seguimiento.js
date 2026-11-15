const jwt = require('jsonwebtoken');
const { get, put, BlobPreconditionFailedError } = require('@vercel/blob');

// SEGUIMIENTO DE ÓRDENES
//
// Guarda en un Blob privado (un solo JSON) las órdenes que pasan por el cotejo y
// el estado de cada coche: pendiente → cargado → (intermedio) → entregado.
// Con eso el panel sabe qué coches siguen sin foto de descarga cuando al mismo
// camión ya le ha llegado otra orden, y cuánto lleva un coche en un punto intermedio.

const ARCHIVO = 'seguimiento.json';
const RANGO = { pendiente: 0, cargado: 1, intermedio: 2, entregado: 3 };

const limpiarVin = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const limpiarMat = (m) => String(m || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// La orden a veces trae solo el final del bastidor y el CMR el bastidor entero.
function mismoCoche(a, b) {
  const va = limpiarVin(a.vin), vb = limpiarVin(b.vin);
  if (va.length >= 6 && vb.length >= 6 && (va.endsWith(vb) || vb.endsWith(va))) return true;
  const ma = limpiarMat(a.matricula), mb = limpiarMat(b.matricula);
  return ma.length >= 4 && ma === mb;
}

// Lo que se sabe de un coche nunca se pierde: "pendiente" solo significa que en
// este cotejo no había datos de él, y un coche entregado ya no cambia.
function mezclarCoche(viejo, nuevo, ahora) {
  const c = { ...viejo };
  if (limpiarVin(nuevo.vin).length > limpiarVin(c.vin).length) c.vin = nuevo.vin;
  for (const k of ['modelo', 'matricula', 'destino', 'cmr', 'notas']) if (nuevo[k]) c[k] = nuevo[k];
  const estado = nuevo.estado || 'pendiente';
  if (c.estado !== 'entregado' && estado !== 'pendiente') {
    c.estado = estado;
    if (estado === 'intermedio') {
      c.espera_lugar = nuevo.espera_lugar || c.espera_lugar || '';
      c.espera_desde = nuevo.espera_desde || c.espera_desde || ahora.slice(0, 10);
    }
  }
  if (!c.estado) c.estado = 'pendiente';
  c.actualizado = ahora;
  return c;
}

function guardarOrdenes(datos, ordenes, ahora) {
  for (const o of ordenes || []) {
    const num = String(o.numero || '').toUpperCase().trim();
    if (!num) continue;
    const prev = datos.ordenes[num] || { numero: num, creada: ahora, archivada: false, coches: [] };
    const orden = { ...prev, actualizada: ahora };
    if (o.camion) orden.camion = o.camion;
    if (o.fecha_emision) orden.fecha_emision = o.fecha_emision;
    const coches = [...(prev.coches || [])];
    for (const n of o.coches || []) {
      const i = coches.findIndex(c => mismoCoche(c, n));
      if (i >= 0) coches[i] = mezclarCoche(coches[i], n, ahora);
      else coches.push(mezclarCoche({ estado: 'pendiente' }, n, ahora));
    }
    orden.coches = coches;
    datos.ordenes[num] = orden;
  }
}

async function leer() {
  const r = await get(ARCHIVO, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return { datos: { ordenes: {} }, etag: null };
  const texto = await new Response(r.stream).text();
  return { datos: JSON.parse(texto), etag: r.blob.etag };
}

async function escribir(datos, etag) {
  await put(ARCHIVO, JSON.stringify(datos), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: !!etag,
    ...(etag ? { ifMatch: etag } : {}),
  });
}

// Lee, cambia y guarda. Si otra persona ha guardado a la vez, vuelve a leer y repite.
async function modificar(cambio) {
  for (let intento = 0; intento < 4; intento++) {
    const { datos, etag } = await leer();
    cambio(datos, new Date().toISOString());
    try {
      await escribir(datos, etag);
      return datos;
    } catch (e) {
      const choque = e instanceof BlobPreconditionFailedError || /already exists/i.test(e.message || '');
      if (!choque || intento === 3) throw e;
    }
  }
}

export default async function handler(req, res) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
  } catch (e) {
    return res.status(401).json({ error: 'Sesión caducada o no válida. Cierra sesión y vuelve a entrar.' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return res.status(503).json({ error: 'Falta conectar la base de datos (Blob privado) al proyecto en Vercel.' });
  }

  try {
    if (req.method === 'GET') {
      const { datos } = await leer();
      return res.status(200).json(datos);
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { accion } = req.body || {};
    let datos;
    if (accion === 'guardar') {
      datos = await modificar((d, ahora) => guardarOrdenes(d, req.body.ordenes, ahora));
    } else if (accion === 'coche') {
      // Cambio a mano desde el panel: entregado, o dejado en un punto intermedio.
      const { orden, indice, estado, espera_lugar, espera_desde } = req.body;
      datos = await modificar((d, ahora) => {
        const c = d.ordenes[orden]?.coches?.[indice];
        if (!c) return;
        c.estado = estado;
        if (estado === 'intermedio') {
          c.espera_lugar = espera_lugar || '';
          c.espera_desde = espera_desde || ahora.slice(0, 10);
        }
        c.actualizado = ahora;
      });
    } else if (accion === 'archivar') {
      datos = await modificar((d, ahora) => {
        const o = d.ordenes[req.body.orden];
        if (o) { o.archivada = true; o.actualizada = ahora; }
      });
    } else {
      return res.status(400).json({ error: 'Acción desconocida' });
    }
    return res.status(200).json(datos);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
