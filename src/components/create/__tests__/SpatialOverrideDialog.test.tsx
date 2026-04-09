import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SpatialOverrideDialog } from "../SpatialOverrideDialog";
import type { BBox } from "@/types/generated/subsystem";

const baseInitial = {
  componentKey: "battery_pack_48v",
  displayName: "Battery Pack 48V",
  currentBbox: {
    x_mm: 300,
    y_mm: 80,
    z_mm: 120,
    anchor: "downtube_top",
  } as BBox,
  currentMassG: 3500,
  currentNote: "from LLM estimate",
};

function renderDialog(overrides: {
  onSubmit?: ReturnType<typeof vi.fn>;
  initial?: typeof baseInitial;
  open?: boolean;
} = {}) {
  const onSubmit = overrides.onSubmit ?? vi.fn().mockResolvedValue(undefined);
  const onOpenChange = vi.fn();
  const utils = render(
    <SpatialOverrideDialog
      open={overrides.open ?? true}
      onOpenChange={onOpenChange}
      initial={overrides.initial ?? baseInitial}
      onSubmit={onSubmit}
    />,
  );
  return { ...utils, onSubmit, onOpenChange };
}

describe("SpatialOverrideDialog", () => {
  it("is not rendered when closed", () => {
    renderDialog({ open: false });
    expect(screen.queryByText(/我來給數字/)).not.toBeInTheDocument();
  });

  it("prefills inputs from initial.currentBbox and currentMassG", () => {
    renderDialog();
    expect(screen.getByText("Battery Pack 48V", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText(/寬 x_mm/)).toHaveValue(300);
    expect(screen.getByLabelText(/深 y_mm/)).toHaveValue(80);
    expect(screen.getByLabelText(/高 z_mm/)).toHaveValue(120);
    expect(screen.getByLabelText(/mass_g/)).toHaveValue(3500);
  });

  it("disables submit when any bbox dim is 0", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText(/寬 x_mm/), { target: { value: "0" } });
    const submit = screen.getByRole("button", { name: /寫入 override/ });
    expect(submit).toBeDisabled();
  });

  it("disables submit when mass_g is negative", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText(/mass_g/), { target: { value: "-1" } });
    expect(
      screen.getByRole("button", { name: /寫入 override/ }),
    ).toBeDisabled();
  });

  it("allows mass_g === 0", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText(/mass_g/), { target: { value: "0" } });
    expect(
      screen.getByRole("button", { name: /寫入 override/ }),
    ).toBeEnabled();
  });

  it("submits with correctly shaped payload preserving anchor", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { onOpenChange } = renderDialog({ onSubmit });

    fireEvent.change(screen.getByLabelText(/寬 x_mm/), { target: { value: "310" } });
    fireEvent.change(screen.getByLabelText(/深 y_mm/), { target: { value: "85" } });
    fireEvent.change(screen.getByLabelText(/高 z_mm/), { target: { value: "125" } });
    fireEvent.change(screen.getByLabelText(/mass_g/), { target: { value: "3600" } });
    fireEvent.change(screen.getByLabelText(/category/), {
      target: { value: "battery" },
    });
    fireEvent.change(screen.getByLabelText(/note/), {
      target: { value: "bench measurement" },
    });

    fireEvent.click(screen.getByRole("button", { name: /寫入 override/ }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      component_key: "battery_pack_48v",
      bbox: {
        x_mm: 310,
        y_mm: 85,
        z_mm: 125,
        anchor: "downtube_top",
      },
      mass_g: 3600,
      category: "battery",
      note: "bench measurement",
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("omits optional category/note when blank", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderDialog({
      onSubmit,
      initial: {
        componentKey: "k",
        displayName: "K",
        currentBbox: { x_mm: 10, y_mm: 20, z_mm: 30 },
        currentMassG: 100,
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /寫入 override/ }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const arg = onSubmit.mock.calls[0][0];
    expect(arg.category).toBeUndefined();
    expect(arg.note).toBeUndefined();
    expect(arg.bbox).toEqual({
      x_mm: 10,
      y_mm: 20,
      z_mm: 30,
      anchor: undefined,
    });
  });

  it("shows loading state while onSubmit is pending", async () => {
    let resolve: () => void = () => {};
    const onSubmit = vi.fn(
      () => new Promise<void>((r) => { resolve = r; }),
    );
    renderDialog({ onSubmit });
    fireEvent.click(screen.getByRole("button", { name: /寫入 override/ }));
    await waitFor(() => {
      expect(screen.getByText(/寫入中…/)).toBeInTheDocument();
    });
    resolve();
    await waitFor(() => {
      expect(screen.queryByText(/寫入中…/)).not.toBeInTheDocument();
    });
  });

  it("shows error alert when onSubmit rejects", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("override failed"));
    renderDialog({ onSubmit });
    fireEvent.click(screen.getByRole("button", { name: /寫入 override/ }));
    await waitFor(() => {
      expect(screen.getByText(/override failed/)).toBeInTheDocument();
    });
  });
});
