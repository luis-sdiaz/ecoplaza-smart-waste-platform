# EcoPlaza — Smart Waste & IoT Platform
## Documento Maestro de Contexto Técnico y Arquitectura (Single Source of Truth)

---

### 1. Visión General y Reglas de Negocio

**EcoPlaza** es una plataforma tecnológica híbrida (Escritorio Nativo y Aplicación Web) diseñada para modernizar, digitalizar y optimizar la gestión integral de residuos sólidos aprovechables en plazas de mercado municipales y centros de acopio. La solución unifica telemetría IoT en tiempo real, trazabilidad de pesaje físico, control de almacenamiento, valorización de inventario y comercialización financiera directa con compradores y recicladores mayoristas.

#### Reglas de Negocio Críticas
1. **Aislamiento Multi-Tenant Estricto por Usuario (`owner_id`):**
   - Todas las entidades del dominio (`containers`, `waste_records`, `sales`, `buyers`, `telemetry_records`) están segmentadas mediante políticas de seguridad a nivel de fila (**Row Level Security - RLS**) en Supabase.
   - Ninguna sesión puede leer, escribir ni mutar información perteneciente a otro `owner_id`.
   - La plataforma garantiza aislamiento en caliente al conmutar entre cuentas de usuario, vaciando estados locales, borradores en memoria y descartando respuestas asíncronas desfasadas.

2. **Atomicidad e Integridad en Ventas (`public.create_sale` RPC):**
   - La comercialización de residuos se ejecuta como una transacción ACID única mediante el procedimiento almacenado transaccional `create_sale`.
   - Valida estrictamente que el precio unitario y el monto total sean mayores a cero (`unit_price > 0`, `total_amount > 0`).
   - Requiere y valida que los lotes de inventario asociados se encuentren en estado `'available'`.
   - Actualiza de forma atómica el estado del material a `'sold'`, impidiendo venta concurrente doble (*double-spending* de lotes).

3. **Precisión de Pesaje y Telemetría:**
   - La captura de peso en residuos e inventario se valida con precisión exacta al gramo (`0.001 kg`), rechazando valores no numéricos, negativos o con pérdida silenciosa de precisión.
   - Los sensores IoT reportan nivel de llenado (`fill_level` 0-100%), nivel de batería (`battery_level` 0-100%) y temperatura ambiental en grados Celsius. Un nivel de llenado superior al 80% detona alertas visuales críticas inmediatas y prioridad en la cola de despacho de recolección.

---

### 2. Stack Tecnológico Completo

| Capa | Tecnología | Detalle y Propósito |
| :--- | :--- | :--- |
| **Frontend UI** | **React 19** | Biblioteca declarativa de interfaz con componentes funcionales y hooks modernos. |
| **Lenguaje Tipado** | **TypeScript ~6.0.2** | Tipado estático estricto en frontend, interfaces de servicios y contratos de datos. |
| **Bundler & Dev Server** | **Vite 8** | Empaquetador ultrarrápido para desarrollo y compilación optimizada en producción. |
| **Estilos & Diseño** | **Tailwind CSS 4** | Sistema utilitario de estilos con diseño responsive, tokens semánticos y modo oscuro. |
| **Lenguaje Visual UI/UX** | **Glassmorphism Eco-Tech** | Vidrio esmerilado translúcido, gradientes esmeralda, reflejos de luz y microinteracciones SaaS. |
| **Iconografía** | **Lucide Icons (`lucide-react`)** | Conjunto coherente y accesible de iconos SVG vectoriales. |
| **Renderizado 3D** | **Three.js + React Three Fiber** | Escena 3D interactiva en la pantalla de autenticación con contenedor animado. |
| **Escritorio Nativo** | **Tauri 2 (Rust)** | Framework de escritorio ligero, seguro y multiplataforma con mínimo consumo de RAM. |
| **Backend & Base de Datos** | **Supabase (PostgreSQL)** | Base de datos relacional con RLS, autenticación basada en JWT y funciones RPC. |
| **Exportación de Datos** | **ExcelJS + CSV Nativo** | Generación de libros Excel (.xlsx) formateados y archivos CSV con BOM UTF-8 y fecha colombiana. |
| **Pruebas Unitarias** | **Node.js Test Runner (`node --test`)** | Pruebas de lógica pura, cálculos de reportes, formateadores y validación de esquemas sin dependencias externas. |
| **Pruebas de Componentes** | **Vitest + Testing Library** | Pruebas de integración visual, accesibilidad (ARIA), reactividad de formularios y aislamiento de cuentas. |
| **Hardware IoT (Proyección)** | **ESP32 + Sensores** | Nodos con microcontrolador ESP32, sensor ultrasónico HC-SR04 (llenado), celda de carga HX711 (peso) y DHT22 (temperatura/humedad). |

---

