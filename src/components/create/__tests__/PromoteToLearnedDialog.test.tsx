import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PromoteToLearnedDialog } from "../PromoteToLearnedDialog";
import type { BBox } from "@/types/generated/subsystem";

const baseInitial = {
  key: "motor_500w",
  displayName: "Motor 500W",
  currentBbox: {
    x_mm: 120,
    y_mm: 120,
    z_mm: 90,
    anchor: "BB_center",
  } as BBox,
  currentMassG: 2800,
  originProjectId: "proj_123",
};

function renderDialog(opts: {
  onSubmit?: ReturnType<typeof vi.fn>;
  open?: boolean;
} = {}) {
  const onSubmit = opts.onSubmit ?? vi.fn().mockResolvedValue(undefined);
  const onOpenChange = vi.fn();
  const utils = render(
    <PromoteToLearnedDialog
      open={opts.open ?? true}
      onOpenChange={onOpenChange}
      initial={baseInitial}
      onSubmit={onSubmit}
    />,
  );
  return { ...utils, onSubmit, onOpenChange };
}

describe("PromoteToLearnedDialog", () => {
  it("is not in DOM when closed", () => {
    renderDialog({ open: false });
    expect(screen.queryByText(/推升至 learned/)).not.toBeInTheDocument();
  });

  it("prefills W/H/D and mass from initial", () => {
    renderDialog();
    expect(screen.getByLabelText(/寬 x_mm/)).toHaveValue(120);
    expect(screen.getByLabelText(/深 y_mm/)).toHaveValue(120);
    expect(screen.getByLabelText(/高 z_mm/)).toHaveValue(90);
    expect(screen.getByLabelText(/mass_g/)).toHaveValue(2800);
  });

  it("disables submit for invalid bbox", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText(/高 z_mm/), { target: { value: "0" } });
    expect(
      screen.getByRole("button", { name: /推升至 learned/ }),
    ).toBeDisabled();
  });

  it("submits with full payload shape including optional fields", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { onOpenChange } = renderDialog({ onSubmit });

    fireEvent.change(screen.getByLabelText(/category/), {
      target: { value: "motor" },
    });
    fireEvent.change(screen.getByLabelText(/origin（選填）/), {
      target: { value: "vendor datasheet" },
    });
    fireEvent.change(screen.getByLabelText(/source_url/), {
      target: { value: "https://example.com/spec.pdf" },
    });
    fireEvent.change(screen.getByLabelText(/source_text/), {
      target: { value: "Peak 500W @ 48V" },
    });

    fireEvent.click(screen.getByRole("button", { name: /推升至 learned/ }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      key: "motor_500w",
      bbox: {
        x_mm: 120,
        y_mm: 120,
        z_mm: 90,
        anchor: "BB_center",
      },
      mass_g: 2800,
      category: "motor",
      origin: "vendor datasheet",
      origin_project_id: "proj_123",
      source_url: "https://example.com/spec.pdf",
      source_text: "Peak 500W @ 48V",
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("omits blank optional fields but still forwards origin_project_id", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderDialog({ onSubmit });

    fireEvent.click(screen.getByRole("button", { name: /推升至 learned/ }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const arg = onSubmit.mock.calls[0][0];
    expect(arg.category).toBeUndefined();
    expect(arg.origin).toBeUndefined();
    expect(arg.source_url).toBeUndefined();
    expect(arg.source_text).toBeUndefined();
    expect(arg.origin_project_id).toBe("proj_123");
  });

  it("shows loading indicator while pending", async () => {
    let resolve: () => void = () => {};
    const onSubmit = vi.fn(
      () => new Promise<void>((r) => { resolve = r; }),
    );
    renderDialog({ onSubmit });
    fireEvent.click(screen.getByRole("button", { name: /推升至 learned/ }));
    await waitFor(() => {
      expect(screen.getByText(/推升中…/)).toBeInTheDocument();
    });
    resolve();
    await waitFor(() => {
      expect(screen.queryByText(/推升中…/)).not.toBeInTheDocument();
    });
  });

  it("shows error alert when onSubmit rejects", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("promote failed"));
    renderDialog({ onSubmit });
    fireEvent.click(screen.getByRole("button", { name: /推升至 learned/ }));
    await waitFor(() => {
      expect(screen.getByText(/promote failed/)).toBeInTheDocument();
    });
  });
});
