import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_VERSION,
  closeAppWindow,
  DEFAULT_WEB_PLATFORM,
  getAppPlatformInfo,
  getAppVersion,
  isNativeDialogSupported,
  isTauriEnvironment,
  minimizeAppWindow,
  toggleMaximizeAppWindow,
} from "../src/services/tauriService.ts";

test("a) isTauriEnvironment retorna false cuando no existe el objeto global de Tauri (entorno web/Node)", () => {
  // En Node.js puro sin window
  assert.equal(isTauriEnvironment(), false);

  // En entorno simulado de navegador estándar sin internals de Tauri
  const standardWebWindow = {
    document: {},
    location: { href: "http://localhost:5173" },
  };
  assert.equal(isTauriEnvironment(standardWebWindow), false);

  // Objeto window vacío o sin propiedades de Tauri
  assert.equal(isTauriEnvironment({}), false);
});

test("b) isTauriEnvironment retorna true cuando se simula la presencia de __TAURI_INTERNALS__ o __TAURI__", () => {
  // Simulación de Tauri 2 con __TAURI_INTERNALS__
  const tauri2Window = {
    __TAURI_INTERNALS__: {
      invoke: () => Promise.resolve(),
    },
  };
  assert.equal(isTauriEnvironment(tauri2Window), true);

  // Simulación de compatibilidad con __TAURI__
  const legacyTauriWindow = {
    __TAURI__: {
      invoke: () => Promise.resolve(),
    },
  };
  assert.equal(isTauriEnvironment(legacyTauriWindow), true);

  // Con globalThis.window temporal
  const previousWindow = (globalThis as unknown as { window?: unknown }).window;
  try {
    (globalThis as unknown as { window?: unknown }).window = {
      __TAURI_INTERNALS__: {},
    };
    assert.equal(isTauriEnvironment(), true);
  } finally {
    if (previousWindow === undefined) {
      delete (globalThis as unknown as { window?: unknown }).window;
    } else {
      (globalThis as unknown as { window?: unknown }).window = previousWindow;
    }
  }
});

test("c) getAppPlatformInfo describe adecuadamente el entorno web por defecto con versión consistente", () => {
  const info = getAppPlatformInfo();
  assert.equal(info.isDesktop, false);
  assert.equal(info.platform, DEFAULT_WEB_PLATFORM);
  assert.equal(info.version, APP_VERSION);
  assert.equal(info.version, "1.0.0");
  assert.equal(getAppVersion(), "1.0.0");

  // También pasando un window web explícito
  const explicitWebInfo = getAppPlatformInfo({ navigator: { userAgent: "Mozilla/5.0" } });
  assert.equal(explicitWebInfo.isDesktop, false);
  assert.equal(explicitWebInfo.platform, "web");
  assert.equal(explicitWebInfo.version, "1.0.0");
});

test("d) isNativeDialogSupported solo responde true en contexto de escritorio verificado", () => {
  // En entorno web / Node
  assert.equal(isNativeDialogSupported(), false);
  assert.equal(isNativeDialogSupported({}), false);

  // En entorno de escritorio verificado
  const desktopWindow = { __TAURI_INTERNALS__: {} };
  assert.equal(isNativeDialogSupported(desktopWindow), true);
});

test("e) Manejo resiliente ante entornos donde window es undefined o valores no objetos", () => {
  // Valores primitivos o nulos no deben provocar excepciones
  assert.equal(isTauriEnvironment(undefined), false);
  assert.equal(isTauriEnvironment(null), false);
  assert.equal(isTauriEnvironment("window"), false);
  assert.equal(isTauriEnvironment(123), false);

  assert.equal(isNativeDialogSupported(undefined), false);
  assert.equal(isNativeDialogSupported(null), false);

  const platformInfo = getAppPlatformInfo(undefined);
  assert.equal(platformInfo.isDesktop, false);
  assert.equal(platformInfo.platform, "web");
  assert.equal(platformInfo.version, "1.0.0");
});

test("f) Funciones seguras de control de ventana retornan false de forma no bloqueante fuera de Tauri", async () => {
  assert.equal(await minimizeAppWindow(), false);
  assert.equal(await toggleMaximizeAppWindow(), false);
  assert.equal(await closeAppWindow(), false);
});