### 3. Arquitectura del Sistema y Estructura de Directorios

La solución adopta una arquitectura desacoplada **Frontend-First / Service-Layer Pattern**, donde la lógica de negocio, integración con APIs externas y cálculos analíticos están completamente aislados de los componentes de presentación.

```text
ecoplaza-smart-waste-platform/
├── .github/                      # Workflows de CI/CD e integración continua
├── firmware/                     # Código fuente C++/Arduino para microcontroladores ESP32 IoT
├── supabase/                     # Configuración de base de datos y migraciones PostgreSQL
│   └── migrations/               # Esquemas SQL, tablas, políticas RLS y procedimientos RPC
└── frontend/                     # Aplicación cliente React 19 + TypeScript + Tauri 2
    ├── public/                   # Activos estáticos públicos (logos, favicons, texturas)
    ├── src-tauri/                # Contenedor nativo de Tauri 2 en lenguaje Rust
    │   ├── capabilities/         # Permisos y directivas de seguridad nativas
    │   ├── src/                  # Punto de entrada y comandos nativos en Rust
    │   └── tauri.conf.json       # Configuración oficial de la aplicación de escritorio
    ├── src/
    │   ├── auth/                 # Contexto de autenticación, sesión y guards de ruta
    │   ├── components/           # Componentes UI reutilizables (Sidebar, MetricCard, Modales)
    │   ├── hooks/                # Custom React Hooks para estado y comportamiento compartido
    │   ├── i18n/                 # Sistema de internacionalización bilingüe (Español / Inglés)
    │   ├── layouts/              # Plantillas estructurales de la aplicación (AppLayout, AuthLayout)
    │   ├── pages/                # Vistas principales y rutas del sistema
    │   ├── services/             # Capa de servicios desacoplados (Supabase, IoT, Exportación, Asistente)
    │   ├── theme/                # Contexto y lógica reactiva de temas Claro / Oscuro
    │   ├── types/                # Definiciones de tipos TypeScript globales y contratos de dominio
    │   ├── utils/                # Utilidades puras de fecha, moneda colombiana (COP) y formateo
    │   ├── App.tsx               # Enrutamiento principal y proveedores de contexto
    │   ├── index.css             # Estilos globales, variables CSS del lienzo y utilidades personalizadas
    │   └── main.tsx              # Punto de entrada del cliente web/escritorio
    └── tests/                    # Suite de 315 pruebas automatizadas (Node.js y Vitest)
```

#### Servicios Desacoplados Principales (`frontend/src/services/`):
- `assistantInsightsService.ts`: Generador de diagnósticos estratégicos de valorización de inventario, compradores afines y riesgos de stock.
- `assistantService.ts`: Procesamiento de lenguaje natural básico y respuestas operativas del asistente inteligente.
- `buyerService.ts`: Gestión de directorio de compradores y cálculo de métricas de recurrencia de compras.
- `excelWorkbookService.ts`: Construcción de libros Excel profesionales tipados con estilos corporativos.
- `iotAnalyticsService.ts`: Diagnóstico de salud de flota de contenedores IoT y colas de despacho urgente.
- `reportService.ts`: Agregación cronológica de ventas, variabilidad mensual e ingresos por categoría.
- `salesService.ts`: Orquestación de ventas atómicas mediante llamadas RPC a Supabase.
- `sensorService.ts`: Registro, consulta y simulación contextual de telemetría IoT.
- `tauriService.ts`: Detección segura de entorno de escritorio nativo frente a navegador web estándar.
- `wasteService.ts`: Trazabilidad de ingresos de residuos, clasificación de materiales y pesos certificados.

---

### 4. Estado Actual (Snapshot al Commit 218)

