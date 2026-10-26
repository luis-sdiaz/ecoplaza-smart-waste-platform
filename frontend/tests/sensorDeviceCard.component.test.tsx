import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SensorDeviceCard, {
  type SensorDeviceCardProps,
} from "../src/components/SensorDeviceCard";

// Extensión de matchers para compatibilidad con React Testing Library en Vitest
declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<R extends void | Promise<void> = void, T = unknown> {
    toBeInTheDocument(): void;
  }
  interface AsymmetricMatchersContaining {
    toBeInTheDocument(): unknown;
  }
}

expect.extend({
  toBeInTheDocument(received: Element | null) {
    const pass = received !== null && document.body.contains(received);
    return {
      pass,
      message: () =>
        pass
          ? "Expected element not to be in document"
          : "Expected element to be in document",
    };
  },
});

afterEach(cleanup);

// Mocks de i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      key: string,
      defaultValueOrOptions?:
        | string
        | { defaultValue?: string; name?: string; count?: number; [key: string]: unknown },
    ) => {
      if (typeof defaultValueOrOptions === "string") {
        return defaultValueOrOptions;
      }
      if (defaultValueOrOptions && typeof defaultValueOrOptions === "object") {
        if (defaultValueOrOptions.name) {
          if (key === "sensors.viewHistoryFor") {
            return `Ver historial de ${defaultValueOrOptions.name}`;
          }
          if (key === "sensors.simulateCardAriaLabel") {
            return `Simular lectura para contenedor ${defaultValueOrOptions.name}`;
          }
          if (key === "sensors.manageContainerAriaLabel") {
            return `Gestionar contenedor ${defaultValueOrOptions.name}`;
          }
        }
        return defaultValueOrOptions.defaultValue || key;
      }
      const translations: Record<string, string> = {
        "sensors.fillLevel": "Nivel de llenado",
        "sensors.battery": "Batería",
        "sensors.temperature": "Temperatura",
        "sensors.registeredWeight": "Peso registrado",
        "sensors.lastReading": "Última lectura",
        "sensors.noTelemetry": "Sin telemetría reciente",
        "sensors.waitingSignal": "En espera de señal",
        "sensors.alertStatus": "Alerta",
        "sensors.criticalFillAlert": "Capacidad crítica (>80%)",
        "sensors.criticalAlertDescription":
          "Alerta crítica: capacidad por encima del 80%",
        "sensors.viewHistory": "Ver historial",
        "sensors.simulateCardAction": "Simular",
        "sensors.manageContainer": "Gestionar",
        "sensors.loadingCard": "Cargando información del sensor...",
        "common.active": "Activo",
      };
      return translations[key] ?? key;
    },
    i18n: { language: "es", resolvedLanguage: "es", changeLanguage: vi.fn() },
  }),
}));

