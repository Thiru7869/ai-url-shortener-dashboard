import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "./Pagination";

describe("Pagination", () => {
  it("shows the correct range summary", () => {
    render(
      <Pagination pagination={{ page: 2, limit: 10, total: 25, totalPages: 3 }} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText(/11/)).toBeInTheDocument();
    expect(screen.getByText(/20/)).toBeInTheDocument();
    expect(screen.getByText(/25/)).toBeInTheDocument();
  });

  it("disables Previous on the first page", () => {
    render(<Pagination pagination={{ page: 1, limit: 10, total: 25, totalPages: 3 }} onPageChange={vi.fn()} />);
    expect(screen.getByText("Previous")).toBeDisabled();
    expect(screen.getByText("Next")).not.toBeDisabled();
  });

  it("disables Next on the last page", () => {
    render(<Pagination pagination={{ page: 3, limit: 10, total: 25, totalPages: 3 }} onPageChange={vi.fn()} />);
    expect(screen.getByText("Next")).toBeDisabled();
  });

  it("calls onPageChange with the next page number", () => {
    const onPageChange = vi.fn();
    render(<Pagination pagination={{ page: 1, limit: 10, total: 25, totalPages: 3 }} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByText("Next"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