- **Hito Alcanzado:** Commit `218` en la rama principal `origin/main`.
- **Cobertura de Pruebas Automatizadas:** **315 pruebas aprobadas al 100%** (174 pruebas en Node.js Native Runner + 141 pruebas en Vitest / RTL).
- **Módulos Culminados y Operativos:**
  1. **Autenticación y Seguridad:** Flujo de Login y Registro con validación en tiempo real, modelo 3D interactivo en Three.js, y cierre de sesión seguro con gestión de estados `aria-busy`.
  2. **Dashboard Ejecutivo:** Arquitectura Bento Grid asimétrica, tarjetas de métricas KPI con Glassmorphism translúcido y elevación háptica, gráficos de distribución y estados vacíos asistidos.
  3. **Monitoreo de Sensores y Telemetría IoT:** Tarjetas de contenedores con indicadores de llenado, alertas visuales críticas (> 80%), selector de simulación manual contextual, auto-refresco periódico de 10s y modal accesible de historial de telemetría.
  4. **Gestión de Residuos:** Formulario de registro con precisión al gramo, popover inteligente de rango de fechas en formato colombiano (`DD/MM/YYYY`) y tabla interactiva.
  5. **Almacenamiento e Inventario:** Detección de antigüedad de lotes en riesgo moderado y crítico, valorización económica en pesos colombianos (COP) y filtro progresivo por rango de peso.
  6. **Directorio de Compradores:** Segmentación comercial por actividad (con compras / sin compras), resumen porcentual y vínculos directos hacia ventas.
  7. **Comercialización y Ventas:** Historial de transacciones con búsqueda textual, rangos de montos, selector de comprador y cálculo automático de ingresos brutos.
  8. **Informes Financieros y Operativos:** Resumen cronológico mensual, día de mayor facturación con desempate determinista, categoría líder y compradores top.
  9. **Asistente Estratégico e IoT:** Motor de consultas con chips interactivos para valorizar stock, recomendar compradores afines y diagnosticar flota de sensores con navegación rápida a `/sensors`.
  10. **Exportación Dual Nativa:** Exportador especializado a formato Excel (.xlsx) mediante ExcelJS y CSV nativo con codificación UTF-8 BOM para apertura directa en Microsoft Excel.
  11. **Barra Lateral de Navegación (Sidebar):**
      - Altura completa de borde a borde (*full-bleed*, `h-screen`).
      - Identidad verde esmeralda institucional con soporte dinámico para modo claro y modo oscuro.
      - Pestaña activa conectada con curvas cóncavas invertidas (*scoop corners*) sincronizada con la variable `--app-canvas-bg`.
      - Mecanismo colapsable suave con transición CSS de `w-64` a `w-20` mediante botón toggle, adaptando logotipo, enlaces y perfil inferior sin provocar barras de scroll.
  12. **Diagnóstico Nativo Tauri:** Detección automática del entorno de ejecución (Web vs Tauri 2) y modal informativo con dimensiones de ventana y capacidades de archivo.

#### Roadmap Inmediato de Tareas Pendientes
1. **Endurecimiento de CSP (Content Security Policy):** Ajustar y validar directivas estrictas en `tauri.conf.json` para empaquetado nativo final.
2. **Generación del Instalador de Escritorio:** Compilar y generar el instalador ejecutable de Windows (.msi / .exe) mediante `npx tauri build`.
3. **Firmware de Telemetría ESP32:** Implementar el sketch final en C++ para el microcontrolador ESP32 con cliente HTTP/WebSocket hacia la API de telemetría.
4. **Documentación Final de Sustentación:** Elaboración de manuales de usuario, arquitectura de base de datos y memoria técnica para sustentación académica.

---

### 5. Convenciones de Código y Reglas de Desarrollo

Para asegurar la máxima calidad, mantenibilidad y estabilidad del proyecto, todos los desarrolladores y agentes de IA deben ceñirse rigurosamente a las siguientes directrices:

#### Patrón de Commits
- **Conventional Commits Obligatorio:** Todo mensaje de commit debe redactarse exclusivamente en **inglés** siguiendo la convención:
  `<tipo>(<alcance>): <descripción corta en imperativo>`
  *Ejemplos:* `feat(sidebar): implement collapsible navigation panel`, `fix(auth): handle session restoration timeout`, `style(dashboard): calibrate glassmorphic background opacity`.

#### Gobernanza Absoluta de Git y GitHub
- **Principio Fundamental:** **ANTIGRAVITY PROGRAMA, EDITA ARCHIVOS Y REALIZA PRUEBAS. EL USUARIO CONTROLA EXCLUSIVAMENTE GIT Y GITHUB.**
- **Prohibición Permanente de Git:** La IA tiene estrictamente prohibido ejecutar cualquier comando de Git (`git status`, `git diff`, `git add`, `git commit`, `git push`, `git checkout`, etc.), extensiones, APIs o scripts que modifiquen el árbol de Git o publiquen cambios.
- El usuario revisa los resultados y ejecuta personalmente todas las operaciones de Git desde su terminal de PowerShell.

#### Política de Pruebas Automatizadas y Cero Errores
- **Cobertura 100% Activa:** Cualquier refactorización o nueva característica debe preservar la totalidad de las **315 pruebas automatizadas**.
- **Comandos de Validación Obligatorios (desde `frontend/`):**
  1. `npm run lint`: Verificación estricta con ESLint (**0 errores, 0 warnings**).
  2. `npm run build`: Validación integral de tipado TypeScript (`tsc -b`) y empaquetado de producción de Vite (**0 errores**).
  3. `npm run test:node`: Ejecución de pruebas unitarias puras en Node.js (**174 / 174 pasadas**).
  4. `npm run test:components`: Ejecución de pruebas de componentes en Vitest (**141 / 141 pasadas**).
- **Una tarea por ciclo:** Trabajar de manera focalizada, validar antes y después de cada cambio, y presentar un informe técnico estructurado al completar la iteración.

