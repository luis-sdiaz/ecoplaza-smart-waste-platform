export const DEMO_VISIBILITY_STORAGE_KEY = "ecoplaza-show-demo-data";
export const DEFAULT_SHOW_DEMO_DATA = true;

export function readStoredDemoVisibility(): boolean {
  try {
    const stored = window.localStorage.getItem(DEMO_VISIBILITY_STORAGE_KEY);
    return stored === null ? DEFAULT_SHOW_DEMO_DATA : stored === "true";
  } catch {
    return DEFAULT_SHOW_DEMO_DATA;
  }
}

export function storeDemoVisibility(visible: boolean): boolean {
  try {
    window.localStorage.setItem(DEMO_VISIBILITY_STORAGE_KEY, String(visible));
    return true;
  } catch {
    return false;
  }
}

