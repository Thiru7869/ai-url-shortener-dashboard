import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DistributionBarList from "./DistributionBarList";

describe("DistributionBarList", () => {
  it("renders a placeholder when there is no data", () => {
    render(<DistributionBarList data={[]} />);
    expect(screen.getByText("No data yet")).toBeInTheDocument();
  });

  it("renders each label and count", () => {
    render(
      <DistributionBarList
        data={[
          { label: "Chrome", count: 10 },
          { label: "Firefox", count: 5 },
        ]}
      />,
    );
    expect(screen.getByText("Chrome")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Firefox")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
