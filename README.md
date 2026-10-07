# EcoPlaza — Smart Waste Platform

EcoPlaza es una aplicación de escritorio orientada a la gestión inteligente de residuos. El proyecto busca centralizar el monitoreo de contenedores, el registro de residuos, el control de inventario, compradores, ventas e informes dentro de una misma plataforma.

La idea principal es que los residuos aprovechables puedan ser gestionados no solamente como desechos, sino también como materiales que pueden ingresar a un inventario y posteriormente ser comercializados.

Este proyecto se desarrolla como parte del proceso académico de Diseño de Interfaces de Software, aplicando conceptos de arquitectura de información, sistemas de diseño, navegación, internacionalización, usabilidad e interacción con el usuario.

---

## Estado actual del proyecto

EcoPlaza se encuentra actualmente en una primera etapa funcional de desarrollo.

Hasta el momento se ha trabajado principalmente en la interfaz de escritorio y en la definición de los principales módulos de la plataforma.

### Funcionalidades implementadas

- Aplicación de escritorio mediante Tauri.
- Navegación entre todos los módulos principales.
- Panel general de información.
- Vista de monitoreo de sensores.
- Gestión visual de residuos.
- Registro local de nuevos residuos.
- Validación del formulario de registro.
- Generación automática de identificadores como `RES-005`, `RES-006`, etc.
- Persistencia local de los residuos registrados.
- Vista de inventario.
- Gestión visual de compradores.
- Vista de ventas.
- Módulo de informes.
- Interfaz inicial para el asistente de inteligencia artificial.
- Página de configuración.
- Interfaz bilingüe en español e inglés.
- Persistencia del idioma seleccionado.
- Página de error 404.
- Diseño consistente mediante componentes reutilizables.

Los datos de sensores, inventario, compradores, ventas e informes utilizados actualmente son datos demostrativos para validar la interfaz y la experiencia de usuario.

---

## Internacionalización

EcoPlaza cuenta actualmente con soporte para:

- Español
- English

El idioma predeterminado es español.

Desde el módulo de Configuración el usuario puede cambiar el idioma de la interfaz y la preferencia queda almacenada localmente, por lo que se conserva incluso después de cerrar y volver a abrir la aplicación.

La internacionalización fue implementada utilizando:

```text
i18next
react-i18next
```

Las traducciones están organizadas en:

```text
frontend/src/i18n/
├── config.ts
└── translations/
    ├── es.ts
    └── en.ts
```

---

## Registro local de residuos

El módulo de Residuos incluye actualmente uno de los primeros flujos funcionales de EcoPlaza.

El usuario puede registrar:

- Categoría del residuo.
- Contenedor.
- Peso registrado.

La aplicación valida la información antes de crear el registro.

Cada nuevo residuo recibe automáticamente un identificador consecutivo:

```text
RES-001
RES-002
RES-003
...
```

Los nuevos registros se almacenan temporalmente mediante `localStorage`.

Esto permite validar el comportamiento de la interfaz antes de realizar la integración con el backend y la base de datos.

---

## Módulos de EcoPlaza

La aplicación está organizada actualmente en los siguientes módulos:

| Módulo | Descripción |
| --- | --- |
| Inicio | Resumen general del estado de EcoPlaza |
| Sensores | Monitoreo de contenedores y lecturas IoT |
| Residuos | Consulta y registro de residuos |
| Inventario | Control del material disponible |
| Compradores | Gestión de posibles compradores |
| Ventas | Registro y seguimiento de ventas |
| Informes | Visualización de métricas y resultados |
| Asistente IA | Interfaz para futuras consultas mediante inteligencia artificial |
| Configuración | Preferencias generales de la aplicación |

---

## Tecnologías utilizadas

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide React
- i18next
- react-i18next

### Aplicación de escritorio

- Tauri 2
- Rust

### Tecnologías previstas para las siguientes etapas

- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- ESP32
- Sensores IoT
- Ollama
- Modelos locales de inteligencia artificial

---

## Arquitectura general prevista

EcoPlaza está planteado para evolucionar hacia la siguiente arquitectura:

