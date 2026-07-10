import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/test-utils";
import LinkFormModal from "./LinkFormModal";

describe("LinkFormModal", () => {
  it("renders nothing when closed", () => {
    renderWithProviders(<LinkFormModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the create-mode title and custom alias field when no link is passed", () => {
    renderWithProviders(<LinkFormModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText("Create Short Link")).toBeInTheDocument();
    expect(screen.getByLabelText(/Custom Alias/)).toBeInTheDocument();
  });

  it("shows the edit-mode title and hides the alias field when a link is passed", () => {
    renderWithProviders(
      <LinkFormModal
        isOpen={true}
        onClose={() => {}}
        link={{
          id: "1",
          title: "Existing",
          originalUrl: "https://example.com",
          shortCode: "abc1234",
          shortUrl: "http://localhost:4000/abc1234",
          isCustomAlias: false,
          status: "ACTIVE",
          rawStatus: "ACTIVE",
          expiresAt: null,
          clickCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
      />,
    );
    expect(screen.getByText("Edit Link")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Custom Alias/)).not.toBeInTheDocument();
  });

  it("shows a validation error for a missing title", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LinkFormModal isOpen={true} onClose={() => {}} />);

    await user.type(screen.getByLabelText("Original URL"), "https://example.com");
    await user.click(screen.getByText("Create Link"));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
  });

  it("shows a validation error for an invalid URL", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LinkFormModal isOpen={true} onClose={() => {}} />);

    await user.type(screen.getByLabelText("Title"), "My Link");
    await user.type(screen.getByLabelText("Original URL"), "not-a-url");
    await user.click(screen.getByText("Create Link"));

    await waitFor(() => {
      expect(screen.getByText("Must be a valid http:// or https:// URL")).toBeInTheDocument();
    });
  });

  it("shows a validation error for a custom alias with invalid characters", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LinkFormModal isOpen={true} onClose={() => {}} />);

    await user.type(screen.getByLabelText("Title"), "My Link");
    await user.type(screen.getByLabelText("Original URL"), "https://example.com");
    await user.type(screen.getByLabelText(/Custom Alias/), "not valid!");
    await user.click(screen.getByText("Create Link"));

    await waitFor(() => {
      expect(
        screen.getByText("Only letters, numbers, hyphens, and underscores allowed"),
      ).toBeInTheDocument();
    });
  });
});