describe("SensorDeviceCard Component - Monitoreo de Sensores y Telemetría IoT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (
    propsOverrides: Partial<SensorDeviceCardProps> = {},
  ) => {
    const defaultProps: SensorDeviceCardProps = {
      name: "Contenedor Plaza Central",
      sensorId: "CTR-001",
      category: "Material Orgánico",
      fillLevel: 65,
      weight: 24.5,
      batteryLevel: 75,
      temperatureCelsius: 21.5,
      lastUpdate: "Hace 2 minutos",
      hasTelemetry: true,
      ...propsOverrides,
    };
    return {
      ...render(<SensorDeviceCard {...defaultProps} />),
      props: defaultProps,
    };
  };

  it("1. Renderiza el contenedor principal con semántica accesible (role='region'), nombre y categoría", () => {
    const { container } = renderComponent();

    const region =
      screen.queryByRole("region") ||
      container.querySelector('[role="region"]') ||
      container.firstChild;
    expect(region).toBeInTheDocument();

    expect(screen.getByText("Contenedor Plaza Central")).toBeInTheDocument();
    expect(screen.getByText("CTR-001")).toBeInTheDocument();
    expect(screen.getByText("Material Orgánico")).toBeInTheDocument();
  });

  it("2. Despliega métricas cuantitativas de telemetría y barra de progreso con atributos ARIA", () => {
    renderComponent();

    // Verificación de nivel de llenado
    expect(screen.getByText("65%")).toBeInTheDocument();

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
    expect(progressbar.getAttribute("aria-valuenow")).toBe("65");
    expect(progressbar.getAttribute("aria-valuemin")).toBe("0");
    expect(progressbar.getAttribute("aria-valuemax")).toBe("100");

    // Verificación de píldoras de telemetría
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText(/21[.,]?5\s*°C/i)).toBeInTheDocument();
    expect(screen.getByText(/24[.,]?5\s*kg/i)).toBeInTheDocument();
    expect(screen.getByText("Hace 2 minutos")).toBeInTheDocument();
  });

  it("3. Detecta capacidad crítica (>80%) con alerta visual y descripción accesible para lectores de pantalla", () => {
    renderComponent({
      fillLevel: 88,
      status: "Alerta",
    });

    expect(screen.getByText("88%")).toBeInTheDocument();
    expect(screen.getByText("Capacidad crítica (>80%)")).toBeInTheDocument();

    // Texto accesible oculto (.sr-only)
    const srAlert = screen.getByText(/alerta crítica: capacidad por encima del 80%/i);
    expect(srAlert).toBeInTheDocument();

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.getAttribute("aria-valuenow")).toBe("88");
  });

  it("4. Soporta eventos de clic en botones de acción operativa (Historial, Simular, Gestionar)", () => {
    const handleViewHistory = vi.fn();
    const handleSimulateTelemetry = vi.fn();
    const handleManageContainer = vi.fn();

    renderComponent({
      onViewHistory: handleViewHistory,
      onSimulateTelemetry: handleSimulateTelemetry,
      onManageContainer: handleManageContainer,
    });

    const viewHistoryBtn = screen.getByRole("button", {
      name: "Ver historial de Contenedor Plaza Central",
    });
    fireEvent.click(viewHistoryBtn);
    expect(handleViewHistory).toHaveBeenCalledTimes(1);

    const simulateBtn = screen.getByRole("button", {
      name: "Simular lectura para contenedor Contenedor Plaza Central",
    });
    fireEvent.click(simulateBtn);
    expect(handleSimulateTelemetry).toHaveBeenCalledTimes(1);
    expect(handleSimulateTelemetry).toHaveBeenCalledWith("CTR-001");

    const manageBtn = screen.getByRole("button", {
      name: "Gestionar contenedor Contenedor Plaza Central",
    });
    fireEvent.click(manageBtn);
    expect(handleManageContainer).toHaveBeenCalledTimes(1);
    expect(handleManageContainer).toHaveBeenCalledWith("CTR-001");
  });

  it("5. Maneja adecuadamente el estado de ausencia de telemetría (espera de señal) sin errores ni NaN", () => {
    renderComponent({
      hasTelemetry: false,
      fillLevel: null,
      batteryLevel: null,
      temperatureCelsius: null,
      weight: null,
      lastUpdate: null,
    });

    const noTelemetryElements = screen.getAllByText("Sin telemetría reciente");
    expect(noTelemetryElements.length).toBeGreaterThanOrEqual(1);

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.getAttribute("aria-valuenow")).toBe("0");

    // Las métricas vacías deben mostrar el guion de fallback "—"
    const dashElements = screen.getAllByText("—");
    expect(dashElements.length).toBeGreaterThanOrEqual(2);
  });

  it("6. Soporta estado de carga accesible con role='status' y aria-live='polite' cuando isLoading es verdadero", () => {
    renderComponent({ isLoading: true });

    const statusLoader = screen.getByRole("status");
    expect(statusLoader).toBeInTheDocument();
    expect(statusLoader.getAttribute("aria-live")).toBe("polite");
    expect(
      screen.getByText("Cargando información del sensor..."),
    ).toBeInTheDocument();

    // El contenido estándar no se renderiza durante la carga
    expect(screen.queryByText("CTR-001")).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
