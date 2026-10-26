import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContainerManagementPanel from "../src/components/ContainerManagementPanel";

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

const mocks = vi.hoisted(() => ({
  listContainers: vi.fn(),
  listAvailableWasteRecords: vi.fn(),
  createContainer: vi.fn(),
  saveContainerCsv: vi.fn(),
  saveContainerExcel: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown> | string) => {
      if (typeof options === "object" && options !== null && "count" in options) {
        return `${key} ${String(options.count)}`;
      }
      if (typeof options === "string") return options;
      return key;
    },
    i18n: { language: "es", resolvedLanguage: "es", changeLanguage: vi.fn() },
  }),
}));

vi.mock("../src/services/containerService", () => ({
  listContainers: mocks.listContainers,
  createContainer: mocks.createContainer,
}));

vi.mock("../src/services/wasteService", () => ({
  listAvailableWasteRecords: mocks.listAvailableWasteRecords,
}));

vi.mock("../src/services/containerCsv", () => ({
  saveContainerCsv: mocks.saveContainerCsv,
}));

vi.mock("../src/services/containerExcelService", () => ({
  saveContainerExcel: mocks.saveContainerExcel,
}));

const mockContainers = [
  { id: "cont-1", code: "CONT-ORG-01", createdAt: "2026-10-01T12:00:00.000Z" },
  { id: "cont-2", code: "CONT-REC-01", createdAt: "2026-10-02T12:00:00.000Z" },
];

const mockWasteRecords = [
  {
    id: "waste-1",
    recordNumber: "1",
    containerId: "cont-1",
    category: "organic" as const,
    weightKg: 15.5,
    registeredAt: "2026-10-03T12:00:00.000Z",
    status: "available" as const,
  },
];

const success = <T,>(data: T) => ({ ok: true as const, data });

describe("ContainerManagementPanel Component - Gestión Operativa de Contenedores y Accesibilidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listContainers.mockResolvedValue(success(mockContainers));
    mocks.listAvailableWasteRecords.mockResolvedValue(success(mockWasteRecords));
    mocks.createContainer.mockResolvedValue(
      success({ id: "cont-3", code: "CONT-NEW-01", createdAt: "2026-10-26T12:00:00.000Z" }),
    );
  });

  afterEach(cleanup);

  it("1. Renderiza el panel operativo con semántica WAI-ARIA (role='region'), encabezado y badge de datos reales", async () => {
    render(
      <ContainerManagementPanel
        isOpen={true}
        testId="container-management-panel"
      />,
    );

    const region = screen.getByRole("region");
    expect(region).toBeInTheDocument();
    expect(region.getAttribute("aria-labelledby")).toBe("user-containers-title");
    expect(region.getAttribute("data-testid")).toBe("container-management-panel");

    const title = screen.getByRole("heading", { name: /containers\.title/i });
    expect(title).toBeInTheDocument();
    expect(screen.getByText("containers.remoteData")).toBeInTheDocument();
    expect(screen.getByText("containers.description")).toBeInTheDocument();

    expect(await screen.findByText("CONT-ORG-01")).toBeInTheDocument();
    expect(screen.getByText("CONT-REC-01")).toBeInTheDocument();
  });

  it("2. No renderiza ningún elemento en el DOM cuando isOpen es false", () => {
    render(
      <ContainerManagementPanel
        isOpen={false}
        testId="container-management-panel"
      />,
    );

    expect(screen.queryByRole("region")).toBeNull();
    expect(screen.queryByTestId("container-management-panel")).toBeNull();
    expect(screen.queryByText("containers.title")).toBeNull();
  });

  it("3. Permite cerrar o descartar el panel mediante el botón accesible (X) y la tecla Escape cuando se suministra onClose", async () => {
    const onCloseMock = vi.fn();

    render(
      <ContainerManagementPanel
        isOpen={true}
        onClose={onCloseMock}
      />,
    );

    // Botón de descarte interactivo
    const closeBtn = screen.getByRole("button", { name: "containers.closePanel" });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    // Pulsación de tecla Escape sobre la región
    const region = screen.getByRole("region");
    fireEvent.keyDown(region, { key: "Escape" });
    expect(onCloseMock).toHaveBeenCalledTimes(2);
  });

  it("4. Renderiza los controles de formulario, búsqueda, filtro de stock y opciones de ordenamiento", async () => {
    render(<ContainerManagementPanel />);

    // Formulario de nuevo contenedor
    expect(screen.getByText("containers.registerTitle")).toBeInTheDocument();
    const codeInput = screen.getByLabelText("containers.codeLabel");
    expect(codeInput).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: "containers.register" });
    expect(submitBtn).toBeInTheDocument();

    // Controles de búsqueda y filtros tras la carga
    expect(await screen.findByLabelText("containers.searchLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("containers.stockFilterLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("containers.sortLabel")).toBeInTheDocument();
  });

  it("5. Presenta retroalimentación accesible (role='alert') y marca aria-invalid ante errores de validación o duplicidad", async () => {
    mocks.createContainer.mockResolvedValueOnce({
      ok: false,
      error: { code: "duplicate_code", message: "Duplicate" },
    });

    render(<ContainerManagementPanel />);

    // Esperar a que culmine la carga inicial
    expect(await screen.findByText("CONT-ORG-01")).toBeInTheDocument();

    const codeInput = screen.getByLabelText("containers.codeLabel") as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: "CONT-ORG-01" } });

    const submitBtn = screen.getByRole("button", { name: "containers.register" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toContain("containers.duplicateCode");
    });

    expect(codeInput.getAttribute("aria-invalid")).toBe("true");
  });

  it("6. Ejecuta la creación exitosa del contenedor, limpiando el campo y visualizando anuncio accesible (role='status')", async () => {
    render(<ContainerManagementPanel />);

    // Esperar a que culmine la carga inicial
    expect(await screen.findByText("CONT-ORG-01")).toBeInTheDocument();

    const codeInput = screen.getByLabelText("containers.codeLabel") as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: "CONT-NEW-01" } });

    const submitBtn = screen.getByRole("button", { name: "containers.register" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mocks.createContainer).toHaveBeenCalledWith("CONT-NEW-01");
    });

    await waitFor(() => {
      const statusNotice = screen.getByRole("status");
      expect(statusNotice).toBeInTheDocument();
      expect(statusNotice.textContent).toContain("containers.createSuccess");
    });

    expect(codeInput.value).toBe("");
    expect(await screen.findByText("CONT-NEW-01")).toBeInTheDocument();
  });
});
