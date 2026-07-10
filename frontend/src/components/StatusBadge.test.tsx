import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusBadge from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders Active for ACTIVE status", () => {
    render(<StatusBadge status="ACTIVE" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders Disabled for DISABLED status", () => {
    render(<StatusBadge status="DISABLED" />);
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("renders Expired for EXPIRED status", () => {
    render(<StatusBadge status="EXPIRED" />);
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });
});
