import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  SpatialOverlayDialog,
  type OverlayResult,
} from "../SpatialOverlayDialog";

function makeResult(overrides: Partial<OverlayResult> = {}): OverlayResult {
  return {
    nodes: [],
    required: { total_bbox_mm: [0, 0, 0], total_mass_g: 0 },
    overlay_violations: [],
    svg: "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
    ...overrides,
  };
}

function renderDialog(
  onSubmit = vi.fn(),
  open = true,
) {
  const onOpenChange = vi.fn();
  const utils = render(
    <SpatialOverlayDialog
      open={open}
      onOpenChange={onOpenChange}
      subsystems={{ modules: [] }}
      onSubmit={onSubmit}
    />,
  );
  return { ...utils, onSubmit, onOpenChange };
}

describe("SpatialOverlayDialog", () => {
  it("is not in DOM when closed", () => {
    renderDialog(vi.fn(), false);
    expect(
      screen.queryByText(/空間 Overlay 試算/),
    ).not.toBeInTheDocument();
  });

  it("renders form content when open", () => {
    renderDialog();
    expect(screen.getByText(/空間 Overlay 試算/)).toBeInTheDocument();
    expect(screen.getByText(/候選區域 \(Zones\)/)).toBeInTheDocument();
    // One default zone row exists
    expect(screen.getByLabelText(/名稱/)).toBeInTheDocument();
  });

  it("adds and removes zone rows", () => {
    renderDialog();
    // Initially 1 zone, no "移除" button (hidden when length === 1)
    expect(screen.queryAllByRole("button", { name: /移除/ })).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /新增區域/ }));
    const removeButtons = screen.getAllByRole("button", { name: /移除/ });
    expect(removeButtons).toHaveLength(2);

    fireEvent.click(removeButtons[0]);
    expect(screen.queryAllByRole("button", { name: /移除/ })).toHaveLength(0);
  });

  it("shows error and does not call onSubmit when zone name is empty", async () => {
    const { onSubmit } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "試算" }));
    await waitFor(() => {
      expect(screen.getByText(/每個區域都需要名稱/)).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a valid payload with properly shaped zone", async () => {
    const onSubmit = vi.fn().mockResolvedValue(makeResult());
    renderDialog(onSubmit);

    fireEvent.change(screen.getByLabelText(/名稱/), {
      target: { value: "down-tube" },
    });
    fireEvent.change(screen.getByLabelText(/W \(mm\)/), {
      target: { value: "400" },
    });
    fireEvent.change(screen.getByLabelText(/H \(mm\)/), {
      target: { value: "60" },
    });
    fireEvent.change(screen.getByLabelText(/D \(mm\)/), {
      target: { value: "80" },
    });
    fireEvent.change(screen.getByLabelText(/origin X/), {
      target: { value: "10" },
    });

    fireEvent.click(screen.getByRole("button", { name: "試算" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      subsystems: { modules: [] },
      zones: [
        {
          name: "down-tube",
          bbox_mm: [400, 60, 80],
          origin_mm: [10, 0, 0],
        },
      ],
      module_mass_budgets: [],
    });
  });

  it("shows loading spinner while onSubmit is pending", async () => {
    let resolve: (v: OverlayResult) => void = () => {};
    const onSubmit = vi.fn(
      () => new Promise<OverlayResult>((r) => { resolve = r; }),
    );
    renderDialog(onSubmit);

    fireEvent.change(screen.getByLabelText(/名稱/), {
      target: { value: "z" },
    });
    fireEvent.change(screen.getByLabelText(/W \(mm\)/), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/H \(mm\)/), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/D \(mm\)/), { target: { value: "3" } });

    fireEvent.click(screen.getByRole("button", { name: "試算" }));
    await waitFor(() => {
      expect(screen.getByText(/試算中…/)).toBeInTheDocument();
    });

    resolve(makeResult());
    await waitFor(() => {
      expect(screen.queryByText(/試算中…/)).not.toBeInTheDocument();
    });
  });

  it("renders error state when onSubmit rejects", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("backend boom"));
    renderDialog(onSubmit);
    fireEvent.change(screen.getByLabelText(/名稱/), { target: { value: "z" } });
    fireEvent.change(screen.getByLabelText(/W \(mm\)/), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/H \(mm\)/), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/D \(mm\)/), { target: { value: "3" } });

    fireEvent.click(screen.getByRole("button", { name: "試算" }));

    await waitFor(() => {
      expect(screen.getByText(/backend boom/)).toBeInTheDocument();
    });
  });

  it("clear-overlay button resets result section", async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValue(makeResult({ overlay_violations: ["violation A"] }));
    renderDialog(onSubmit);

    fireEvent.change(screen.getByLabelText(/名稱/), { target: { value: "z" } });
    fireEvent.change(screen.getByLabelText(/W \(mm\)/), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/H \(mm\)/), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/D \(mm\)/), { target: { value: "3" } });

    fireEvent.click(screen.getByRole("button", { name: "試算" }));
    await waitFor(() => {
      expect(screen.getByText(/violation A/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /清除 Overlay/ }));
    expect(screen.queryByText(/violation A/)).not.toBeInTheDocument();
  });
});
