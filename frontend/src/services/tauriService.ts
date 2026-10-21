export const APP_VERSION = "1.0.0";
export const DEFAULT_WEB_PLATFORM = "web";

export interface AppPlatformInfo {
  isDesktop: boolean;
  platform: string;
  version: string;
}

/**
 * Comprueba de forma segura y resiliente en SSR, Node.js y navegador
 * si la aplicación se está ejecutando dentro del entorno de escritorio Tauri 2.
 */
export function isTauriEnvironment(targetWindow?: unknown): boolean {
  const win =
    targetWindow !== undefined
      ? targetWindow
      : typeof window !== "undefined"
        ? window
        : undefined;

  if (!win || typeof win !== "object") {
    return false;
  }

  const tauriWin = win as {
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: unknown;
  };

  return Boolean(tauriWin.__TAURI_INTERNALS__ || tauriWin.__TAURI__);
}

/**
 * Retorna la versión semántica actual de la aplicación.
 */
export function getAppVersion(): string {
  return APP_VERSION;
}

/**
 * Describe la plataforma y metadatos del entorno de ejecución actual (escritorio o web).
 */
export function getAppPlatformInfo(targetWindow?: unknown): AppPlatformInfo {
  const isDesktop = isTauriEnvironment(targetWindow);
  let platform = DEFAULT_WEB_PLATFORM;

  if (isDesktop) {
    if (typeof navigator !== "undefined" && navigator.userAgent) {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes("win")) {
        platform = "windows";
      } else if (ua.includes("mac")) {
        platform = "macos";
      } else if (ua.includes("linux")) {
        platform = "linux";
      } else {
        platform = "desktop";
      }
    } else {
      platform = "desktop";
    }
  }

  return {
    isDesktop,
    platform,
    version: getAppVersion(),
  };
}

/**
 * Indica si los diálogos nativos del sistema operativo están soportados (solo en Tauri).
 */
export function isNativeDialogSupported(targetWindow?: unknown): boolean {
  return isTauriEnvironment(targetWindow);
}

/**
 * Minimiza la ventana de la aplicación de escritorio si está en entorno Tauri.
 */
export async function minimizeAppWindow(): Promise<boolean> {
  if (!isTauriEnvironment()) {
    return false;
  }
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();
    await appWindow.minimize();
    return true;
  } catch {
    return false;
  }
}

/**
 * Alterna entre maximizar y restaurar la ventana de la aplicación de escritorio.
 */
export async function toggleMaximizeAppWindow(): Promise<boolean> {
  if (!isTauriEnvironment()) {
    return false;
  }
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();
    await appWindow.toggleMaximize();
    return true;
  } catch {
    return false;
  }
}

/**
 * Cierra la ventana de la aplicación de escritorio si está en entorno Tauri.
 */
export async function closeAppWindow(): Promise<boolean> {
  if (!isTauriEnvironment()) {
    return false;
  }
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();
    await appWindow.close();
    return true;
  } catch {
    return false;
  }
}

