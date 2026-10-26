import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ResetPreferencesDialog from "../src/components/ResetPreferencesDialog";

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
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: "es", resolvedLanguage: "es", changeLanguage: vi.fn() },
  }),
}));

describe("ResetPreferencesDialog Component - Confirmación de Restablecimiento y Accesibilidad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof HTMLDialogElement !== "undefined") {
      HTMLDialogElement.prototype.showModal = vi.fn();
      HTMLDialogElement.prototype.close = vi.fn();
    }
  });

  it("1. Renderiza condicionalmente el diálogo modal cuando isOpen es true con roles WAI-ARIA, encabezado y descripción accesible", () => {
    render(
      <ResetPreferencesDialog
        isOpen={true}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        testId="reset-preferences-dialog"
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("reset-preferences-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("reset-preferences-description");

    const heading = screen.getByRole("heading", { name: "settings.resetDialogTitle" });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText("settings.resetDialogDescription")).toBeInTheDocument();
  });

  it("2. No renderiza ningún elemento en el DOM cuando isOpen es false", () => {
    render(
      <ResetPreferencesDialog
        isOpen={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        testId="reset-preferences-dialog"
      />,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByTestId("reset-preferences-dialog")).toBeNull();
    expect(screen.queryByText("settings.resetDialogTitle")).toBeNull();
  });

  it("3. Permite cancelar el diálogo modal mediante el botón interactivo de descarte (X) y el botón secundario Cancelar", () => {
    const onCancelMock = vi.fn();

    render(
      <ResetPreferencesDialog
        isOpen={true}
        onCancel={onCancelMock}
        onConfirm={vi.fn()}
      />,
    );

    // Descarte mediante botón X con aria-label
    const closeIconButton = screen.getByRole("button", { name: "settings.resetClose" });
    expect(closeIconButton).toBeInTheDocument();
    fireEvent.click(closeIconButton);
    expect(onCancelMock).toHaveBeenCalledTimes(1);

    // Cancelar mediante botón secundario
    const cancelButton = screen.getByRole("button", { name: "settings.resetCancel" });
    expect(cancelButton).toBeInTheDocument();
    fireEvent.click(cancelButton);
    expect(onCancelMock).toHaveBeenCalledTimes(2);
  });

  it("4. Captura el evento de teclado Escape en el contenedor del diálogo para invocar onCancel de forma accesible", () => {
    const onCancelMock = vi.fn();

    render(
      <ResetPreferencesDialog
        isOpen={true}
        onCancel={onCancelMock}
        onConfirm={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it("5. Ejecuta onConfirm al accionar el botón principal de restablecimiento de preferencias", () => {
    const onConfirmMock = vi.fn();

    render(
      <ResetPreferencesDialog
        isOpen={true}
        onCancel={vi.fn()}
        onConfirm={onConfirmMock}
      />,
    );

    const confirmButton = screen.getByRole("button", { name: "settings.resetConfirm" });
    expect(confirmButton).toBeInTheDocument();
    fireEvent.click(confirmButton);
    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });

  it("6. Maneja el estado de procesamiento (isSubmitting === true) bloqueando botones, aplicando aria-busy y anunciando estado accesible", () => {
    const onCancelMock = vi.fn();
    const onConfirmMock = vi.fn();

    render(
      <ResetPreferencesDialog
        isOpen={true}
        onCancel={onCancelMock}
        onConfirm={onConfirmMock}
        isSubmitting={true}
      />,
    );

    const confirmButton = screen.getByRole("button", { name: /settings\.resetting/i });
    expect(confirmButton).toBeInTheDocument();
    expect(confirmButton.getAttribute("aria-busy")).toBe("true");
    expect((confirmButton as HTMLButtonElement).disabled).toBe(true);

    const cancelButton = screen.getByRole("button", { name: "settings.resetCancel" });
    expect((cancelButton as HTMLButtonElement).disabled).toBe(true);

    const closeIconButton = screen.getByRole("button", { name: "settings.resetClose" });
    expect((closeIconButton as HTMLButtonElement).disabled).toBe(true);

    // Verificar anuncio de estado accesible con role="status"
    const statusNotice = screen.getByRole("status");
    expect(statusNotice).toBeInTheDocument();
    expect(statusNotice.textContent).toContain("settings.resetting");

    // Los clics no deben disparar callbacks cuando isSubmitting es true
    fireEvent.click(confirmButton);
    fireEvent.click(cancelButton);
    expect(onConfirmMock).not.toHaveBeenCalled();
    expect(onCancelMock).not.toHaveBeenCalled();
  });
});

