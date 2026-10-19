# EcoPlaza Smart Waste Platform

EcoPlaza es una aplicación de escritorio para registrar, controlar y comercializar residuos aprovechables. La versión actual combina una interfaz React/TypeScript empaquetada con Tauri 2 y un backend administrado en Supabase (Auth + PostgreSQL).

## Estado actual

La aplicación ya trabaja con datos operativos reales aislados por usuario para:

- autenticación, registro, verificación y recuperación de contraseña con Supabase Auth;
- perfiles de usuario;
- gestión de contenedores;
- registro e historial de residuos;
- inventario disponible;
- directorio de compradores;
- ventas transaccionales;
- panel e informes con filtros por fecha;
- exportación CSV y Excel.

Los sensores y lecturas IoT continúan siendo demostrativos. La gestión de contenedores que aparece en la pantalla de sensores sí usa datos reales. El módulo de asistente de IA solo presenta una interfaz informativa: no existe todavía un proveedor, API ni modelo conectado.

## Arquitectura

```text
React 19 + TypeScript + Vite
        │
        ├── Supabase Auth
        ├── Supabase PostgREST / PostgreSQL
        │       └── Row Level Security por owner_id
        ├── CSV y Excel (ExcelJS)
        └── Tauri 2
                ├── diálogo nativo para guardar
                └── escritura de archivos autorizada
```

La aplicación consulta Supabase directamente con una clave publicable. La seguridad de datos no depende de ocultar esa clave: las migraciones activan RLS y limitan cada fila al usuario autenticado. Las ventas se crean mediante la función PostgreSQL `create_sale`, que valida comprador y residuo, registra la venta y marca el residuo como vendido dentro de una única transacción.

## Módulos

| Módulo | Fuente de datos y alcance |
| --- | --- |
| Inicio | Métricas reales de residuos, inventario y ventas; tarjetas de sensores demostrativas opcionales |
| Sensores | Lecturas demostrativas y gestión real de contenedores |
| Residuos | Registro e historial real en PostgreSQL; bloque demostrativo separado |
| Inventario | Residuos reales disponibles para venta |
| Compradores | Alta, edición, filtros e historial real de compras |
| Ventas | Venta completa de un registro disponible mediante una transacción PostgreSQL |
| Informes | Distribución, rendimiento, tendencias, variación mensual y ranking de compradores |
| Configuración | Idioma, tema y visibilidad persistente de datos demostrativos |
| Asistente IA | Interfaz no conectada; no envía consultas ni genera respuestas |

La preferencia de datos demostrativos solo controla bloques locales y métricas simuladas. No altera filas de Supabase ni oculta la gestión real de contenedores.

## Persistencia y seguridad

Las migraciones de [supabase/migrations](supabase/migrations) crean perfiles, contenedores, residuos, compradores y ventas. Incluyen:

- claves foráneas que conservan el mismo propietario entre entidades;
- políticas RLS basadas en `auth.uid()`;
- validaciones de categorías, pesos, precios y estados;
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

- integrar sensores físicos/ESP32 y persistir telemetría real;
- conectar el asistente de IA mediante un servicio seguro;
- endurecer la configuración de producción, incluida una CSP explícita para Tauri;
- definir firma y distribución de instaladores;
- establecer el proceso de despliegue automatizado cuando se autorice (los workflows de GitHub Actions permanecen desactivados).

## Autor y licencia

Proyecto académico de Luis Sebastian Diaz para la Universidad Cooperativa de Colombia. No se ha declarado una licencia de distribución en el repositorio.
