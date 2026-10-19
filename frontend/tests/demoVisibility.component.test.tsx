import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  DEMO_VISIBILITY_STORAGE_KEY,
  DemoVisibilityContext,
} from "../src/context/DemoVisibilityContext";
import { DemoVisibilityProvider } from "../src/context/DemoVisibilityProvider";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import SensorsPage from "../src/pages/SensorsPage";
import SettingsPanel from "../src/components/SettingsPanel";

const authMock = vi.hoisted(() => ({
  user: { id: "user-123", email: "user@ecoplaza.com" },
}));

vi.mock("../src/auth/AuthContext", () => ({
  useAuth: () => authMock,
}));

vi.mock("../src/services/containerService", () => ({
  listContainers: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  listContainerStockSummaries: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "es", changeLanguage: vi.fn() },
  }),
  initReactI18next: {
    type: "3rdParty",
    init: vi.fn(),
  },
}));

vi.mock("../src/i18n/config", () => ({
  default: { language: "es", changeLanguage: vi.fn() },
  LANGUAGE_STORAGE_KEY: "ecoplaza-language",
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Demonstration data visibility control", () => {
  test("SensorsPage displays demo sensors when demo data visibility is true and keeps real container management", () => {
    render(
      <DemoVisibilityContext.Provider value={{ showDemoData: true, setShowDemoData: () => {} }}>
        <SensorsPage />
      </DemoVisibilityContext.Provider>
    );

    expect(screen.getByText("sensors.demoTitle")).toBeTruthy();
    expect(screen.getByText("sensors.demoDevices")).toBeTruthy();
    expect(screen.getByText("containers.title")).toBeTruthy();
  });

  test("SensorsPage hides demo sensors when demo data visibility is false while keeping real container management intact", () => {
    render(
      <DemoVisibilityContext.Provider value={{ showDemoData: false, setShowDemoData: () => {} }}>
        <SensorsPage />
      </DemoVisibilityContext.Provider>
    );

    expect(screen.queryByText("sensors.demoTitle")).toBeNull();
    expect(screen.queryByText("sensors.demoDevices")).toBeNull();
    expect(screen.getByText("containers.title")).toBeTruthy();
  });

  test("SettingsPanel toggles demonstration visibility and persists in storage", () => {
    render(
      <ThemeProvider>
        <DemoVisibilityProvider>
          <SettingsPanel />
        </DemoVisibilityProvider>
      </ThemeProvider>
    );

    const checkbox = screen.getByRole("checkbox", { name: /settings.showDemoData/i }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
    expect(localStorage.getItem(DEMO_VISIBILITY_STORAGE_KEY)).toBe("false");

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(localStorage.getItem(DEMO_VISIBILITY_STORAGE_KEY)).toBe("true");
  });
});

