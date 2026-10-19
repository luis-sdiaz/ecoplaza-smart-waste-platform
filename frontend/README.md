# Frontend y aplicación de escritorio de EcoPlaza

Este directorio contiene la aplicación React/TypeScript, las pruebas automatizadas y el host de escritorio Tauri 2.

## Tecnologías

- React 19, React Router e i18next.
- TypeScript 6, Vite 8 y Tailwind CSS 4.
- Supabase JS para Auth y acceso a PostgreSQL protegido con RLS.
- ExcelJS para libros `.xlsx` y servicios propios para CSV.
- Tauri 2 con plugins de diálogo y sistema de archivos.
- Node test runner, Vitest, Testing Library y jsdom.

## Variables de entorno

Copie el ejemplo y use únicamente credenciales publicables del proyecto Supabase:

```powershell
Copy-Item .env.example .env.local
```

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_publishable_key
```

El arranque falla de forma explícita si falta una variable, si la URL no es válida/segura o si la clave parece secreta o `service_role`.

## Instalación

```powershell
npm ci
```

El lockfile es la fuente reproducible de dependencias. No es necesario instalar `@types/node` por separado: ya está declarado como dependencia de desarrollo.

## Comandos

```powershell
npm run dev
npm run build
npm run lint
npm test
npm run test:node
npm run test:components
npx tauri dev
npx tauri build
```

`npm run build` ejecuta `tsc -b` sobre:

- `tsconfig.app.json`: aplicación React;
- `tsconfig.node.json`: Vite y Vitest;
- `tsconfig.test.json`: pruebas Node y de componentes, incluidos los tipos de Node.

`npm test` ejecuta los 19 archivos del runner de Node enumerados en `package.json` y los 11 archivos `tests/**/*.component.test.tsx` encontrados por Vitest.

## Organización

```text
src/
├── auth/          # sesión, OTP, recuperación y perfil
├── components/    # tablas, formularios, métricas y exportaciones
├── context/       # visibilidad de datos demostrativos
├── i18n/          # traducciones español/inglés
├── pages/         # rutas funcionales
├── services/      # Supabase, cálculos, filtros, CSV y Excel
└── theme/         # preferencia claro/oscuro
tests/             # pruebas Node y Vitest
src-tauri/         # configuración, capacidades y host Rust
```

## Datos reales y demostrativos

Los servicios de contenedores, residuos, inventario, compradores, ventas e informes consultan Supabase y verifican el usuario autenticado. PostgreSQL refuerza el aislamiento mediante RLS.

Las tablas y tarjetas demostrativas están separadas visualmente y pueden ocultarse desde Configuración. Esa preferencia usa `localStorage`, no escribe en Supabase y no elimina la gestión real de contenedores. Las lecturas de sensores no están conectadas a hardware.

## Exportaciones

Los módulos de residuos, inventario, compradores, compras, ventas, contenedores e informes generan CSV o Excel según el flujo disponible. En escritorio se utilizan el diálogo y la escritura nativos de Tauri. Las exportaciones validan números, fechas y texto potencialmente interpretable como fórmulas de hoja de cálculo.

## Base de datos

El esquema no vive en este directorio: consulte `../supabase/migrations`. Debe aplicarse en orden cronológico al proyecto indicado por `.env.local`. La creación de una venta usa la RPC `create_sale`; no inserte directamente en `sales`.

## Empaquetado Windows

`npx tauri build` usa `src-tauri/tauri.conf.json`, ejecuta el build web y deja los paquetes en `src-tauri/target/release/bundle/`. Requiere Rust 1.90+, Microsoft C++ Build Tools y WebView2. La firma de código y el mecanismo de actualización aún no están configurados.

## Limitaciones actuales

- Sin integración real de sensores/ESP32.
- Sin backend de IA conectado.
- Sin firma ni canal de actualización del instalador.
- La configuración Tauri mantiene `csp: null`; debe endurecerse antes de una distribución de producción.
