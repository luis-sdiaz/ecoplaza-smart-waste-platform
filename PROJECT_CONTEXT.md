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

3. **Precisión de Pesaje y Telemetría IoT:**
   - La captura de peso en residuos e inventario se valida con precisión exacta al gramo (`0.001 kg`), rechazando valores no numéricos, negativos o con pérdida silenciosa de precisión.
   - Los sensores IoT reportan nivel de llenado (`fill_level` 0-100%), nivel de batería (`battery_level` 0-100%) y temperatura ambiental en grados Celsius.
   - Escala semafórica estandarizada: Estado Óptimo (`< 60%`), Advertencia (`60% - 84%`) y Estado Crítico (`>= 85%`), el cual detona alertas visuales y sonoras inmediatas en la interfaz y en el actuador del contenedor físico.

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
| **Hardware IoT (Firmware Implementado)** | **ESP32 + Sensores** | Código C++ implementado en `firmware/src/main.cpp` con guía en `firmware/README.md` para nodos ESP32 con sensor ultrasónico HC-SR04 (llenado), celda de carga HX711 (peso) y DHT22 (temperatura/humedad) conectados vía REST a Supabase. |

---

### 3. Arquitectura del Sistema y Estructura de Directorios

La solución adopta una arquitectura desacoplada **Frontend-First / Service-Layer Pattern**, donde la lógica de negocio, integración con APIs externas y cálculos analíticos están completamente aislados de los componentes de presentación.

```text
ecoplaza-smart-waste-platform/
├── .github/                       # Workflows de CI/CD e integración continua
├── .vscode/                       # Configuración de workspace (supresión de squiggles C++ ESP32)
│   └── settings.json
├── firmware/                      # Firmware C++ para microcontroladores ESP32 IoT
│   ├── README.md                  # Guía de conexión física, dependencias PlatformIO/Arduino y calibración
│   └── src/
│       └── main.cpp               # Implementación C++ de lectura de sensores y despacho HTTP REST
├── supabase/                      # Configuración de base de datos y migraciones PostgreSQL
│   └── migrations/                # Esquemas SQL, tablas, políticas RLS y procedimientos RPC
│       ├── 20261012000000_initial_database_schema.sql
│       ├── 20261013000000_create_buyers.sql
│       ├── 20261013010000_create_sales.sql
│       └── 20261014000000_create_telemetry.sql
└── frontend/                      # Aplicación cliente React 19 + TypeScript + Tauri 2
    ├── public/                    # Activos estáticos públicos (logos, favicons, texturas e imágenes)
    ├── src-tauri/                 # Contenedor nativo de Tauri 2 en lenguaje Rust
    │   ├── capabilities/          # Permisos y directivas de seguridad nativas
    │   ├── src/                   # Punto de entrada y comandos nativos en Rust
    │   └── tauri.conf.json        # Configuración oficial de escritorio (CSP estricto activado)
    ├── src/
    │   ├── auth/                  # Contexto de autenticación, sesión, avatares y guards de ruta
    │   ├── components/            # Componentes UI reutilizables (Sidebar, MetricCard, Modales)
    │   ├── context/               # Proveedores de estado global compartidos (DemoVisibility)
    │   ├── hooks/                 # Custom React Hooks para accesibilidad y trampa de foco (useDialogFocus)
    │   ├── i18n/                  # Sistema de internacionalización bilingüe (config.ts, es.ts, en.ts)
    │   ├── layouts/               # Plantillas estructurales de la aplicación (AppLayout)
    │   ├── lib/                   # Clientes base configurados (supabase.ts)
    │   ├── pages/                 # Vistas principales y rutas del sistema (12 vistas)
    │   ├── services/              # Capa de servicios desacoplados (49 archivos de servicio modular)
    │   ├── theme/                 # Contexto y lógica reactiva de temas Claro / Oscuro
    │   ├── App.tsx                # Enrutamiento principal y proveedores de contexto
    │   ├── index.css              # Estilos globales, variables CSS del lienzo y curvas cóncavas
    │   └── main.tsx               # Punto de entrada del cliente web/escritorio
    └── tests/                     # Suite de 421 pruebas automatizadas (Node.js y Vitest en 78 archivos)
```

