# EcoPlaza Smart Waste Platform

EcoPlaza es una plataforma integral y multiplataforma de escritorio para registrar, controlar, telemedir y comercializar residuos aprovechables. Combina una interfaz moderna construida en React 19 y TypeScript empaquetada de forma nativa mediante Tauri 2 (Rust) para Windows, Linux y macOS, respaldada por una arquitectura serverless en Supabase (Auth + PostgreSQL con RLS y RPC transaccional), telemetría física con microcontroladores ESP32 en `firmware/` y un motor de analítica predictiva asistido por IA.

## Estado actual

La plataforma opera con datos operativos reales y aislados por usuario con las siguientes capacidades activas:

- **Autenticación y seguridad de acceso:** Registro, inicio de sesión, verificación de correo y recuperación de contraseñas mediante Supabase Auth.
- **Gestión de perfiles de usuario:** Almacenamiento seguro de metadatos de usuario con aislamiento multi-inquilino.
- **Directorio de contenedores y gemelo 3D:** Modelado interactivo en Three.js / React Three Fiber con monitoreo de niveles y gestión de capacidades físicas.
- **Consola operativa de sensores IoT:** Monitoreo en tiempo real de telemetría física persistente (nivel de llenado volumétrico %, nivel de batería %, temperatura ambiente °C y marcas temporales ISO), simulación de telemetría y diagnóstico de salud de flota (`iotAnalyticsService`).
- **Firmware IoT en C++ para ESP32:** Código fuente completo en `firmware/src/main.cpp` con lectura de sensores ultrasónicos HC-SR04, sensores climáticos DHT22 y semáforo LED de estado visual.
- **Trazabilidad y registro de residuos:** Historial transaccional en PostgreSQL con validaciones de categoría, peso y estados.
- **Inventario disponible y control de merma:** Clasificación de stock en tiempo real y detección de envejecimiento de lotes en bodega.
- **Directorio comercial de compradores:** Gestión de clientes, categorización de actividad comercial y seguimiento de compras.
- **Ventas transaccionales atomizadas:** Creación de ventas mediante la función almacenada PostgreSQL `create_sale`, garantizando consistencia ACID y venta única por lote.
- **Panel de control e informes analíticos:** Dashboards interactivos, métricas financieras en COP, comparativas mensuales y selectores de rangos de fecha colombiana (DD/MM/YYYY).
- **Exportación nativa de datos:** Descarga de reportes en formatos CSV y Excel (.xlsx) estructurados con ExcelJS y diálogos de guardado nativos de escritorio.
- **Asistente IA y Consejero Operativo:** Motor analítico interactivo (`assistantInsightsService`) que calcula la valorización económica del stock, detecta riesgos de merma por tiempo de acopio y recomienda clientes afines, integrado con respuestas en lenguaje natural sobre telemetría IoT viva y navegación contextual.
- **Soporte multiplataforma y blindaje CSP:** Empaquetado universal Tauri 2 para Windows, Linux y macOS con directiva estricta de Content Security Policy (CSP) y principio de mínimo privilegio.
- **Suite de pruebas de alta cobertura:** 312 pruebas automatizadas aprobadas con 100% de éxito (Node.js Test Runner + Vitest).

## Arquitectura del sistema

