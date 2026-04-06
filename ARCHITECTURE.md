# SmartControl — Documentación Técnica

> **Versión documentada:** Abril 2026  
> **Stack:** Electron · Vite/React · Fastify · MongoDB · Python (tinytuya)

---

## 1. Descripción General

**SmartControl** es una app de escritorio para gestionar dispositivos IoT del ecosistema **Tuya**. Permite:

- **Escanear** la red WiFi local para descubrir dispositivos Tuya.
- **Vincular** dispositivos obteniendo su `LocalKey` de la nube (necesaria para cifrado UDP).
- **Monitorizar** el estado en tiempo real de cada dispositivo (Data Points).
- **Controlar** dispositivos: encender, apagar, cambiar valores.
- **Desvincular** dispositivos de la base de datos local.

---

## 2. Arquitectura

```
┌──────────────────────────────────────────────────────────┐
│                     Electron Shell                       │
│   ┌─────────────────────┐   ┌────────────────────────┐  │
│   │  Frontend (React)   │   │  Backend (Fastify :3000)│  │
│   │  Vite dev server    │◄─►│                         │  │
│   │                     │   │  /devices (CRUD)        │  │
│   │  Dashboard          │   │  /devices/scan          │  │
│   │  Devices            │   │  /devices/pair          │  │
│   │  ScanDevices        │   │  /devices/:id/state     │  │
│   └─────────────────────┘   │  /devices/:id/command   │  │
│                              │  /devices/check-ports   │  │
│                              │  /devices/kill-ports    │  │
│                              └──────────┬──────────────┘  │
│                                         │ execAsync        │
│                              ┌──────────▼──────────────┐  │
│                              │  Subprocesos Python      │  │
│                              │  (tinytuya como sidecar) │  │
│                              └──────────┬──────────────┘  │
│                                         │                  │
│                              ┌──────────▼──────────────┐  │
│                              │  MongoDB                  │  │
│                              │  Colección: devices       │  │
│                              └─────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
         │ UDP broadcast (puertos 6666, 6667, 7000)
┌────────▼──────────────┐
│  Red WiFi local        │
│  Dispositivos Tuya     │
└────────────────────────┘
```

**¿Por qué Electron?** Se necesita acceso a red UDP local y a subprocesos del sistema (netstat, taskkill), imposibles en un navegador estándar.

**¿Por qué Python como sidecar?** `tinytuya` es la librería más completa para el protocolo Tuya (soporta AES-128 en versiones 3.1–3.5). Reescribir el cifrado en TypeScript sería inviable de mantener.

---

## 3. Estructura del Proyecto

```
SmartControl/
├── .env                          ← Variables de entorno (NO commitear)
├── ARCHITECTURE.md               ← Este archivo
├── packages/
│   ├── backend/src/
│   │   ├── server.ts             ← Entrada Fastify
│   │   ├── db.ts                 ← connectDB (referencia)
│   │   ├── models/
│   │   │   ├── Device.ts         ← Schema Mongoose del dispositivo
│   │   │   └── User.ts           ← Schema Mongoose del usuario (futuro)
│   │   ├── routes/
│   │   │   └── deviceRoutes.ts   ← TODAS las rutas /devices
│   │   ├── utils/
│   │   │   ├── deviceMappers.ts  ← Mapper Tuya → IDeviceState
│   │   │   └── seed.ts           ← Seed de datos demo
│   │   └── scripts/              ← Subprocesos Python
│   │       ├── cloud_scan.py
│   │       ├── cloud_pair.py
│   │       ├── get_status.py
│   │       ├── get_statuses.py
│   │       ├── get_schema.py
│   │       └── send_command.py
│   ├── frontend/src/
│   │   ├── App.tsx               ← Router principal
│   │   ├── index.css             ← @import "tailwindcss"
│   │   ├── components/
│   │   │   ├── Layout.tsx        ← Sidebar + Outlet
│   │   │   ├── Sidebar.tsx       ← Navegación lateral
│   │   │   ├── DeviceCard.tsx    ← Tarjeta compacta
│   │   │   ├── DeviceDetailsModal.tsx ← Modal con control en vivo
│   │   │   └── PortConflictModal.tsx  ← Modal conflicto de puertos
│   │   └── pages/
│   │       ├── Dashboard.tsx     ← Resumen general
│   │       ├── Devices.tsx       ← Lista completa
│   │       └── ScanDevices.tsx   ← Escaneo y vinculación
│   └── shared/
│       └── types.ts              ← Interfaces TypeScript compartidas
└── electron/main.cjs             ← Entrada Electron
```

---

## 4. Backend (Fastify)

### server.ts