#### Servicios Desacoplados Principales (`frontend/src/services/`):
El directorio contiene **49 archivos de servicios especializados** que encapsulan el acceso a datos, analítica y utilidades operativas:
- `assistantInsightsService.ts`: Generador de diagnósticos estratégicos de valorización de inventario, compradores afines y riesgos de stock.
- `assistantService.ts`: Procesamiento de lenguaje natural básico y respuestas operativas del asistente inteligente.
- `buyerService.ts` / `buyerFilters.ts`: Gestión de directorio de compradores y métricas de recurrencia comercial.
- `excelService.ts` / `excelWorkbook.ts`: Motor base y generador tipado de hojas de cálculo con ExcelJS, respaldado por exportadores especializados (`buyerExcelService.ts`, `buyerPurchaseExcelService.ts`, `containerExcelService.ts`, `inventoryExcelService.ts`, `reportExcelService.ts`, `salesExcelService.ts`, `wasteExcelService.ts`).
- `iotAnalyticsService.ts`: Diagnóstico de salud de flota de contenedores IoT y colas de despacho urgente.
- `reportService.ts`: Agregación cronológica de ventas, variabilidad mensual e ingresos por categoría.
- `salesService.ts`: Orquestación de ventas atómicas mediante llamadas RPC a Supabase.
- `sensorService.ts`: Registro, consulta y simulación contextual de telemetría IoT.
- `tauriService.ts`: Detección segura de entorno de escritorio nativo frente a navegador web estándar.
- `wasteService.ts`: Trazabilidad de ingresos de residuos, clasificación de materiales y pesos certificados.

---

### 4. Estado Actual (Snapshot al Commit 240)