```text
React 19 + TypeScript 6 + Tailwind CSS 4 + Vite 8
        │
        ├── Supabase Auth & BaaS
        │       ├── Autenticación segura y RLS estricto por owner_id
        │       ├── Transacciones ACID mediante RPC (create_sale)
        │       └── Telemetría IoT persistente (`sensor_telemetry`)
        │
        ├── Entorno de Escritorio Nativo Multiplataforma (Tauri 2 / Rust)
        │       ├── Soporte universal: Windows (NSIS/MSI), Linux (Deb/AppImage) y macOS (DMG/App)
        │       ├── Content Security Policy (CSP) estricta contra ataques XSS
        │       ├── Diálogos nativos de guardado de archivos (`@tauri-apps/plugin-dialog`)
        │       ├── Escritura segura en disco (`@tauri-apps/plugin-fs`)
        │       └── Diagnóstico accesible del runtime de escritorio (`DesktopDiagnosticsModal`)
        │
        ├── Subsistema IoT & Firmware Embebido
        │       ├── Microcontroladores ESP32-WROOM-32 en `firmware/`
        │       ├── Sensor ultrasónico HC-SR04 (distancia y porcentaje de llenado)
        │       ├── Sensor DHT22 (temperatura ambiente y humedad relativa)
        │       ├── Semáforo LED local (indicador de umbrales 0-75-90-100%)
        │       ├── Transmisión HTTPS / MQTT en formato JSON normalizado
        │       └── Motor analítico de salud de flota (`iotAnalyticsService`)
        │
        ├── Asistente IA Conversacional & Consejero Estratégico
        │       ├── Motor de valorización económica de inventario en COP (`assistantInsightsService`)
        │       ├── Detección proactiva de riesgos de merma por antigüedad (>30d moderada, >60d crítica)
        │       ├── Algoritmo de recomendación y emparejamiento de clientes afines
        │       ├── Heurísticas en lenguaje natural sobre telemetría y despacho urgente
        │       └── Acciones contextuales accesibles y bilingües hacia `/sensors` e `/inventory`
        │
        └── Exportaciones Profesionales
                ├── Formato CSV con sanitización monetaria y fechas colombianas
                └── Libros de trabajo Excel (.xlsx) generados con ExcelJS
```

## Subsistemas principales

### 1. Entorno de escritorio multiplataforma (Tauri 2) y seguridad CSP

El runtime de escritorio está configurado en `frontend/src-tauri/tauri.conf.json` para distribución en los tres principales sistemas operativos:
- **Windows:** Empaquetadores NSIS (`currentUser`) y MSI.
- **Linux:** Paquetes Debian (`.deb`) con dependencias de sistema declaradas (`libwebkit2gtk-4.1-0`, `libayatana-appindicator3-1`, `librsvg2-2`) y paquetes portables `AppImage`.
- **macOS:** Empaquetado `.dmg` y `.app` con versión mínima de sistema macOS 10.15 (Catalina).

#### Endurecimiento de Seguridad (CSP):
Se define una directiva estricta de Content Security Policy en `app.security.csp` que mitiga de forma contundente la inyección de código (XSS) y el secuestro de sesiones:
```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.in; worker-src 'self' blob:; object-src 'none'; base-uri 'self';
```
- Restringe conexiones salientes y WebSockets exclusivamente a los dominios de la infraestructura de Supabase.
- Bloquea plugins de terceros obsoletos (`object-src 'none'`) y previene redirección de URIs base (`base-uri 'self'`).
- Permite Web Workers dinámicos (`blob:`) indispensables para el renderizado Three.js del gemelo 3D de contenedores.
- Los permisos de Tauri (`capabilities/default.json`) siguen el principio de mínimo privilegio, limitándose a guardar archivos y abrir diálogos nativos, sin exponer capacidades destructivas ni acceso no controlado a la shell o lectura de disco.

### 2. Firmware C++ para microcontroladores ESP32 (`firmware/`)

El repositorio incluye el código fuente en C++ para microcontroladores ESP32-WROOM-32 y la documentación del circuito de instrumentación física:
- **`firmware/src/main.cpp`:** Código modular compatible con Arduino IDE y PlatformIO. Implementa lectura analógica de distancia con HC-SR04, compensación térmica con sensor DHT22, cálculo porcentual de llenado volumétrico y control del semáforo LED de estado local.
- **`firmware/README.md`:** Especificación detallada de pines GPIO, esquemático de conexionado con divisor de tensión resistivo (resistencia de 1kΩ y 2kΩ para proteger el pin GPIO del ESP32 frente a los 5V del HC-SR04 Echo) y estructura del payload JSON transmitido hacia la nube.