1. Carga `.env` desde la raíz del monorepo.
2. Conecta MongoDB de forma no bloqueante (el servidor responde aunque la BD tarde en conectar).
3. Registra CORS con `origin: true` (válido en Electron/dev; restringir en producción).
4. Registra todas las rutas bajo `/devices`.
5. Escucha en `0.0.0.0:3000`.

### deviceRoutes.ts — Helpers internos

| Helper | Propósito |
|--------|-----------|
| `pythonEnv(extra?)` | Construye el entorno para subprocesos Python: hereda `process.env`, añade `PYTHONIOENCODING=utf-8` y `PYTHONUTF8=1` para garantizar UTF-8 en Windows. |
| `extractJson(stdout)` | Extrae y parsea el primer `{...}` de stdout. Ignora logs previos al JSON. |
| `checkTuyaPorts()` | Comprueba los puertos 6666, 6667, 7000. `netstat` en Windows, `lsof` en Unix. |
| `killProcesses(pids)` | Termina procesos por PID. `taskkill /F` en Windows, `kill -9` en Unix. |

### API Routes

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/devices/` | Lista dispositivos. Consulta estado UDP en vivo y actualiza BD en background. |
| `POST` | `/devices/` | Crea dispositivo manualmente. |
| `GET` | `/devices/check-ports` | Verifica si puertos Tuya están libres. |
| `POST` | `/devices/kill-ports` | Termina procesos bloqueantes. Espera 800ms para liberar sockets. |
| `POST` | `/devices/scan` | Escanea red local. Devuelve **409** si hay conflicto de puertos. |
| `POST` | `/devices/pair` | Obtiene LocalKey de Tuya Cloud y guarda el dispositivo en la BD. |
| `GET` | `/devices/:id/state` | Estado en tiempo real vía UDP. Descarga schema si no está en la BD. |
| `POST` | `/devices/:id/command` | Envía comando DP (encender/apagar/etc.) vía UDP. |
| `DELETE` | `/devices/:id` | Elimina dispositivo de la BD (hardware no afectado). |

---

## 5. Frontend (React)

### Páginas

**Dashboard** — Carga todos los dispositivos (`GET /devices`). Muestra estadísticas, inventario por tipo y las 4 tarjetas más recientes. Propaga `onDeleted` para re-fetch tras eliminar.

**Devices** — Grid completo de dispositivos. Mismo patrón de re-fetch que Dashboard.

**ScanDevices** — Flujo de escaneo y vinculación. Diseño dark-mode. Gestiona:
- Estado 409 → `PortConflictModal` → resolución → re-scan automático.
- `humanizePairError()`: traduce errores técnicos a mensajes en lenguaje natural.

### Componentes Clave

**DeviceCard** — Tarjeta compacta. Detecta estado on/off leyendo el DP de switch (primero por schema, luego heurística en DP `1`/`20`). Botón 🗑️ con modal de confirmación animado.

**DeviceDetailsModal** — Modal completo. Llama `GET /devices/:id/state` al abrirse. Renderiza DPs con tipos: Boolean como toggle, Integer con unidades parseadas del schema, String como texto. Botón de power + botón 🗑️ con confirmación inline.

**PortConflictModal** — Se activa con respuesta 409. Muestra los procesos bloqueantes. Opción de cierre manual o automático (`POST /devices/kill-ports`).

---

## 6. Scripts Python

Todos los scripts tienen al inicio:
```python
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
```
Crítico para evitar caracteres corruptos en Windows (CP1252 por defecto).

La comunicación con Node es **solo por stdout en JSON**. El stderr se usa para logs que Node ignora.

| Script | Entrada (env) | Salida |
|--------|---------------|--------|
| `cloud_scan.py` | `TUYA_API_REGION/KEY/SECRET` | Array JSON de dispositivos de la cuenta |
| `cloud_pair.py` | `TUYA_DEVICE_ID` + credenciales cloud | `{ device_id, local_key, name, product_name }` |
| `get_status.py` | `TUYA_DEVICE_ID/IP/LOCAL_KEY/VERSION` | `{ status, data: { dps } }` |
| `get_statuses.py` | Ruta a JSON temporal con array de dispositivos | `{ success, results: [{ _id, dps }] }` — paralelo con ThreadPoolExecutor |
| `get_schema.py` | `TUYA_DEVICE_ID` + credenciales cloud | `{ success, schema: [{ dp_id, code, type, values }] }` |
| `send_command.py` | Credenciales + `TUYA_DP` + `TUYA_VALUE` | `{ status, response }` |

---

## 7. Flujos Principales

### Escaneo y vinculación

```
"Escanear" →
  POST /scan
    ├─ Puerto ocupado → 409 → PortConflictModal
    │     ├─ Manual: usuario cierra apps → re-scan
    │     └─ Auto: POST /kill-ports → re-scan
    └─ Puertos libres:
         python -m tinytuya scan → snapshot.json
         cloud_scan.py → lista nube
         Merge por TuyaID
         Filtro anti-duplicados (BD)
         → Lista de dispositivos nuevos