- **Hito Alcanzado:** Commit `240` en preparación sobre la rama principal `main`.
- **Cobertura de Pruebas Automatizadas:** **421 pruebas aprobadas al 100%** distribuidas en **78 archivos de prueba** (30 suites unitarias `.test.ts` en Node.js con 174 pruebas + 48 suites `.component.test.tsx` en Vitest con 247 pruebas).
- **Módulos Culminados y Operativos:**
  1. **Autenticación y Seguridad:** Flujo de Login y Registro con validación en tiempo real, modelo 3D interactivo en Three.js, y cierre de sesión seguro con gestión de estados `aria-busy`.
  2. **Dashboard Ejecutivo:** Arquitectura Bento Grid asimétrica, tarjetas de métricas KPI con Glassmorphism translúcido y elevación háptica, gráficos de distribución y estados vacíos asistidos.
  3. **Monitoreo de Sensores y Telemetría IoT:** Tarjetas de contenedores con indicadores de llenado, alertas visuales críticas (>= 85%), selector de simulación manual contextual, auto-refresco periódico de 10s y modal accesible de historial de telemetría.
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
  13. **Seguridad CSP en Tauri 2:** Directivas Content Security Policy (CSP) estrictamente configuradas en `frontend/src-tauri/tauri.conf.json` y verificadas mediante pruebas automatizadas en `frontend/tests/tauriSecurityConfig.test.ts`.
  14. **Firmware de Telemetría IoT (ESP32):** Sketch C++ implementado en `firmware/src/main.cpp` y documentado en `firmware/README.md` para lectura periódica de sensores HC-SR04, HX711 y DHT22 con despacho de telemetría vía HTTP REST hacia Supabase.
  15. **Panel de Preferencias de Usuario y Accesibilidad:** Configuración interactiva en `SettingsPanel.tsx` con soporte para selección accesible de temas visuales (claro/oscuro, `role="radio"` / `aria-checked`), selección bilingüe (español/inglés, `role="button"` / `aria-pressed`), y diálogo modal nativo de restablecimiento de preferencias (`ResetPreferencesDialog.tsx`) accesible con `aria-haspopup="dialog"`.
  16. **Modal de Registro y Pesaje de Residuos:** Formulario modal accesible en `WasteRegistrationModal.tsx` con gestión de foco con `useDialogFocus`, validación de precisión al gramo (`parseWasteWeightKg`), opciones de selección de categoría mediante botones de acción directa y lista desplegable sincronizada, opciones de contenedor validadas y prevención de doble submit con `aria-busy` y bloqueo de botones.
  17. **Modal de Registro y Venta de Materiales:** Formulario modal accesible en `SaleRegistrationModal.tsx` con soporte dual para lotes reales de `wasteRecords` y resúmenes de `stock`, campo de peso editable con validación contra stock máximo disponible, cálculo reactivo de total estimado en COP (`previewTotal`), y prevención de doble submit con `aria-busy` y bloqueo de botones.
  18. **Modal de Alta y Edición de Compradores:** Formulario modal accesible en `BuyerFormModal.tsx` con gestión de foco mediante `useDialogFocus` (foco inicial en `#buyer-name`), soporte completo para campos de contacto, NIT/documento y dirección física, validación de campos obligatorios, sincronización reactiva en modo edición, y prevención de doble submit con `aria-busy` y bloqueo de botones.
  19. **Modal de Detalle y Comprobante de Venta:** Componente modal accesible en `SaleDetailsModal.tsx` con gestión de foco y cierre accesible mediante `useDialogFocus` (tecla Escape y botón de descarte accesible con `aria-label="Cerrar"`), soporte de renderizado condicional cuando `sale === null`, desglose cuantitativo completo (peso en kg, precio unitario y total liquidado en COP), fecha en formato colombiano e internacionalización, y soporte para visualización de notas u observaciones.
  20. **Tabla de Historial Operativo de Residuos y Accesibilidad UI/UX:** Componente tabular accesible en `WasteRecordTable.tsx` con estructura semántica (`<table>`, `<caption className="sr-only">`, `<th scope="col">`, `<td>`), badges visuales estilizados para categorías de residuos (`organic`, `recyclable`, `nonRecyclable`), formato numérico cuantitativo con sufijo `kg`, estado vacío informativo accesible dentro de `<td colSpan={6}>` cuando `records.length === 0`, soporte de indicador de carga accesible `isLoading`, y compatibilidad total con códigos de contenedor y registros históricos.
  21. **Tabla de Historial Operativo de Ventas y Accesibilidad UI/UX:** Componente tabular accesible en `SalesTable.tsx` con estructura semántica (`<table>`, `<caption className="sr-only">`, `<th scope="col">`, `<td>`), badges estilizados para categorías de material reciclable/aprovechable (`organic`, `recyclable`, `nonRecyclable`), formato monetario oficial en pesos colombianos (COP), formato de pesaje cuantitativo con sufijo `kg`, estado vacío informativo accesible alojado dentro de `<td colSpan={8}>` cuando `sales.length === 0`, indicador de carga accesible `isLoading` con spinner `LoaderCircle`, y botón de acción interactivo con `aria-label` descriptivo contextualizado por comprador y foco accesible por teclado.
  22. **Directorio Tabular de Compradores y Accesibilidad UI/UX:** Componente tabular accesible en `BuyerTable.tsx` con estructura semántica (`<table>`, `<caption className="sr-only">`, `<th scope="col">`, `<td>`), visualización explícita de identificación/NIT (`documentNumber`), badges accesibles de estado de actividad (`active` / `inactive`), estado vacío accesible dentro de `<td colSpan={8}>` cuando `buyers.length === 0`, indicador de carga accesible `isLoading`, y botones interactivos de edición y consulta de historial con `aria-label` descriptivo contextualizado por comprador y foco accesible por teclado.
  23. **Tabla de Inventario y Stock en Bodega y Accesibilidad UI/UX:** Componente tabular accesible en `InventoryTable.tsx` con estructura semántica (`<table>`, `<caption className="sr-only">`, `<th scope="col">`, `<td>`), badges estilizados para categorías de residuos (`organic`, `recyclable`, `nonRecyclable`), formateo de peso cuantitativo en kilogramos (`kg`), indicador porcentual y barra de progreso de capacidad de acopio con atributos accesibles (`role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`), estado vacío informativo accesible dentro de `<td colSpan={7}>` cuando `items.length === 0`, indicador de carga accesible `isLoading` con spinner `LoaderCircle`, y compatibilidad total con `InventoryPage.tsx`.
  24. **Tarjeta de Métricas y Resumen de Residuos (`WasteSummaryCard.tsx`):** Componente de visualización accesible con soporte dual: resumen cuantitativo integral (`totalWeight`, `organicWeight`, `recyclableWeight`, `nonRecyclableWeight`, indicador de tendencia porcentual con iconos `TrendingUp`/`TrendingDown` y descripción `sr-only`, barras de progreso por categoría con `role="progressbar"`, formateo numérico con sufijo `kg`, estado de carga `isLoading` con `role="status"` y tolerancia resiliente a valores nulos o en cero sin `NaN`) y modo tarjeta de categoría individual retrocompatible con `DashboardPage.tsx`.
  25. **Gráfico de Distribución de Residuos (`WasteDistributionChart.tsx`):** Componente de visualización analítica accesible con contenedor semántico (`role="region"`, `aria-label`), soporte dual de datos (`data: ReportCategoryDistributionItem[]` o props de peso directo `organicWeight`, `recyclableWeight`, `nonRecyclableWeight`), leyenda cromática estandarizada por material, barras de distribución cuantitativa con `role="progressbar"`, formateo numérico de kilogramos y porcentajes, resumen textual oculto (`sr-only`) para lectores de pantalla, estado de carga accesible con `role="status"` y estado vacío informativo ante registros en cero o filtros sin resultados.
  26. **Tarjeta Reutilizable de Métricas y KPIs (`MetricCard.tsx`):** Componente base de KPIs accesible y resiliente con soporte de tendencias porcentuales e iconografía de subida/bajada (`TrendingUp`/`TrendingDown`), textos explicativos ocultos (`sr-only`) para tecnologías asistivas, soporte interactivo por teclado (`Enter`/`Espacio`, `role="button"` y foco visual) ante la prop `onClick`, estado de carga con `role="status"` y spinner `LoaderCircle`, y retrocompatibilidad total con todas las vistas operativas de la plataforma.
  27. **Tarjeta de Estado y Telemetría de Contenedores IoT (`SensorStatusCard.tsx`):** Componente de telemetría en tiempo real con contenedor accesible (`role="region"` o `role="button"` cuando es interactivo vía teclado/clic con `tabIndex={0}`), barra de nivel de llenado cuantitativa con atributos de accesibilidad (`role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`), alerta sonora/textual para lectores de pantalla (`sr-only`) ante umbrales críticos (>= 85%), estado de carga accesible con `role="status"` y spinner `LoaderCircle`, y retrocompatibilidad total con `DashboardPage.tsx`.
  28. **Tarjeta de Impacto y Equivalencias Ecológicas (`EnvironmentalImpactCard.tsx`):** Componente de visualización analítica accesible (`role="region"` o `role="button"` interactivo con navegación por teclado `Enter`/`Espacio` y `tabIndex={0}`), métricas de equivalencias ecológicas calculadas (emisiones de CO₂ evitadas, árboles protegidos de la tala, agua potable preservada y energía conservada en kWh), barra cuantitativa de tasa de aprovechamiento (`role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`), descripciones completas ocultas para tecnologías asistivas (`sr-only`), estado de carga accesible con `role="status"` y spinner `LoaderCircle`, y resiliencia matemática total ante valores nulos, indefinidos o en cero sin arrojar `NaN`.
  29. **Resumen Mensual de Ventas y Rendimiento Comercial (`MonthlySalesSummary.tsx`):** Componente de analítica financiera y comercial accesible (`role="region"` o `role="button"` cuando se suministra la prop interactiva `onClick` con navegación por teclado `Enter`/`Espacio` y `tabIndex={0}`), métricas destacadas de ingresos brutos en COP, peso total comercializado en kg, precio promedio por kg, indicador de variación mensual con iconografía `TrendingUp`/`TrendingDown` y texto auditivo oculto (`sr-only`), estado de carga accesible con `role="status"` y spinner `LoaderCircle`, y retrocompatibilidad total con la tabla cronológica de meses y `ReportsPage.tsx`.
  30. **Gráfico de Tendencias Temporales de Ventas (`SalesTrendChart.tsx`):** Componente de visualización analítica cronológica accesible (`role="region"` y `aria-label`), gráfico de barras dual para operaciones/volumen e ingresos brutos en COP con cálculo resiliente de escalas, representación estructurada accesible oculta (`sr-only`) con tabla descriptiva para lectores de pantalla, estado de carga accesible con `role="status"` y spinner `LoaderCircle`, estado vacío informativo (`ChartNoAxesCombined`) y tolerancia ante valores en cero o faltantes sin arrojar `NaN`.