### 3. Motor de analítica predictiva y Asistente IA (`assistantInsightsService`)

Integrado en la consola del Asistente (`AssistantPanel.tsx`), proporciona diagnósticos estratégicos instantáneos mediante tres análisis automatizados:
1. **Valorización económica del stock:** Calcula el valor monetario estimado de los residuos acopiados multiplicando los kilogramos en bodega por los precios promedio históricos de venta en cada categoría, incorporando un precio base de contingencia ante materiales sin transacciones previas.
2. **Detección de merma por antigüedad:** Evalúa los días de permanencia de cada lote en almacén. Clasifica en riesgo moderado aquellos lotes con más de 30 días y en riesgo crítico aquellos que superan los 60 días, cuantificando la masa y el valor monetario expuesto a deterioro.
3. **Recomendación de clientes afines:** Cruza el inventario disponible con el historial transaccional de compras para identificar compradores que han adquirido la misma categoría de material en el pasado, ordenándolos por volumen histórico para maximizar la efectividad comercial.

## Módulos de la plataforma

| Módulo | Ruta | Fuente de datos y alcance funcional |
| --- | --- | --- |
| **Inicio** | `/` | Cuadros de mando ejecutivos con métricas de residuos, inventario y ventas; visualización opcional de datos de demostración |
| **Sensores** | `/sensors` | Consola de telemetría IoT física (ESP32) y virtual: monitoreo en vivo de llenado %, batería % y temperatura °C, histórico de lecturas, simulación e inspección de salud |
| **Residuos** | `/waste` | Registro físico y trazabilidad de lotes entrantes en PostgreSQL con filtros avanzados y exportaciones |
| **Inventario** | `/inventory` | Catálogo de materiales aprovechables disponibles para su comercialización con visor 3D de contenedores |
| **Compradores** | `/buyers` | Directorio de clientes comerciales, histórico de compras por cliente y filtros por actividad económica |
| **Ventas** | `/sales` | Registro comercial con transacción atómica en base de datos (`create_sale`), cálculo de totales COP y generación de recibos |
| **Informes** | `/reports` | Analítica financiera y operativa, variaciones intermensuales, distribución por categorías y rendimiento comercial |
| **Configuración** | `/settings` | Gestión de idioma (Español / Inglés), temas visuales, conmutador de datos demostrativos y diagnóstico del sistema |
| **Asistente IA** | `/assistant` | Asistente inteligente conversacional y consejero operativo estratégico: valorización de inventario, detección de merma, emparejamiento de compradores y diagnóstico de flota IoT |

## Persistencia y seguridad de datos

Las migraciones SQL ubicadas en [supabase/migrations](supabase/migrations) definen el esquema relacional en PostgreSQL:
- Claves foráneas íntegras vinculadas al propietario (`owner_id`) con políticas Row Level Security (RLS) estrictas basadas en `auth.uid()`.
- Validaciones a nivel de base de datos (`CHECK constraints`) sobre categorías de material, rangos de pesos en gramos, importes monetarios y porcentajes (0 a 100%).
- Aislamiento transaccional: una venta se ejecuta exclusivamente mediante la función RPC `create_sale`, evitando condiciones de carrera o venta múltiple del mismo residuo.
- Acceso del cliente restringido exclusivamente a una clave publicable `anon`, impidiendo el uso de secretos administrativos o `service_role` en el frontend.

## Requisitos del entorno

- **Node.js:** Versión 24 LTS y **npm:** Versión 11.
- **Rust:** Versión 1.90 o posterior (para compilar y empaquetar con Tauri 2).
- **En Windows:** Microsoft Visual Studio C++ Build Tools y WebView2 Runtime.
- **En Linux:** Paquetes de desarrollo WebKit2GTK y AppIndicator (`libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`).
- **En macOS:** Xcode Command Line Tools.
- **Instancia de Supabase:** Proyecto con las migraciones del repositorio aplicadas.

## Configuración y ejecución local

