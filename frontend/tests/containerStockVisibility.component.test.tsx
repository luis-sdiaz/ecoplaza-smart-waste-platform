import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listContainers: vi.fn(),
  listAvailableWasteRecords: vi.fn(),
  createContainer: vi.fn(),
  saveContainerCsv: vi.fn(),
  saveContainerExcel: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en" },
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

import ContainerManagementPanel from "../src/components/ContainerManagementPanel";

const containerA = { id: "container-a", code: "CTR-A", createdAt: "2026-10-01T12:00:00.000Z" };
const containerB = { id: "container-b", code: "CTR-B", createdAt: "2026-10-02T12:00:00.000Z" };
const availableRecord = {
  id: "waste-a",
  recordNumber: "1",
  containerId: "container-a",
  category: "organic" as const,
  weightKg: 12.75,
  registeredAt: "2026-10-03T12:00:00.000Z",
  status: "available" as const,
};
const success = <T,>(data: T) => ({ ok: true as const, data });
const stockFailure = { ok: false as const, error: { code: "network_error" as const, retryable: true } };

afterEach(cleanup);

beforeEach(() => {
  mocks.listContainers.mockReset();
  mocks.listAvailableWasteRecords.mockReset();
  mocks.createContainer.mockReset();
  mocks.saveContainerCsv.mockReset();
  mocks.saveContainerExcel.mockReset();
});

describe("container stock visibility", () => {
  test("shows available record count and weight for each registered container", async () => {
    mocks.listContainers.mockResolvedValue(success([containerA, containerB]));
    mocks.listAvailableWasteRecords.mockResolvedValue(success([availableRecord]));

    render(<ContainerManagementPanel />);

    expect(await screen.findByText("12.75 common.kg")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("0 common.kg")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
  });

  test("keeps the container directory usable when stock loading fails", async () => {
    mocks.listContainers.mockResolvedValue(success([containerA]));
    mocks.listAvailableWasteRecords.mockResolvedValue(stockFailure);

    render(<ContainerManagementPanel />);

    expect(await screen.findByText("CTR-A")).toBeTruthy();
    expect(screen.getByText("containers.stockLoadError")).toBeTruthy();
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect((screen.getByLabelText("containers.stockFilterLabel") as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "containers.register" }) as HTMLButtonElement).disabled).toBe(false);
  });

  test("combines stock and search filters and exports only visible containers", async () => {
    mocks.listContainers.mockResolvedValue(success([containerA, containerB]));
    mocks.listAvailableWasteRecords.mockResolvedValue(success([availableRecord]));
    mocks.saveContainerCsv.mockResolvedValue("saved");
    mocks.saveContainerExcel.mockResolvedValue("saved");

    render(<ContainerManagementPanel />);

    const stockFilter = await screen.findByLabelText("containers.stockFilterLabel");
    fireEvent.change(stockFilter, { target: { value: "withoutStock" } });
    expect(screen.queryByText("CTR-A")).toBeNull();
    expect(screen.getByText("CTR-B")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("containers.searchLabel"), { target: { value: "CTR-B" } });
    fireEvent.click(screen.getByRole("button", { name: "containers.exportCsv" }));
    await vi.waitFor(() => expect(mocks.saveContainerCsv).toHaveBeenCalledTimes(1));
    expect(mocks.saveContainerCsv.mock.calls[0][0]).toEqual([containerB]);

    const excelButton = screen.getByRole("button", { name: "containers.exportExcel" }) as HTMLButtonElement;
    await vi.waitFor(() => expect(excelButton.disabled).toBe(false));
    fireEvent.click(excelButton);
    await vi.waitFor(() => expect(mocks.saveContainerExcel).toHaveBeenCalledTimes(1));
    expect(mocks.saveContainerExcel.mock.calls[0][0]).toEqual([containerB]);
  });

  test("discards the previous account stock when the keyed panel is remounted", async () => {
    mocks.listContainers
      .mockResolvedValueOnce(success([containerA]))
      .mockResolvedValueOnce(success([containerB]));
    mocks.listAvailableWasteRecords
      .mockResolvedValueOnce(success([availableRecord]))
      .mockResolvedValueOnce(success([]));

    const view = render(<ContainerManagementPanel key="account-a" />);
    expect(await screen.findByText("12.75 common.kg")).toBeTruthy();

    await act(async () => {
      view.rerender(<ContainerManagementPanel key="account-b" />);
    });

    expect(await screen.findByText("CTR-B")).toBeTruthy();
    expect(screen.queryByText("CTR-A")).toBeNull();
    expect(screen.getByText("0 common.kg")).toBeTruthy();
  });
});