#### Roadmap Inmediato de Tareas Pendientes
1. **Cobertura de Pruebas de Componente para UI/UX, Navegación y Modales Transaccionales - Bloque A (Completado):** Pruebas automatizadas en Vitest incorporadas en `frontend/tests/sidebarNavigation.component.test.tsx`, `frontend/tests/appLayoutResponsive.component.test.tsx`, `frontend/tests/successToastFeedback.component.test.tsx`, `frontend/tests/settingsPanelPreferences.component.test.tsx`, `frontend/tests/wasteRegistrationModal.component.test.tsx`, `frontend/tests/saleRegistrationModal.component.test.tsx`, `frontend/tests/buyerFormModal.component.test.tsx` y `frontend/tests/saleDetailsModal.component.test.tsx`.
2. **Cobertura de Pruebas de Componentes para Tablas Operativas y Visualizaciones - Bloque B (En curso):**
   - **Tabla de Registros de Residuos (`WasteRecordTable.tsx`):** Completado con 6 pruebas automatizadas en `frontend/tests/wasteRecordTable.component.test.tsx`.
   - **Tabla Operativa de Ventas (`SalesTable.tsx`):** Completado con 6 pruebas automatizadas en `frontend/tests/salesTable.component.test.tsx`.
   - **Directorio Tabular de Compradores (`BuyerTable.tsx`):** Completado con 6 pruebas automatizadas en `frontend/tests/buyerTable.component.test.tsx`.
   - **Tabla de Inventario y Stock en Bodega (`InventoryTable.tsx`):** Completado con 6 pruebas automatizadas en `frontend/tests/inventoryTable.component.test.tsx`.
   - **Tarjeta de Métricas Resumidas de Residuos (`WasteSummaryCard.tsx`):** Completado con 6 pruebas automatizadas en `frontend/tests/wasteSummaryCard.component.test.tsx`.
   - **Gráfico de Distribución de Residuos (`WasteDistributionChart.tsx`):** Completado con 6 pruebas automatizadas en `frontend/tests/wasteDistributionChart.component.test.tsx`.
   - **Tarjeta Reutilizable de Métricas y KPIs (`MetricCard.tsx`):** Completado con 6 pruebas automatizadas en `frontend/tests/metricCard.component.test.tsx`.
   - **Tarjeta de Telemetría de Sensores IoT (`SensorStatusCard.tsx`):** Completado con 6 pruebas automatizadas en `frontend/tests/sensorStatusCard.component.test.tsx`.
   - **Tarjeta de Impacto Ambiental y Equivalencias Ecológicas (`EnvironmentalImpactCard.tsx`):** Completado con 6 pruebas automatizadas en `frontend/tests/environmentalImpactCard.component.test.tsx`.
   - **Resumen Mensual de Ventas y Rendimiento Comercial (`MonthlySalesSummary.tsx`):** Completado con 6 pruebas automatizadas en `frontend/tests/monthlySalesSummary.component.test.tsx`.
   - **Gráfico de Tendencias Temporales de Ventas (`SalesTrendChart.tsx`):** Completado con 6 pruebas automatizadas en `frontend/tests/salesTrendChart.component.test.tsx`.
3. **Empaquetado y Validación del Instalador Nativo de Windows:** Compilar y verificar el instalador ejecutable de escritorio (`.msi` / `.exe`) mediante `npx tauri build`.
4. **Pruebas de Integración Física y Guía Final de Sustentación:** Validación en vivo del nodo físico ESP32 y consolidación del protocolo de demostración para la entrega académica.

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
- **Cobertura 100% Activa:** Cualquier refactorización o nueva característica debe preservar la totalidad de las **421 pruebas automatizadas**.
- **Comandos de Validación Obligatorios (desde `frontend/`):**
  1. `npm run lint`: Verificación estricta con ESLint (**0 errores, 0 warnings**).
  2. `npm run build`: Validación integral de tipado TypeScript (`tsc -b`) y empaquetado de producción de Vite (**0 errores**).
  3. `npm run test:node`: Ejecución de pruebas unitarias puras en Node.js (**174 / 174 pasadas**).
  4. `npm run test:components`: Ejecución de pruebas de componentes en Vitest (**247 / 247 pasadas**).
- **Una tarea por ciclo:** Trabajar de manera focalizada, validar antes y después de cada cambio, y presentar un informe técnico estructurado al completar la iteración.
