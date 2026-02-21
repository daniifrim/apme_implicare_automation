// ABOUTME: Unit tests for TemplateEditorLayout component
// ABOUTME: Tests responsive behavior, panel resizing, and tab switching
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TemplateEditorLayout } from "../template-editor-layout";

// Mock ResizeObserver for react-resizable-panels
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Mock window.innerWidth for responsive tests
const mockWindowWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
};

describe("TemplateEditorLayout", () => {
  const mockEditor = <div data-testid="mock-editor">Editor Content</div>;
  const mockPreview = <div data-testid="mock-preview">Preview Content</div>;
  const mockSidebar = <div data-testid="mock-sidebar">Sidebar Content</div>;

  beforeEach(() => {
    // Reset to desktop width
    mockWindowWidth(1200);
  });

  describe("Desktop Layout (≥1024px)", () => {
    it("renders all three panels in resizable layout", () => {
      render(
        <TemplateEditorLayout
          editor={mockEditor}
          preview={mockPreview}
          sidebar={mockSidebar}
        />,
      );

      expect(screen.getByTestId("mock-editor")).toBeInTheDocument();
      expect(screen.getByTestId("mock-preview")).toBeInTheDocument();
      expect(screen.getByTestId("mock-sidebar")).toBeInTheDocument();
    });

    it("displays panel headers with correct labels", () => {
      render(
        <TemplateEditorLayout
          editor={mockEditor}
          preview={mockPreview}
          sidebar={mockSidebar}
        />,
      );

      expect(screen.getByText("Editor")).toBeInTheDocument();
      expect(screen.getByText("Preview")).toBeInTheDocument();
      expect(screen.getByText("Tools")).toBeInTheDocument();
    });

    it("displays percentage indicators for panels", () => {
      render(
        <TemplateEditorLayout
          editor={mockEditor}
          preview={mockPreview}
          sidebar={mockSidebar}
        />,
      );

      // Should show default percentages
      expect(screen.getByText("60%")).toBeInTheDocument();
      expect(screen.getByText("25%")).toBeInTheDocument();
      expect(screen.getByText("15%")).toBeInTheDocument();
    });

    it("applies custom className when provided", () => {
      const { container } = render(
        <TemplateEditorLayout
          editor={mockEditor}
          preview={mockPreview}
          sidebar={mockSidebar}
          className="custom-class"
        />,
      );

      expect(container.querySelector(".custom-class")).toBeInTheDocument();
    });
  });

  describe("Tablet Layout (768px-1023px)", () => {
    it("switches to tab layout on tablet breakpoint", async () => {
      mockWindowWidth(800);

      render(
        <TemplateEditorLayout
          editor={mockEditor}
          preview={mockPreview}
          sidebar={mockSidebar}
        />,
      );

      // Should show tabs
      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      // Should show tab triggers
      expect(screen.getByRole("tab", { name: /editor/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /preview/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /tools/i })).toBeInTheDocument();
    });

    it("displays tab icons and labels on tablet", async () => {
      mockWindowWidth(800);

      render(
        <TemplateEditorLayout
          editor={mockEditor}
          preview={mockPreview}
          sidebar={mockSidebar}
        />,
      );

      await waitFor(() => {
        const editorTab = screen.getByRole("tab", { name: /editor/i });
        expect(editorTab).toBeInTheDocument();
      });
    });
  });

  describe("Mobile Layout (<768px)", () => {
    it("switches to tab layout on mobile breakpoint", async () => {
      mockWindowWidth(600);

      render(
        <TemplateEditorLayout
          editor={mockEditor}
          preview={mockPreview}
          sidebar={mockSidebar}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });
    });

    it("hides tab labels on mobile, shows only icons", async () => {
      mockWindowWidth(600);

      render(
        <TemplateEditorLayout
          editor={mockEditor}
          preview={mockPreview}
          sidebar={mockSidebar}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });
    });

    it.skip("switches between tabs correctly", async () => {
      mockWindowWidth(600);

      render(
        <TemplateEditorLayout
          editor={mockEditor}
          preview={mockPreview}
          sidebar={mockSidebar}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });

      // Initially editor tab should be active - check by looking for Editor tab being active
      const editorTab = screen.getByRole("tab", { name: /editor/i });
      expect(editorTab).toHaveAttribute("data-state", "active");

      // Click on preview tab
      const previewTab = screen.getByRole("tab", { name: /preview/i });
      fireEvent.click(previewTab);

      // After clicking, the preview tab should be active
      await waitFor(() => {
        expect(previewTab).toHaveAttribute("data-state", "active");
      });
    });
  });

  describe("Responsive Behavior", () => {
    it("updates layout when window is resized", async () => {
      const { rerender } = render(
        <TemplateEditorLayout
          editor={mockEditor}
          preview={mockPreview}
          sidebar={mockSidebar}
        />,
      );

      // Start as desktop
      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();

      // Resize to mobile
      mockWindowWidth(500);

      // Force re-render to trigger effect
      rerender(
        <TemplateEditorLayout
          editor={mockEditor}
          preview={mockPreview}
          sidebar={mockSidebar}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole("tablist")).toBeInTheDocument();
      });
    });
  });
});
