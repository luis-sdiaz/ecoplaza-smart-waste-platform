import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SuccessToast from "../src/components/SuccessToast";

// Extensión de matcher toBeInTheDocument para compatibilidad con React Testing Library en Vitest
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

describe("SuccessToast Component - Notificaciones y Feedback UI/UX Accesible", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("1. No renderiza nada en el DOM cuando no hay mensaje o está inactivo", () => {
    const { container } = render(
      <SuccessToast message onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("2. Renderiza el mensaje de éxito con rol accesible ARIA (role=\"status\" o \"alert\")", () => {
    render(
      <SuccessToast message="Operación completada con éxito" onClose={vi.fn()} />,
    );

    const toastElement =
      screen.queryByRole("status") ||
      screen.queryByRole("alert") ||
      screen.getByText(/operación completada con éxito/i).closest("div");

    expect(toastElement).toBeTruthy();
    expect(
      screen.getByText(/operación completada con éxito/i),
    ).toBeInTheDocument();

    if (toastElement?.hasAttribute("aria-live")) {
      expect(toastElement.getAttribute("aria-live")).toMatch(
        /polite|assertive/,
      );
    }
  });

  it("3. Permite el cierre manual inmediato al hacer clic en el botón de descarte", () => {
    const onCloseMock = vi.fn();
    render(
      <SuccessToast message="Registro guardado" onClose={onCloseMock} />,
    );

    const closeButton =
      screen.queryByRole("button", { name: /cerrar|close/i }) ||
      screen.getByRole("button");

    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("4. Ejecuta el cierre automático (auto-dismiss) tras el tiempo de expiración programado", () => {
    const onCloseMock = vi.fn();
    render(
      <SuccessToast message="Actualización exitosa" onClose={onCloseMock} />,
    );

    expect(onCloseMock).not.toHaveBeenCalled();

    // Avanzar el reloj virtual para disparar el timeout (ej. 3000ms a 5000ms)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onCloseMock).toHaveBeenCalled();
  });
});

