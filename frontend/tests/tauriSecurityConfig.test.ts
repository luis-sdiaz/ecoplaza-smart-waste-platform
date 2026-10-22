import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const TAURI_CONF_URL = new URL("../src-tauri/tauri.conf.json", import.meta.url);
const CAPABILITIES_DEFAULT_URL = new URL(
  "../src-tauri/capabilities/default.json",
  import.meta.url,
);

test("a) tauri.conf.json existe y es un JSON sintácticamente válido", () => {
  assert.equal(
    fs.existsSync(TAURI_CONF_URL),
    true,
    "El archivo tauri.conf.json debe existir en frontend/src-tauri/",
  );

  const rawContent = fs.readFileSync(TAURI_CONF_URL, "utf-8");
  assert.doesNotThrow(() => {
    JSON.parse(rawContent);
  }, "tauri.conf.json debe ser un archivo JSON sintácticamente válido");

  const config = JSON.parse(rawContent);
  assert.equal(config.productName, "EcoPlaza — Smart Waste & IoT Platform");
  assert.equal(config.version, "1.0.0");
  assert.equal(config.identifier, "com.ecoplaza.platform");
  assert.equal(config.bundle?.targets, "all");
  assert.equal(config.bundle?.publisher, "EcoPlaza Team");
});

test("b) app.security.csp está estrictamente configurado con directivas seguras para EcoPlaza", () => {
  const config = JSON.parse(fs.readFileSync(TAURI_CONF_URL, "utf-8"));

  assert.ok(config.app, "Debe existir la propiedad 'app' en tauri.conf.json");
  assert.ok(
    config.app.security,
    "Debe existir la propiedad 'app.security' en tauri.conf.json",
  );

  const csp = config.app.security.csp;
  assert.equal(
    typeof csp,
    "string",
    "app.security.csp debe ser una cadena no nula",
  );
  assert.ok(
    csp.trim().length > 0,
    "app.security.csp no debe estar vacío ni en blanco",
  );

  // Directivas clave de seguridad y conectividad
  assert.ok(
    csp.includes("default-src 'self'"),
    "CSP debe restringir por defecto los orígenes a 'self'",
  );
  assert.ok(
    csp.includes("connect-src 'self' https://*.supabase.co wss://*.supabase.co"),
    "CSP debe autorizar conexiones HTTPS y WebSockets seguros hacia Supabase",
  );
  assert.ok(
    csp.includes("img-src 'self' data: blob: https://*.supabase.co"),
    "CSP debe permitir imágenes locales, base64 data:, blob: y almacenamiento de Supabase",
  );
  assert.ok(
    csp.includes("style-src 'self' 'unsafe-inline'"),
    "CSP debe permitir estilos locales e inline para frameworks UI y Tailwind",
  );
  assert.ok(
    csp.includes("script-src 'self'"),
    "CSP debe permitir scripts exclusivamente desde el origen local 'self'",
  );
  assert.ok(
    csp.includes("font-src 'self' data:"),
    "CSP debe permitir fuentes locales y embebidas data:",
  );
  assert.ok(
    csp.includes("worker-src 'self' blob:"),
    "CSP debe permitir workers locales y creados vía blob: para tareas intensivas",
  );
});

test("c) Dimensiones mínimas de ventana principal (1024x700 px) y título oficial configurados", () => {
  const config = JSON.parse(fs.readFileSync(TAURI_CONF_URL, "utf-8"));

  assert.ok(
    Array.isArray(config.app?.windows),
    "app.windows debe ser un arreglo de configuraciones de ventana",
  );
  assert.ok(
    config.app.windows.length > 0,
    "Debe haber al menos una ventana principal configurada",
  );

  const mainWindow = config.app.windows[0];
  assert.equal(
    mainWindow.title,
    "EcoPlaza — Smart Waste & IoT Platform",
    "El título oficial de la ventana principal debe ser 'EcoPlaza — Smart Waste & IoT Platform'",
  );
  assert.equal(
    mainWindow.minWidth,
    1024,
    "La anchura mínima de la ventana debe ser 1024 píxeles",
  );
  assert.equal(
    mainWindow.minHeight,
    700,
    "La altura mínima de la ventana debe ser 700 píxeles",
  );
  assert.equal(mainWindow.width, 1280);
  assert.equal(mainWindow.height, 800);
  assert.equal(mainWindow.center, true);
});

test("d) capabilities/default.json respeta el principio de mínimo privilegio necesario", () => {
  assert.equal(
    fs.existsSync(CAPABILITIES_DEFAULT_URL),
    true,
    "El archivo capabilities/default.json debe existir en frontend/src-tauri/capabilities/",
  );

  const rawCapabilities = fs.readFileSync(CAPABILITIES_DEFAULT_URL, "utf-8");
  assert.doesNotThrow(() => {
    JSON.parse(rawCapabilities);
  }, "capabilities/default.json debe ser un archivo JSON sintácticamente válido");

  const capabilities = JSON.parse(rawCapabilities);
  assert.ok(
    Array.isArray(capabilities.permissions),
    "permissions debe ser un arreglo",
  );

  // Permisos esenciales indispensables
  assert.ok(
    capabilities.permissions.includes("core:default"),
    "Debe permitir core:default",
  );
  assert.ok(
    capabilities.permissions.includes("dialog:allow-save"),
    "Debe permitir dialog:allow-save para exportación de archivos",
  );
  assert.ok(
    capabilities.permissions.includes("fs:allow-write-text-file"),
    "Debe permitir fs:allow-write-text-file para CSV",
  );
  assert.ok(
    capabilities.permissions.includes("fs:allow-write-file"),
    "Debe permitir fs:allow-write-file para Excel",
  );

  // Principio de mínimo privilegio: no deben existir permisos peligrosos no justificados
  assert.equal(
    capabilities.permissions.includes("shell:allow-execute"),
    false,
    "No debe exponer shell:allow-execute",
  );
  assert.equal(
    capabilities.permissions.includes("fs:allow-read-file"),
    false,
    "No debe exponer lectura arbitraria del sistema de archivos fs:allow-read-file",
  );
});

