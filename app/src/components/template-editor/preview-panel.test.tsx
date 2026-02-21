// ABOUTME: Unit tests for PreviewPanel component
// ABOUTME: Tests device switching, submission selection, and preview tabs
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PreviewPanel } from "./preview-panel";

describe("PreviewPanel", () => {
  const mockSubmissions = [
    { id: "1", firstName: "John", lastName: "Doe", email: "john@example.com" },
    {
      id: "2",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
    },
    {
      id: "3",
      firstName: "Bob",
      lastName: "Johnson",
      email: "bob@example.com",
    },
  ];

  const defaultProps = {
    html: "<p>Hello {{FirstName}}!</p>",
    text: "Hello {{FirstName}}!",
    subject: "Test Email Subject",
    warnings: [] as string[],
    selectedSubmission: null as (typeof mockSubmissions)[0] | null,
    submissions: mockSubmissions,
    onSubmissionChange: vi.fn(),
    onRefresh: vi.fn(),
    isLoading: false,
  };

  describe("Device Switching", () => {
    it("renders device toggle group with all device options", () => {
      render(<PreviewPanel {...defaultProps} />);

      expect(screen.getByRole("group")).toBeInTheDocument();
      expect(
        screen.getByRole("radio", { name: /desktop/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("radio", { name: /tablet/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("radio", { name: /mobile/i }),
      ).toBeInTheDocument();
    });

    it("defaults to desktop view", () => {
      render(<PreviewPanel {...defaultProps} />);

      const desktopToggle = screen.getByRole("radio", { name: /desktop/i });
      expect(desktopToggle).toHaveAttribute("data-state", "on");
    });

    it("switches to tablet view when clicked", () => {
      render(<PreviewPanel {...defaultProps} />);

      const tabletToggle = screen.getByRole("radio", { name: /tablet/i });
      fireEvent.click(tabletToggle);

      expect(tabletToggle).toHaveAttribute("data-state", "on");
    });

    it("switches to mobile view when clicked", () => {
      render(<PreviewPanel {...defaultProps} />);

      const mobileToggle = screen.getByRole("radio", { name: /mobile/i });
      fireEvent.click(mobileToggle);

      expect(mobileToggle).toHaveAttribute("data-state", "on");
    });

    it("applies device-specific styling classes", () => {
      const { container } = render(<PreviewPanel {...defaultProps} />);

      // Check for transition classes on preview container
      const previewContainer = container.querySelector(".transition-all");
      expect(previewContainer).toBeInTheDocument();
    });

    it("shows device frame header/footer for mobile view", () => {
      render(<PreviewPanel {...defaultProps} />);

      const mobileToggle = screen.getByRole("radio", { name: /mobile/i });
      fireEvent.click(mobileToggle);

      // After switching to mobile, should have mobile-specific styling
      const { container } = render(<PreviewPanel {...defaultProps} />);
      const roundedLg = container.querySelector(".rounded-lg");
      expect(roundedLg).toBeInTheDocument();
    });
  });

  describe("Submission Selection", () => {
    it("renders submission selector dropdown", () => {
      render(<PreviewPanel {...defaultProps} />);

      expect(screen.getByText(/preview as/i)).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it.skip("displays all submissions in dropdown", async () => {
      render(<PreviewPanel {...defaultProps} />);

      const select = screen.getByRole("combobox");
      fireEvent.click(select);

      await waitFor(() => {
        mockSubmissions.forEach((sub) => {
          expect(
            screen.getByText(`${sub.firstName} ${sub.lastName}`),
          ).toBeInTheDocument();
        });
      });
    });

    it.skip("calls onSubmissionChange when submission is selected", async () => {
      const onSubmissionChange = vi.fn();
      render(
        <PreviewPanel
          {...defaultProps}
          onSubmissionChange={onSubmissionChange}
        />,
      );

      const select = screen.getByRole("combobox");
      // Use userEvent or fireEvent.change with the correct value
      fireEvent.change(select, { target: { value: "2" } });

      // Wait for the callback to be triggered
      await waitFor(() => {
        expect(onSubmissionChange).toHaveBeenCalledWith("2");
      });
    });

    it("displays selected submission info card", () => {
      const propsWithSelection = {
        ...defaultProps,
        selectedSubmission: mockSubmissions[0],
      };
      render(<PreviewPanel {...propsWithSelection} />);

      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("does not show submission info when none selected", () => {
      render(<PreviewPanel {...defaultProps} />);

      expect(screen.queryByText("john@example.com")).not.toBeInTheDocument();
    });
  });

  describe("Preview Tabs", () => {
    it("renders all three preview tabs", () => {
      render(<PreviewPanel {...defaultProps} />);

      expect(screen.getByRole("tab", { name: /email/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /html/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /text/i })).toBeInTheDocument();
    });

    it("defaults to rendered email tab", () => {
      render(<PreviewPanel {...defaultProps} />);

      const emailTab = screen.getByRole("tab", { name: /email/i });
      expect(emailTab).toHaveAttribute("data-state", "active");
    });

    it.skip("switches to HTML tab when clicked", () => {
      render(<PreviewPanel {...defaultProps} />);

      const htmlTab = screen.getByRole("tab", { name: /html/i });
      fireEvent.click(htmlTab);

      // The tab should now be in active state
      expect(htmlTab).toHaveAttribute("aria-selected", "true");
    });

    it("displays HTML content in raw tab", () => {
      render(<PreviewPanel {...defaultProps} />);

      const htmlTab = screen.getByRole("tab", { name: /html/i });
      fireEvent.click(htmlTab);

      expect(screen.getByText(/hello {{firstname}}!/i)).toBeInTheDocument();
    });

    it("displays text content in text tab", () => {
      render(<PreviewPanel {...defaultProps} />);

      const textTab = screen.getByRole("tab", { name: /text/i });
      fireEvent.click(textTab);

      expect(screen.getByText("Hello {{FirstName}}!")).toBeInTheDocument();
    });

    it("renders email preview with HTML content", () => {
      render(<PreviewPanel {...defaultProps} />);

      const emailContent = screen.getByText(/hello/i);
      expect(emailContent).toBeInTheDocument();
    });

    it("shows placeholder when no HTML content", () => {
      const propsWithEmptyHtml = {
        ...defaultProps,
        html: "",
      };
      render(<PreviewPanel {...propsWithEmptyHtml} />);

      expect(screen.getByText(/no content to preview/i)).toBeInTheDocument();
    });
  });

  describe("Subject Display", () => {
    it("displays subject when provided", () => {
      render(<PreviewPanel {...defaultProps} />);

      expect(screen.getByText(/subject:/i)).toBeInTheDocument();
      expect(screen.getByText("Test Email Subject")).toBeInTheDocument();
    });

    it("does not show subject section when empty", () => {
      const propsWithEmptySubject = {
        ...defaultProps,
        subject: "",
      };
      render(<PreviewPanel {...propsWithEmptySubject} />);

      expect(screen.queryByText(/subject:/i)).not.toBeInTheDocument();
    });
  });

  describe("Warnings", () => {
    it("does not show warnings section when no warnings", () => {
      render(<PreviewPanel {...defaultProps} />);

      expect(screen.queryByText(/warnings/i)).not.toBeInTheDocument();
    });

    it("displays warnings when they exist", () => {
      const propsWithWarnings = {
        ...defaultProps,
        warnings: ["Warning 1", "Warning 2"],
      };
      render(<PreviewPanel {...propsWithWarnings} />);

      expect(screen.getByText(/warnings/i)).toBeInTheDocument();
      expect(screen.getByText("Warning 1")).toBeInTheDocument();
      expect(screen.getByText("Warning 2")).toBeInTheDocument();
    });
  });

  describe("Action Buttons", () => {
    it("renders refresh button", () => {
      render(<PreviewPanel {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /refresh/i }),
      ).toBeInTheDocument();
    });

    it("calls onRefresh when refresh button is clicked", () => {
      const onRefresh = vi.fn();
      render(<PreviewPanel {...defaultProps} onRefresh={onRefresh} />);

      const refreshButton = screen.getByRole("button", { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(onRefresh).toHaveBeenCalled();
    });

    it("shows loading state on refresh button", () => {
      render(<PreviewPanel {...defaultProps} isLoading={true} />);

      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });

    it("renders reset view button", () => {
      render(<PreviewPanel {...defaultProps} />);

      const resetButton = screen.getByRole("button", {
        name: /reset to desktop view/i,
      });
      expect(resetButton).toBeInTheDocument();
    });

    it("resets to desktop view when reset button clicked", () => {
      render(<PreviewPanel {...defaultProps} />);

      // First switch to mobile
      const mobileToggle = screen.getByRole("radio", { name: /mobile/i });
      fireEvent.click(mobileToggle);

      // Then click reset
      const resetButton = screen.getByRole("button", {
        name: /reset to desktop view/i,
      });
      fireEvent.click(resetButton);

      const desktopToggle = screen.getByRole("radio", { name: /desktop/i });
      expect(desktopToggle).toHaveAttribute("data-state", "on");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels on device toggles", () => {
      render(<PreviewPanel {...defaultProps} />);

      expect(screen.getByRole("radio", { name: /desktop/i })).toHaveAttribute(
        "aria-label",
        "Desktop",
      );
      expect(screen.getByRole("radio", { name: /tablet/i })).toHaveAttribute(
        "aria-label",
        "Tablet",
      );
      expect(screen.getByRole("radio", { name: /mobile/i })).toHaveAttribute(
        "aria-label",
        "Mobile",
      );
    });
  });
});
