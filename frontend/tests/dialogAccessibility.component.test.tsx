import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../src/services/buyerService", () => ({
  isValidBuyerEmail: vi.fn(() => true),
  isValidBuyerName: vi.fn(() => true),
  isValidBuyerPhone: vi.fn(() => true),
}));

import BuyerFormModal from "../src/components/BuyerFormModal";

afterEach(cleanup);

function DialogHarness({ isSubmitting = false }: { isSubmitting?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open buyer dialog</button>
      {isOpen && (
        <BuyerFormModal
          buyer={null}
          isSubmitting={isSubmitting}
          onClose={() => setIsOpen(false)}
          onSubmit={vi.fn()}
        />
      )}
    </>
  );
}

describe("dialog focus and keyboard accessibility", () => {
  test("moves initial focus into the real dialog and restores it after Escape", () => {
    render(<DialogHarness />);
    const opener = screen.getByRole("button", { name: "Open buyer dialog" });
    opener.focus();

    fireEvent.click(opener);

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("buyers.nameField"));

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  test("wraps Tab and Shift+Tab at the dialog boundaries", () => {
    render(<DialogHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Open buyer dialog" }));

    const first = screen.getByLabelText("buyers.nameField");
    const last = screen.getByRole("button", { name: "buyers.save" });

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  test("contains focus when a Tab event starts outside the modal", () => {
    render(<DialogHarness />);
    const opener = screen.getByRole("button", { name: "Open buyer dialog" });
    fireEvent.click(opener);
    const first = screen.getByLabelText("buyers.nameField");
    const last = screen.getByRole("button", { name: "buyers.save" });

    opener.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    opener.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  test("blocks keyboard and button closing during a critical operation", () => {
    render(<DialogHarness isSubmitting />);
    fireEvent.click(screen.getByRole("button", { name: "Open buyer dialog" }));

    const cancel = screen.getByRole("button", { name: "buyers.cancel" });
    expect(cancel.hasAttribute("disabled")).toBe(true);

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(cancel);

    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
