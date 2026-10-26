import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PageHeader from "../src/components/PageHeader";

afterEach(() => {
  cleanup();
});

describe("PageHeader Component - Encabezado Estructurado y Accesibilidad UI/UX", () => {
  it("1. Renderiza el contenedor semántico <header>, título en encabezado <h1> y data-testid por defecto", () => {
    render(
      <PageHeader
        eyebrow="Operaciones"
        title="Panel Principal"
        description="Resumen global de gestión"
      />,
    );

    const header = screen.getByTestId("page-header");
    expect(header).toBeTruthy();
    expect(header.tagName.toLowerCase()).toBe("header");

    const heading = screen.getByRole("heading", { level: 1, name: "Panel Principal" });
    expect(heading).toBeTruthy();

    expect(screen.getByText("Operaciones")).toBeTruthy();
    expect(screen.getByText("Resumen global de gestión")).toBeTruthy();
  });

  it("2. Renderiza fielmente la descripción y el subtítulo/eyebrow contextuales", () => {
    render(
      <PageHeader
        eyebrow="Trazabilidad"
        title="Directorio de Compradores"
        description="Gestión y registro de compradores mayoristas autorizados"
      />,
    );

    expect(screen.getByText("Trazabilidad")).toBeTruthy();
    expect(screen.getByText("Directorio de Compradores")).toBeTruthy();
    expect(screen.getByText("Gestión y registro de compradores mayoristas autorizados")).toBeTruthy();
  });

  it("3. Renderiza elementos interactivos y botones pasados a través del slot de acciones o children", () => {
    const { rerender } = render(
      <PageHeader
        title="Contenedores IoT"
        actions={
          <button type="button" aria-label="Nuevo contenedor">
            Registrar
          </button>
        }
      />,
    );

    expect(screen.getByRole("button", { name: "Nuevo contenedor" })).toBeTruthy();

    // Mediante slot de children
    rerender(
      <PageHeader title="Contenedores IoT">
        <a href="#export" role="button">
          Exportar Excel
        </a>
      </PageHeader>,
    );

    expect(screen.getByRole("button", { name: "Exportar Excel" })).toBeTruthy();
  });

  it("4. Permite personalizar el data-testid y agregar clases utilitarias personalizadas", () => {
    render(
      <PageHeader
        title="Informes Financieros"
        testId="custom-financial-header"
        className="custom-financial-class"
      />,
    );

    const customHeader = screen.getByTestId("custom-financial-header");
    expect(customHeader).toBeTruthy();
    expect(customHeader.className).toContain("custom-financial-class");
  });

  it("5. Se comporta de forma resiliente ante props mínimas (únicamente título requerido)", () => {
    render(<PageHeader title="Vista Mínima" />);

    expect(screen.getByRole("heading", { level: 1, name: "Vista Mínima" })).toBeTruthy();

    // No debe haber párrafos vacíos de eyebrow o descripción
    const header = screen.getByTestId("page-header");
    expect(header.querySelectorAll("p")).toHaveLength(0);
  });

  it("6. Soporta cadenas internacionalizadas y caracteres especiales con acentos y tildes", () => {
    render(
      <PageHeader
        eyebrow="Comercialización & Reciclaje"
        title="Gestión de Residuos Sólidos — Bogotá D.C. 2026"
        description="Valorización económica en Pesos Colombianos ($ COP) y métricas de CO₂ evitadas"
      />,
    );

    expect(screen.getByText("Comercialización & Reciclaje")).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Gestión de Residuos Sólidos — Bogotá D.C. 2026",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Valorización económica en Pesos Colombianos ($ COP) y métricas de CO₂ evitadas",
      ),
    ).toBeTruthy();
  });
});

