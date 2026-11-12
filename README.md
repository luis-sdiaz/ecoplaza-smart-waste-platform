# EcoPlaza - Smart Waste Platform

EcoPlaza es una aplicación de escritorio desarrollada para facilitar la gestión y comercialización de residuos aprovechables mediante herramientas digitales.

El proyecto integra el registro de residuos, control de inventario, administración de compradores, ventas, informes y monitoreo de contenedores. También incorpora un asistente de inteligencia artificial y un sistema IoT basado en ESP32 para obtener mediciones físicas.

La aplicación fue desarrollada utilizando React, TypeScript y Tauri 2. Para la autenticación, almacenamiento y consulta de información se utiliza Supabase con PostgreSQL.

## Descargas

La versión 1.0.0 está disponible para Windows, macOS y Linux.

| Sistema operativo | Arquitectura | Instalador |
|---|---|---|
| Windows | x64 | [Descargar EXE](https://github.com/luis-sdiaz/ecoplaza-smart-waste-platform/releases/download/v1.0.0/EcoPlaza.Smart.Waste.and.IoT.Platform_1.0.0_x64-setup.exe) |
| macOS | Apple Silicon | [Descargar DMG](https://github.com/luis-sdiaz/ecoplaza-smart-waste-platform/releases/download/v1.0.0/EcoPlaza.Smart.Waste.and.IoT.Platform_1.0.0_aarch64.dmg) |
| macOS | Intel | [Descargar DMG](https://github.com/luis-sdiaz/ecoplaza-smart-waste-platform/releases/download/v1.0.0/EcoPlaza.Smart.Waste.and.IoT.Platform_1.0.0_x64.dmg) |
| Linux | x64 | [Descargar AppImage](https://github.com/luis-sdiaz/ecoplaza-smart-waste-platform/releases/download/v1.0.0/EcoPlaza.Smart.Waste.and.IoT.Platform_1.0.0_amd64.AppImage) |
| Linux Debian/Ubuntu | x64 | [Descargar DEB](https://github.com/luis-sdiaz/ecoplaza-smart-waste-platform/releases/download/v1.0.0/EcoPlaza.Smart.Waste.and.IoT.Platform_1.0.0_amd64.deb) |

También se pueden consultar los archivos en la sección de [lanzamientos del repositorio](https://github.com/luis-sdiaz/ecoplaza-smart-waste-platform/releases).

**Nota:** La aplicación se ha instalado y probado en Windows. Los instaladores para macOS y Linux se generaron mediante GitHub Actions, pero no se han probado directamente en esos sistemas. Los paquetes de macOS no están firmados ni notarizados por Apple.

## Objetivo del proyecto

El objetivo de EcoPlaza es desarrollar una herramienta que permita organizar y consultar la información relacionada con la gestión de residuos desde una sola aplicación.

Para ello se implementaron módulos administrativos, una base de datos y un sistema de monitoreo IoT. Esto permite trabajar tanto con los registros comerciales como con mediciones obtenidas desde dispositivos físicos.

## Funcionalidades

### Inicio

Presenta un resumen general de la información registrada en la plataforma.

Incluye indicadores relacionados con residuos, inventario, ventas y dispositivos monitoreados, además de gráficos que facilitan la consulta de los datos.

### Sensores

Permite consultar las mediciones recibidas desde los dispositivos IoT.

Durante el desarrollo se realizó una prueba física utilizando un ESP32 y un sensor ultrasónico HC-SR04. El dispositivo envía lecturas a Supabase, que posteriormente son consultadas por la aplicación.

Entre los datos disponibles se encuentran la distancia medida, el porcentaje de llenado estimado y la fecha de la última lectura.

El módulo también cuenta con dispositivos demostrativos para visualizar otros escenarios de monitoreo.

### Contenedores

Permite registrar y administrar los contenedores utilizados para almacenar residuos.

Cada contenedor cuenta con un identificador y puede asociarse con los registros de residuos correspondientes.

También se incluye una visualización tridimensional y, cuando existe telemetría disponible, se muestran los datos del dispositivo físico.

### Residuos

Permite registrar los residuos que ingresan al sistema, indicando su categoría, peso y contenedor asociado.

Los registros se pueden consultar mediante filtros y se utilizan posteriormente en los procesos de inventario y comercialización.

### Inventario

Muestra los residuos disponibles para su venta y permite consultar información sobre las existencias.

El inventario se relaciona con los registros realizados en el módulo de residuos.

### Compradores

Permite registrar y administrar la información de los compradores.

Incluye validación de datos de contacto, edición de registros y consulta del historial de compras.

### Ventas

Permite registrar ventas de residuos disponibles, asociándolas con un comprador.

El módulo calcula los importes correspondientes y actualiza la información relacionada con las transacciones.

### Informes

Presenta estadísticas operativas y comerciales mediante gráficos, indicadores y filtros por fechas.

También permite exportar información a archivos CSV y Excel.

### Asistente IA

EcoPlaza incorpora un asistente que utiliza Google Gemini para responder consultas relacionadas con la gestión de residuos.

La integración se realiza mediante una Supabase Edge Function, de manera que la clave privada del proveedor se mantiene en el servidor.

El asistente también utiliza información operativa disponible en la aplicación para apoyar el análisis de inventario, sensores y otros procesos.

Algunas consultas pueden resolverse mediante funciones de análisis local cuando el servicio externo no está disponible.

### Configuración y perfil

La aplicación permite cambiar el idioma entre español e inglés y seleccionar el modo claro u oscuro.

Los usuarios también pueden consultar y editar la información de su perfil.

## Tecnologías utilizadas

| Tecnología | Uso en el proyecto |
|---|---|
| React 19 | Desarrollo de la interfaz |
| TypeScript | Lógica y tipado de la aplicación |
| Tailwind CSS | Estilos y diseño responsive |
| Vite | Entorno de desarrollo y compilación |
| Tauri 2 | Aplicación de escritorio |
| Rust | Componentes nativos de Tauri |
| Supabase | Servicios backend y autenticación |
| PostgreSQL | Almacenamiento de información |
| Supabase Edge Functions | Integración segura con Gemini |
| Google Gemini | Asistente de inteligencia artificial |
| ESP32 | Microcontrolador utilizado en el sistema IoT |
| HC-SR04 | Medición ultrasónica de distancia |
| Three.js | Visualización tridimensional |
| GitHub Actions | Automatización de pruebas y compilaciones |

## Arquitectura general

El sistema se divide en tres partes principales.

**Aplicación de escritorio:** desarrollada con React y TypeScript, y empaquetada mediante Tauri 2. Es la interfaz desde la que los usuarios administran la información y consultan los módulos.

**Backend:** utiliza Supabase para la autenticación de usuarios, el almacenamiento de datos en PostgreSQL y la ejecución de funciones del servidor.

**Sistema IoT:** utiliza un microcontrolador ESP32 para obtener mediciones del sensor HC-SR04 y enviarlas a la base de datos mediante una conexión de red.

El flujo de información es el siguiente:

```text
Sensor HC-SR04
      |
     ESP32
      |
      v
   Supabase
      |
   PostgreSQL
      |
      v
Aplicación EcoPlaza
React + TypeScript + Tauri
      |
      +---- Gestión de residuos
      +---- Inventario
      +---- Compradores y ventas
      +---- Sensores e informes
      +---- Asistente IA
```

En el caso del asistente, las consultas que requieren Gemini se procesan mediante una Edge Function autenticada.

## Integración con el ESP32

Para comprobar el funcionamiento del sistema IoT se utilizó un ESP32 conectado a un sensor ultrasónico HC-SR04.

El sensor mide la distancia entre su posición y el objeto que tiene enfrente. A partir de esa distancia se calcula un porcentaje estimado de llenado.

Las mediciones se envían periódicamente a Supabase y pueden consultarse desde los módulos Sensores y Contenedores.

Durante las pruebas se utilizó el identificador `CTR-BOG-001`.

Es importante diferenciar las mediciones físicas de los registros administrativos: el HC-SR04 mide distancia, mientras que el peso de los residuos se registra desde la aplicación.

La precisión del porcentaje de llenado depende de la calibración y las dimensiones del contenedor.

La documentación del firmware y las conexiones se encuentra en [firmware/README.md](firmware/README.md).

## Estructura del repositorio

```text
ecoplaza-smart-waste-platform/
|
├── .github/
│   └── workflows/
|
├── frontend/
│   ├── src/
│   │   ├── auth/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── i18n/
│   ├── src-tauri/
│   ├── tests/
│   └── package.json
|
├── firmware/
│   ├── src/
│   └── README.md
|
├── supabase/
│   ├── functions/
│   └── migrations/
|
└── README.md
```

- `frontend/`: aplicación de escritorio, componentes, servicios y pruebas.
- `frontend/src-tauri/`: configuración y empaquetado nativo.
- `firmware/`: código del ESP32 y documentación del hardware.
- `supabase/`: migraciones de base de datos y funciones backend.
- `.github/workflows/`: automatización de pruebas y compilaciones.

## Instalación para desarrollo

### Requisitos

Para ejecutar el proyecto desde el código fuente se requiere:

- Node.js 24 y npm.
- Rust y las dependencias necesarias para Tauri 2.
- Git.
- Un proyecto Supabase configurado con las tablas y funciones correspondientes.

### 1. Clonar el repositorio

```bash
git clone https://github.com/luis-sdiaz/ecoplaza-smart-waste-platform.git
cd ecoplaza-smart-waste-platform
```

### 2. Instalar las dependencias

```bash
cd frontend
npm ci
```

### 3. Configurar Supabase

Crear el archivo `.env.local` a partir de `.env.example` y agregar la configuración pública del proyecto:

```dotenv
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_tu_clave
```

Para utilizar todas las funciones de la aplicación, el proyecto Supabase debe tener el esquema de base de datos y las funciones backend correspondientes.

Las claves privadas no deben agregarse al repositorio ni utilizarse en variables del frontend.

### 4. Ejecutar la aplicación

Para iniciar el servidor de desarrollo:

```bash
npm run dev
```

Para ejecutar EcoPlaza como aplicación de escritorio:

```bash
npm run desktop:dev
```

### 5. Generar el instalador

```bash
npm run desktop:build
```

Los paquetes se generan en:

```text
frontend/src-tauri/target/release/bundle/
```

El resultado depende del sistema operativo en el que se realice la compilación.

## Pruebas realizadas

Durante el desarrollo se implementaron pruebas para comprobar los módulos, cálculos, servicios y componentes de la aplicación.

En la última ejecución de la suite completa se obtuvieron los siguientes resultados:

| Tipo de prueba | Aprobadas |
|---|---:|
| Pruebas Node.js | 199 |
| Pruebas de componentes con Vitest | 417 |
| Total | 616 |

Las 616 pruebas finalizaron correctamente.

También se verificaron ESLint, la compilación de producción del frontend y la generación del instalador Windows.

Para ejecutar las verificaciones desde `frontend/`:

```bash
npm run lint
npm run build
npm test
```

## Compilaciones multiplataforma

El repositorio cuenta con un workflow de GitHub Actions para generar instaladores de macOS y Linux.

Se realizaron compilaciones para:

- macOS Intel (`x86_64`).
- macOS Apple Silicon (`aarch64`).
- Linux x64 (`.deb` y `.AppImage`).

Los trabajos de compilación finalizaron correctamente.

Estas versiones todavía requieren pruebas funcionales en los respectivos sistemas operativos.

## Limitaciones y mejoras futuras

Aunque la aplicación cuenta con los módulos principales implementados, todavía existen aspectos que pueden mejorarse.

Entre ellos se encuentran la calibración del sistema IoT para diferentes contenedores, la incorporación de más dispositivos físicos, el fortalecimiento de las políticas de acceso a telemetría y la firma digital de los instaladores.

La disponibilidad de Gemini también depende del servicio externo, la conexión y las cuotas configuradas.

La versión 1.0.0 se presenta como una versión preliminar para demostración y evaluación.

## Autor

**Luis Sebastián Díaz**

Proyecto desarrollado en el contexto de formación académica en desarrollo de software en la Universidad Cooperativa de Colombia.

GitHub: [luis-sdiaz](https://github.com/luis-sdiaz)

---

EcoPlaza es un proyecto que reúne desarrollo de aplicaciones de escritorio, bases de datos, Internet de las Cosas e inteligencia artificial para apoyar los procesos de gestión de residuos.
