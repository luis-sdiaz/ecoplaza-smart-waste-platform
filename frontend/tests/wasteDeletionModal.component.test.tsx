import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DeleteWasteRecordModal from "../src/components/DeleteWasteRecordModal";
import type { RemoteWasteRecord } from "../src/services/wasteService";
import type { Container } from "../src/services/containerService";
import es from "../src/i18n/translations/es";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<R extends void | Promise<void> = void, T = unknown> {
    toBeInTheDocument(): void;
    toBeDisabled(): void;
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
  toBeDisabled(received: Element | null) {
    const pass =
      received !== null &&
      ("disabled" in received
        ? Boolean((received as HTMLButtonElement).disabled)
        : received.hasAttribute("disabled") ||
          received.getAttribute("aria-disabled") === "true");
    return {
      pass,
      message: () =>
        pass
          ? "Expected element not to be disabled"
          : "Expected element to be disabled",
    };
  },
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const keys = key.split(".");
      let val: unknown = es;
      for (const k of keys) {
        val = (val as Record<string, unknown>)?.[k];
      }
      if (typeof val === "string") {
        if (options?.name) return val.replace("{{name}}", String(options.name));
        if (options?.code) return val.replace("{{code}}", String(options.code));
        return val;
      }
      return key;
    },
    i18n: { language: "es", changeLanguage: vi.fn() },
  }),
}));

describe("DeleteWasteRecordModal Component - Eliminación Segura de Residuos", () => {
  const mockContainers: Container[] = [
    { id: "11111111-1111-4111-8111-111111111111", code: "CTR-01", createdAt: "2026-01-01" },
    { id: "22222222-2222-4222-8222-222222222222", code: "CTR-02", createdAt: "2026-01-02" },
  ];

  const mockRecords: RemoteWasteRecord[] = [
    {
      id: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      recordNumber: "1",
      containerId: "11111111-1111-4111-8111-111111111111",
      category: "organic",
      weightKg: 15.5,
      registeredAt: "2026-10-01T10:00:00Z",
      status: "available",
    },
    {
      id: "aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
      recordNumber: "2",
      containerId: "22222222-2222-4222-8222-222222222222",
      category: "recyclable",
      weightKg: 20.0,
      registeredAt: "2026-10-02T10:00:00Z",
      status: "sold", // Este no debe aparecer como opción elegible
    },
    {
      id: "aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
      recordNumber: "3",
      containerId: "11111111-1111-4111-8111-111111111111",
      category: "nonRecyclable",
      weightKg: 8.2,
      registeredAt: "2026-10-03T10:00:00Z",
      status: "registered",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("1. Renderiza el modal accesible con role='dialog', título visible y advertencia de integridad contable", () => {
    render(
      <DeleteWasteRecordModal
        records={mockRecords}
        containers={mockContainers}
        isDeleting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByRole("heading", { name: "Eliminar residuo" })).toBeInTheDocument();
    expect(
      screen.getByText(/Solo pueden eliminarse residuos disponibles o registrados que no hayan sido vendidos/i),
    ).toBeInTheDocument();
  });

  it("2. Filtra estrictamente los residuos vendidos: solo ofrece residuos disponibles o registrados en el select", () => {
    render(
      <DeleteWasteRecordModal
        records={mockRecords}
        containers={mockContainers}
        isDeleting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const select = screen.getByTestId("delete-waste-select") as HTMLSelectElement;
    expect(select).toBeInTheDocument();

    // Deben haber 2 opciones (record 1 y record 3), NO el record 2 (sold)
    expect(select.options.length).toBe(2);
    expect(select.options[0].value).toBe("aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1");
    expect(select.options[1].value).toBe("aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3");
  });

  it("3. Permite seleccionar un residuo diferente y actualiza la confirmación visual", () => {
    render(
      <DeleteWasteRecordModal
        records={mockRecords}
        containers={mockContainers}
        isDeleting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const select = screen.getByTestId("delete-waste-select");
    fireEvent.change(select, { target: { value: "aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3" } });

    expect(screen.getByText("RES-003")).toBeInTheDocument();
    expect(screen.getByText("8.2 kg")).toBeInTheDocument();
  });

  it("4. Invoca onConfirm con el id seleccionado al presionar el botón de eliminación", () => {
    const handleConfirm = vi.fn();
    render(
      <DeleteWasteRecordModal
        records={mockRecords}
        containers={mockContainers}
        isDeleting={false}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
      />,
    );

    const confirmButton = screen.getByTestId("confirm-delete-waste-button");
    fireEvent.click(confirmButton);

    expect(handleConfirm).toHaveBeenCalledWith("aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1");
  });

  it("5. Deshabilita los controles y muestra estado de carga cuando isDeleting es true", () => {
    render(
      <DeleteWasteRecordModal
        records={mockRecords}
        containers={mockContainers}
        isDeleting={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const select = screen.getByTestId("delete-waste-select");
    const confirmButton = screen.getByTestId("confirm-delete-waste-button");
    expect(select).toBeDisabled();
    expect(confirmButton).toBeDisabled();
    expect(screen.getByText("Eliminando residuo...")).toBeInTheDocument();
  });

  it("6. Muestra mensaje accesible y deshabilita confirmación cuando no hay residuos elegibles", () => {
    const soldOnlyRecords: RemoteWasteRecord[] = [
      {
        id: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
        recordNumber: "10",
        containerId: "11111111-1111-4111-8111-111111111111",
        category: "organic",
        weightKg: 10,
        registeredAt: "2026-10-01T10:00:00Z",
        status: "sold",
      },
    ];

    render(
      <DeleteWasteRecordModal
        records={soldOnlyRecords}
        containers={mockContainers}
        isDeleting={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByText("No hay residuos en estado disponible o registrado para eliminar."),
    ).toBeInTheDocument();
    const confirmButton = screen.getByTestId("confirm-delete-waste-button");
    expect(confirmButton).toBeDisabled();
  });

  it("7. Invoca onClose al hacer clic en el botón Cancelar", () => {
    const handleClose = vi.fn();
    render(
      <DeleteWasteRecordModal
        records={mockRecords}
        containers={mockContainers}
        isDeleting={false}
        onClose={handleClose}
        onConfirm={vi.fn()}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: "Cancelar" });
    fireEvent.click(cancelButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