```powershell
# Clonar repositorio
git clone https://github.com/luis-sdiaz/ecoplaza-smart-waste-platform.git
cd ecoplaza-smart-waste-platform\frontend

# Instalar dependencias
npm ci

# Configurar variables de entorno
Copy-Item .env.example .env.local
```

Configure las credenciales en `frontend/.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_publishable_key
```

### Comandos de desarrollo y verificación

Todos los comandos se ejecutan desde el directorio `frontend/`:

```powershell
npm run dev              # Servidor de desarrollo web (Vite)
npm run desktop:dev      # Aplicación nativa de escritorio en desarrollo (Tauri 2)
npm run build            # Compilación de tipos TypeScript (tsc -b) y empaquetado de producción
npm run lint             # Análisis estático de código con ESLint
npm test                 # Ejecución de la suite completa de 312 pruebas
```

### Comandos de empaquetado de escritorio (Tauri 2)

```powershell
npm run desktop:build        # Empaquetado para el sistema operativo anfitrión
npm run build:desktop:debug  # Empaquetado en modo depuración
```

Los instaladores finales se generan en `frontend/src-tauri/target/release/bundle/`.

## Métricas de calidad y suite de pruebas

El repositorio cuenta con una rigurosa suite de pruebas automatizadas que valida la lógica de negocio, cálculos de informes, seguridad y componentes visuales:

- **174 pruebas unitarias de lógica y seguridad:** Ejecutadas con el Node.js Test Runner oficial (`node --test --experimental-strip-types`) sobre reportes, importes monetarios, filtros de actividad, telemetría IoT, directivas CSP de Tauri y algoritmos de valorización y merma.
- **138 pruebas de componentes e interfaces:** Ejecutadas en Vitest con Testing Library y jsdom sobre 28 suites de prueba que validan navegación, interacción de modales, accesibilidad ARIA, aislamiento de cuentas y diagnósticos del asistente.
- **Total de pruebas verificadas:** **312 pruebas aprobadas** (100% de éxito).

## Estructura del repositorio

```text
ecoplaza-smart-waste-platform/
├── README.md                           # Especificación técnica general de la plataforma
├── firmware/                           # Subsistema de instrumentación física y microcontroladores
│   ├── src/
│   │   └── main.cpp                    # Firmware modular C++ para ESP32 (HC-SR04 + DHT22 + LED)
│   └── README.md                       # Diagrama de pines, circuito y especificaciones de hardware
├── supabase/
│   └── migrations/                     # Esquemas relacionales PostgreSQL, RLS y funciones RPC
└── frontend/
    ├── src-tauri/                      # Configuración de Tauri 2, capacidades y permisos de seguridad
    │   ├── tauri.conf.json             # Metadatos de bundle multiplataforma y política CSP
    │   └── capabilities/
    │       └── default.json            # Permisos mínimos restringidos (dialog y fs)
    ├── src/
    │   ├── auth/                       # Lógica de autenticación con Supabase
    │   ├── components/                 # Componentes UI reutilizables y modales accesibles
    │   ├── context/                    # Contextos globales de React (Auth, Idioma, Tema)
    │   ├── pages/                      # Vistas principales de la plataforma
    │   ├── services/                   # Clientes de datos, telemetría y analítica predictiva
    │   └── locales/                    # Diccionarios de internacionalización (i18n) en ES y EN
    ├── tests/                          # Suite de pruebas automatizadas (Node.js y Vitest)
    ├── .env.example                    # Plantilla de variables de entorno públicas
    └── package.json                    # Scripts y dependencias del frontend
```

## Trabajo futuro

- Despliegue de infraestructura física de campo en producción y calibración de contenedores industriales.
- Configuración de certificados de firma digital de código (code signing) para los instaladores de Windows, Linux y macOS.
- Habilitación de pipelines de Integración y Despliegue Continuo (CI/CD) una vez autorizados los flujos remotos.

## Autor y filiación

Proyecto desarrollado por **Luis Sebastian Diaz** para la **Universidad Cooperativa de Colombia**.
