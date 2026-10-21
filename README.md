# EcoPlaza Smart Waste Platform

EcoPlaza es una aplicación de escritorio para registrar, controlar y comercializar residuos aprovechables. La versión actual combina una interfaz React/TypeScript empaquetada con Tauri 2 y un backend administrado en Supabase (Auth + PostgreSQL).

## Estado actual

La aplicación trabaja con datos operativos reales aislados por usuario para:

- autenticación, registro, verificación y recuperación de contraseña con Supabase Auth;
- perfiles de usuario;
- gestión de contenedores;
- monitoreo y telemetría de sensores IoT persistente (nivel de llenado volumétrico, nivel de batería, temperatura interna y marcas temporales) con soporte de simulación y telemetría bidireccional;
- registro e historial de residuos;
- inventario disponible;
- directorio de compradores;
- ventas transaccionales;
- panel e informes con filtros por fecha;
- exportación CSV y Excel;
- asistente inteligente conversacional conectado de forma reactiva con heurísticas de flota IoT viva, proyecciones financieras, análisis de inventario y acciones contextuales hacia la consola de sensores.

## Arquitectura

```text
React 19 + TypeScript + Vite
        │
        ├── Supabase Auth
        ├── Supabase PostgREST / PostgreSQL
        │       ├── RLS por owner_id
        │       ├── Transacciones y RPC (create_sale)
        │       └── Telemetría IoT persistente (`sensor_telemetry`)
        ├── Subsistema IoT & Telemetría Predictiva
        │       ├── Sensores ultrasónicos HC-SR04 y microcontroladores ESP32
        │       ├── Telemetría bidireccional (nivel de llenado %, batería %, temperatura °C)
        │       └── Motor analítico de salud de flota (`iotAnalyticsService`)
        ├── Asistente IA Conversacional Reactivo (`assistantService`)
        │       ├── Heurísticas operativas, financieras y de envejecimiento de stock
        │       ├── Diagnóstico en lenguaje natural de la flota IoT (baterías, despacho urgente, salud global)
        │       └── Sugerencias de acción contextual interactiva hacia `/sensors`
        ├── CSV y Excel (ExcelJS)
        └── Tauri 2
                ├── Diálogo nativo para guardar
                └── Escritura de archivos autorizada
```

La aplicación consulta Supabase directamente con una clave publicable. La seguridad de datos no depende de ocultar esa clave: las migraciones activan RLS y limitan cada fila al usuario autenticado. Las ventas se crean mediante la función PostgreSQL `create_sale`, que valida comprador y residuo, registra la venta y marca el residuo como vendido dentro de una única transacción.

### Subsistema IoT y Telemetría Predictiva con Asistente IA

El ecosistema integra medición física y heurísticas analíticas avanzadas:

1. **Dispositivos y Microcontroladores (ESP32 + HC-SR04):**
   - Sensores de distancia ultrasónicos HC-SR04 acoplados a microcontroladores ESP32 para determinar con precisión milimétrica la altura libre y el porcentaje de llenado volumétrico en cada contenedor.
   - Parámetros de telemetría bidireccional reportados: porcentaje de llenado (`fillLevelPercent`), estado de la batería (`batteryLevelPercent`), temperatura ambiente interna (`temperatureCelsius`) y marca temporal en estándar ISO (`recordedAt`).
   - Soporte de simulación interactiva con validación estricta de rangos para auditorías en campo y pruebas sintéticas.

2. **Motor Analítico de Salud de Flota (`iotAnalyticsService`):**
   - Agregación de telemetría viva para calcular el índice de salud global de la red (`severity`: Óptimo, Advertencia, Crítico o Sin Telemetría).
   - Detección de colas de recolección y despacho urgente: prioridad crítica ante contenedores con llenado $\ge 90\%$ y prioridad programada para niveles $\ge 75\%$.
   - Detección proactiva de dispositivos con nivel de batería crítico ($< 20\%$) para mantenimiento preventivo antes de perder visibilidad del sensor.

3. **Asistente IA Conversacional Reactivo (`assistantService` & `AssistantPanel`):**
   - Procesamiento de lenguaje natural enfocado en analítica de residuos, tendencias de ventas, valoración de stock y telemetría de flota.
   - Enlace reactivo con telemetría viva: al consultar por sensores, baterías o recolecciones críticas, el asistente captura asíncronamente las instantáneas actuales de los contenedores mediante `listContainers` y `getLatestTelemetry`.
   - Generación de respuestas contextualizadas en español e inglés, enriquecidas con sugerencias de acción accesibles (`aria-label` internacionalizado) que permiten navegar directamente hacia la consola operativa `/sensors`.

