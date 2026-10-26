import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SensorStatusCard, {
  type SensorStatusCardProps,
} from "../src/components/SensorStatusCard";

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
      defaultValueOrOptions?: string | { defaultValue?: string; count?: number },
    ) => {
      if (typeof defaultValueOrOptions === "string") {
        return defaultValueOrOptions;
      }
      if (defaultValueOrOptions && typeof defaultValueOrOptions === "object") {
        return defaultValueOrOptions.defaultValue || key;
      }
      return key;
    },
    i18n: { language: "es", resolvedLanguage: "es", changeLanguage: vi.fn() },
  }),
}));

describe("SensorStatusCard Component - Telemetría y Accesibilidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderCard = (propsOverrides: Partial<SensorStatusCardProps> = {}) => {
    const defaultProps: SensorStatusCardProps = {
      name: "Contenedor 01",
      category: "Residuos Orgánicos",
      fillLevel: 68,
      status: "Activo",
      ...propsOverrides,
    };
    return {
      ...render(<SensorStatusCard {...defaultProps} />),
      props: defaultProps,
    };
  };

  it("1. Renderiza el contenedor principal con roles semánticos y título accesible", () => {
    renderCard();

    expect(screen.getByText("Contenedor 01")).toBeInTheDocument();
    expect(screen.getByText("Residuos Orgánicos")).toBeInTheDocument();
    expect(screen.getByRole("region")).toBeInTheDocument();
  });

  it("2. Despliega los valores cuantitativos y unidades de medida correspondientes", () => {
    renderCard({ fillLevel: 68 });

    expect(screen.getByText("68%")).toBeInTheDocument();
    expect(screen.getByText(/nivel de llenado/i)).toBeInTheDocument();
  });

  it("3. Representación visual y semántica accesible de los indicadores (progressbar y badge)", () => {
    renderCard({ fillLevel: 68, status: "Activo" });

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
    expect(progressbar.getAttribute("aria-valuenow")).toBe("68");
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("4. Textos accesibles para tecnologías asistivas (sr-only) en nivel crítico", () => {
    renderCard({ fillLevel: 85, status: "Activo" });

    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(
      screen.getByText(/alerta crítica|crítico|critical/i),
    ).toBeInTheDocument();
  });

  it("5. Tolerancia y resiliencia ante valores nulos, indefinidos y en cero", () => {
    const { rerender } = renderCard({ fillLevel: null, hasTelemetry: false });

    expect(screen.queryByText(/NaN/)).toBeNull();
    expect(screen.getByText("—")).toBeInTheDocument();

    rerender(
      <SensorStatusCard
        name="Contenedor 01"
        category="Residuos Orgánicos"
        fillLevel={0}
        status="Activo"
      />,
    );

    expect(screen.queryByText(/NaN/)).toBeNull();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("6. Muestra estado de carga accesible con role='status' y soporta interactividad con onClick", () => {
    const { rerender } = renderCard({ isLoading: true });

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();

    const handleClick = vi.fn();
    rerender(
      <SensorStatusCard
        name="Contenedor 01"
        category="Residuos Orgánicos"
        fillLevel={50}
        status="Activo"
        onClick={handleClick}
      />,
    );

    const interactiveCard = screen.getByRole("button");
    fireEvent.click(interactiveCard);
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(interactiveCard, { key: "Enter" });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });
});