"Vincular" →
  POST /pair
    cloud_pair.py → local_key
    Guardar en MongoDB
    → Desaparece de la lista de escaneo
```

### Estado en tiempo real

```
Abrir DeviceDetailsModal →
  GET /devices/:id/state
    Si sin schema → get_schema.py → Tuya Cloud → persiste en BD
    get_status.py → UDP → DPs en vivo
    → Modal muestra DPs con tipos y valores

"Encender/Apagar" →
  POST /devices/:id/command
    send_command.py → UDP Set(dp, value)
```

---

## 8. Base de Datos (MongoDB)

### Colección `devices` — Documento completo

```json
{
  "_id": "ObjectId",
  "name": "Bombilla Salón",
  "type": "smart-bulb",
  "connectionType": "WiFi",
  "image": "https://images.tuyaeu.com/...",
  "status": "online",
  "attributes": {
    "tuyaId": "bf1234567890abcdef",
    "ip": "192.168.1.42",
    "localKey": "abcdef1234567890",
    "version": "3.3",
    "productKey": "abc123",
    "dps": { "20": true, "21": "white", "22": 1000, "26": 100 },
    "schema": [
      { "dp_id": 20, "code": "switch_led", "type": "Boolean", "values": "{}" },
      { "dp_id": 22, "code": "bright_value", "type": "Integer",
        "values": "{\"min\":10,\"max\":1000,\"scale\":0,\"step\":1,\"unit\":\"\"}" }
    ]
  },
  "createdAt": "2026-04-06T20:00:00.000Z",
  "updatedAt": "2026-04-06T21:00:00.000Z"
}
```

`attributes` usa `Schema.Types.Mixed` porque la estructura varía por tipo de dispositivo.

### Índices recomendados (producción)

```js
db.devices.createIndex({ "attributes.tuyaId": 1 }, { sparse: true });
db.devices.createIndex({ owner: 1 });
```

---

## 9. Variables de Entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `MONGO_URI` | Sí | URI MongoDB. Default: `mongodb://127.0.0.1:27017/test` |
| `PORT` | No | Puerto Fastify. Default: `3000` |
| `TUYA_API_REGION` | Para cloud | Región: `eu`, `us`, `cn`, `in` |
| `TUYA_API_KEY` | Para cloud | Access ID del proyecto en platform.tuya.com |
| `TUYA_API_SECRET` | Para cloud | Access Secret del proyecto en platform.tuya.com |

> ⚠️ NUNCA commitear el `.env`. Añadirlo a `.gitignore`.

---

## 10. Decisiones de Diseño

**`pythonEnv()` con doble flag UTF-8** — `PYTHONIOENCODING` afecta al pipe del subproceso; `PYTHONUTF8=1` activa el modo UTF-8 de Python a nivel de runtime. La doble protección garantiza correcta decodificación de nombres con tildes, caracteres chinos o árabes.

**`extractJson(stdout)`** — Los scripts Python pueden emitir texto antes del JSON (progress logs hacia stdout en edge cases). Buscar el primer/último `{`/`}` aísla el JSON real de forma robusta.

**`os.tmpdir()` para archivos temporales** — `get_statuses.py` necesita un archivo temporal. Usar el directorio de trabajo (`cwd()`) podía dejar residuos en el directorio del backend. `os.tmpdir()` es el lugar correcto para archivos efímeros.

**`maxBuffer: 10MB` en execAsync** — tinytuya puede devolver respuestas grandes (muchos dispositivos con schema completo). El default de Node (1MB) podía truncar la salida y invalidar el JSON.

---

## 11. Limitaciones Conocidas

| Limitación | Impacto | Mitigación |
|------------|---------|------------|
| **Protocolo v3.4/v3.5** | Estos protocolos pueden requerir que la `localKey` esté precargada | Resetear y re-emparejar desde la app oficial de Tuya si falla |
| **AP Isolation** | Si el router tiene aislamiento de clientes, el scan UDP no funciona | Desactivar aislamiento en el router |
| **Rate limiting Tuya Cloud** | Demasiados emparejamientos seguidos puede bloquear temporalmente la API | El frontend muestra mensaje claro; esperar y reintentar |
| **Sin autenticación** | El backend acepta cualquier petición en la red local | Añadir JWT si se expone fuera de la red local |
| **CORS abierto** | `origin: true` acepta cualquier origen | Restringir en producción si hay exposición externa |