## Módulos

| Módulo | Fuente de datos y alcance |
| --- | --- |
| Inicio | Métricas reales de residuos, inventario y ventas; tarjetas de sensores demostrativas opcionales |
| Sensores | Consola operativa de sensores IoT: monitoreo en tiempo real (ESP32 + HC-SR04), telemetría viva, simulación interactiva, histórico de lecturas y gestión de contenedores |
| Residuos | Registro e historial real en PostgreSQL; bloque demostrativo separado |
| Inventario | Residuos reales disponibles para venta |
| Compradores | Alta, edición, filtros e historial real de compras |
| Ventas | Venta completa de un registro disponible mediante una transacción PostgreSQL |
| Informes | Distribución, rendimiento, tendencias, variación mensual y ranking de compradores |
| Configuración | Idioma, tema y visibilidad persistente de datos demostrativos |
| Asistente IA | Asistente inteligente reactivo con consultas en lenguaje natural sobre ventas, inventario y diagnóstico predictivo de flota IoT viva con navegación contextual hacia `/sensors` |

La preferencia de datos demostrativos solo controla bloques locales y métricas simuladas. No altera filas de Supabase ni oculta la gestión real de contenedores.

## Persistencia y seguridad

Las migraciones de [supabase/migrations](supabase/migrations) crean perfiles, contenedores, telemetría de sensores, residuos, compradores y ventas. Incluyen:

- claves foráneas que conservan el mismo propietario entre entidades;
- políticas RLS basadas en `auth.uid()`;
- validaciones de categorías, pesos, precios, niveles porcentuales y estados;
- venta única por registro de residuo;
- revocación de escrituras directas sensibles y creación de ventas mediante RPC.

No se debe usar una clave `service_role` en el frontend. El cliente valida expresamente que la variable contenga una clave publicable.

## Requisitos

- Node.js 24 y npm 11 (versiones verificadas durante la auditoría).
- Rust 1.90 o posterior, según `rust-version` de Tauri.
- En Windows: Microsoft C++ Build Tools y WebView2 Runtime.
- Un proyecto Supabase con las migraciones del repositorio aplicadas.

## Configuración local

```powershell
git clone https://github.com/luis-sdiaz/ecoplaza-smart-waste-platform.git
cd ecoplaza-smart-waste-platform\frontend
npm ci
Copy-Item .env.example .env.local
```

Edite `frontend/.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_publishable_key
```

Los archivos `.env*` locales están ignorados por Git, salvo `.env.example`. No confirme secretos ni claves administrativas.

## Desarrollo y verificación

Todos los comandos siguientes se ejecutan dentro de `frontend`:

```powershell
npm run dev       # interfaz web de desarrollo
npx tauri dev     # aplicación de escritorio en desarrollo
npm run build     # TypeScript completo + bundle web de producción
npm run lint      # ESLint
npm test          # pruebas Node.js y Vitest/jsdom
```

`npm test` ejecuta dos grupos:

- `test:node`: cálculos, filtros, exportaciones y flujos puros con el runner de Node;
- `test:components`: interacciones React con Vitest, Testing Library y jsdom.

Los tres proyectos TypeScript (`app`, configuración y pruebas) forman parte de `tsc -b`, por lo que el build también valida los archivos de prueba.

## Compilación del instalador de Windows

Desde `frontend`, con la cadena de Rust y las herramientas de Windows instaladas:

```powershell
npx tauri build
```

Tauri ejecuta primero `npm run build` y genera los artefactos bajo `frontend/src-tauri/target/release/bundle/`. Para distribución pública todavía deben definirse firma de código, canal de actualización y políticas de entrega.

## Estructura relevante

```text
ecoplaza-smart-waste-platform/
├── README.md
├── supabase/
│   └── migrations/
└── frontend/
    ├── src/
    │   ├── auth/
    │   ├── components/
    │   ├── context/
    │   ├── pages/
    │   └── services/
    ├── tests/
    ├── src-tauri/
    ├── .env.example
    └── package.json
```

## Trabajo pendiente

- aprovisionamiento de hardware físico de campo en producción y firmware C++/MicroPython para ESP32 sobre WiFi/MQTT;
- endurecer la configuración de producción, incluida una CSP explícita para Tauri;
- definir firma y distribución de instaladores;
- establecer el proceso de despliegue automatizado cuando se autorice (los workflows de GitHub Actions permanecen desactivados).

## Autor y licencia

Proyecto académico de Luis Sebastian Diaz para la Universidad Cooperativa de Colombia. No se ha declarado una licencia de distribución en el repositorio.