```text
Sensores IoT
    │
    ▼
   ESP32
    │
    ▼
FastAPI Backend
    │
    ├── PostgreSQL
    │
    └── Procesamiento de datos
    │
    ▼
React + TypeScript
    │
    ▼
Tauri Desktop
    │
    ▼
Usuario
```

Actualmente el trabajo se encuentra concentrado principalmente en la capa de interfaz y experiencia de usuario.

---

## Estructura del repositorio

```text
ecoplaza-smart-waste-platform/
│
├── backend/
│   └── Backend de EcoPlaza
│
├── docs/
│   └── Documentación del proyecto
│
├── firmware/
│   └── Código destinado al ESP32 y sensores
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── i18n/
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── main.tsx
│   │
│   ├── src-tauri/
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## Requisitos para ejecutar el proyecto

Para trabajar con la versión actual se necesita tener instalado:

- Node.js
- npm
- Rust
- Cargo
- Microsoft C++ Build Tools en Windows

---

## Instalación

Clonar el repositorio:

```bash
git clone https://github.com/luis-sdiaz/ecoplaza-smart-waste-platform.git
```

Ingresar al proyecto:

```bash
cd ecoplaza-smart-waste-platform
```

Ingresar al frontend:

```bash
cd frontend
```

Instalar las dependencias:

```bash
npm install
```

---

## Ejecutar en modo web

Para ejecutar únicamente la interfaz con Vite:

```bash
npm run dev
```

Por defecto Vite ejecutará el proyecto en:

```text
http://localhost:5173
```

---

## Ejecutar como aplicación de escritorio

Para iniciar EcoPlaza mediante Tauri:

```bash
npx tauri dev
```

Este comando inicia el servidor de desarrollo de Vite y posteriormente abre EcoPlaza como una aplicación de escritorio.

---

## Compilar el frontend

Para comprobar que el proyecto compile correctamente:

```bash
npm run build
```

La versión compilada del frontend se genera en:

```text
frontend/dist/
```

---

## Diseño de la interfaz

La interfaz de EcoPlaza fue construida siguiendo una estructura visual consistente.

Se definieron colores, tipografía, componentes reutilizables y patrones de navegación para mantener uniformidad entre las diferentes páginas.

Algunos de los elementos reutilizados son:

- Encabezados de página.
- Tarjetas de métricas.
- Tablas.
- Tarjetas de sensores.
- Sidebar de navegación.
- Estados visuales.
- Componentes de configuración.

La tipografía principal utilizada es:

```text
Inter
```

El color principal de EcoPlaza es:

```text
#1F7A4D
```

---

## Contenedor de demostración

Para la demostración física del proyecto se plantea inicialmente utilizar un solo contenedor equipado con sensores.

EcoPlaza está diseñado para que posteriormente este contenedor pueda representar diferentes categorías de residuos:

```text
Residuos orgánicos
Residuos reciclables
Residuos no aprovechables
```

En futuras etapas, el sistema podrá trabajar con varios contenedores y sensores registrados simultáneamente.

---

## Próximas etapas

Las siguientes fases previstas para EcoPlaza incluyen:

1. Desarrollo del backend con FastAPI.
2. Creación de la base de datos PostgreSQL.
3. Persistencia real de sensores, residuos, compradores y ventas.
4. Conexión entre frontend y API.
5. Integración del ESP32.
6. Lectura del nivel de llenado de los contenedores.
7. Lectura del peso de los residuos.
8. Actualización automática de información desde los sensores.
9. Gestión funcional de inventario y ventas.
10. Integración del asistente de inteligencia artificial.
11. Generación de análisis e informes a partir de datos reales.
12. Pruebas de usabilidad y mejoras de experiencia de usuario.

---

## Objetivo final

El objetivo final de EcoPlaza es integrar en una sola aplicación:

```text
Monitoreo de residuos
        +
Sensores IoT
        +
Inventario
        +
Compradores
        +
Ventas
        +
Informes
        +
Inteligencia artificial
```

permitiendo tener una visión más organizada del proceso de aprovechamiento y comercialización de residuos.

---

## Autor

**Luis Sebastian Diaz**

Proyecto académico desarrollado para la Universidad Cooperativa de Colombia.

---

## Licencia

Proyecto desarrollado con fines académicos y educativos.
