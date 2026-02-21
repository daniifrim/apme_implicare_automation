// ABOUTME: Unit tests for EditorPanel component
// ABOUTME: Tests form fields, BlockNote integration, and validation warnings
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditorPanel } from "./editor-panel";
import type { PartialBlock } from "@blocknote/core";

// Mock the EmailEditor component
vi.mock("@/components/email-editor", () => ({
  EmailEditor: ({
    onChange,
    initialContent,
  }: {
    onChange?: (
      blocks: PartialBlock[],
      html: string,
      text: string,
      placeholders: string[],
      warnings: string[],
    ) => void;
    initialContent?: PartialBlock[];
  }) => (
    <div data-testid="mock-email-editor">
      <button
        data-testid="trigger-change"
        onClick={() =>
          onChange?.(
            [{ type: "paragraph", content: "Test content" }],
            "<p>Test content</p>",
            "Test content",
            ["FirstName"],
            [],
          )
        }
      >
        Trigger Change
      </button>
      <span data-testid="initial-content">
        {JSON.stringify(initialContent)}
      </span>
    </div>
  ),
  insertPlaceholder: vi.fn(),
}));

describe("EditorPanel", () => {
  const defaultProps = {
    formData: {
      name: "Test Version",
      subject: "Test Subject",
      preheader: "Test Preheader",
    },
    editorContent: {
      blocks: [] as PartialBlock[],
      html: "<p>Test</p>",
      text: "Test",
      placeholders: [] as string[],
      warnings: [] as string[],
    },
    editorWarnings: [] as {
      code: string;
      message: string;
      severity: "warning" | "error";
    }[],
    onFormChange: vi.fn(),
    onEditorChange: vi.fn(),
    onEditorReady: vi.fn(),
    onValidationChange: vi.fn(),
  };

  describe("Form Fields", () => {
    it("renders version name input with correct value", () => {
      render(<EditorPanel {...defaultProps} />);

      const nameInput = screen.getByLabelText(/version name/i);
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveValue("Test Version");
    });

    it("renders email subject input with correct value", () => {
      render(<EditorPanel {...defaultProps} />);

      const subjectInput = screen.getByLabelText(/email subject/i);
      expect(subjectInput).toBeInTheDocument();
      expect(subjectInput).toHaveValue("Test Subject");
    });

    it("renders preheader text input with correct value", () => {
      render(<EditorPanel {...defaultProps} />);

      const preheaderInput = screen.getByLabelText(/preheader text/i);
      expect(preheaderInput).toBeInTheDocument();
      expect(preheaderInput).toHaveValue("Test Preheader");
    });

    it("calls onFormChange when version name is updated", () => {
      const onFormChange = vi.fn();
      render(<EditorPanel {...defaultProps} onFormChange={onFormChange} />);

      const nameInput = screen.getByLabelText(/version name/i);
      fireEvent.change(nameInput, { target: { value: "New Version Name" } });

      expect(onFormChange).toHaveBeenCalledWith({
        name: "New Version Name",
        subject: "Test Subject",
        preheader: "Test Preheader",
      });
    });

    it("calls onFormChange when email subject is updated", () => {
      const onFormChange = vi.fn();
      render(<EditorPanel {...defaultProps} onFormChange={onFormChange} />);

      const subjectInput = screen.getByLabelText(/email subject/i);
      fireEvent.change(subjectInput, { target: { value: "New Subject" } });

      expect(onFormChange).toHaveBeenCalledWith({
        name: "Test Version",
        subject: "New Subject",
        preheader: "Test Preheader",
      });
    });

    it("calls onFormChange when preheader is updated", () => {
      const onFormChange = vi.fn();
      render(<EditorPanel {...defaultProps} onFormChange={onFormChange} />);

      const preheaderInput = screen.getByLabelText(/preheader text/i);
      fireEvent.change(preheaderInput, { target: { value: "New Preheader" } });

      expect(onFormChange).toHaveBeenCalledWith({
        name: "Test Version",
        subject: "Test Subject",
        preheader: "New Preheader",
      });
    });

    it("displays placeholder text for all inputs", () => {
      render(<EditorPanel {...defaultProps} />);

      expect(
        screen.getByPlaceholderText(/e\.g\., welcome email v2/i),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/e\.g\., welcome to apme!/i),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(
          /preview text that appears in email clients/i,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Email Editor Integration", () => {
    it("renders EmailEditor component", () => {
      render(<EditorPanel {...defaultProps} />);

      expect(screen.getByTestId("mock-email-editor")).toBeInTheDocument();
    });

    it("passes initial content to EmailEditor", () => {
      const propsWithContent = {
        ...defaultProps,
        editorContent: {
          ...defaultProps.editorContent,
          blocks: [{ type: "paragraph", content: "Initial" }] as PartialBlock[],
        },
      };
      render(<EditorPanel {...propsWithContent} />);

      const contentDisplay = screen.getByTestId("initial-content");
      expect(contentDisplay.textContent).toContain("Initial");
    });

    it("calls onEditorChange when editor content changes", () => {
      const onEditorChange = vi.fn();
      render(<EditorPanel {...defaultProps} onEditorChange={onEditorChange} />);

      const triggerButton = screen.getByTestId("trigger-change");
      fireEvent.click(triggerButton);

      expect(onEditorChange).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.any(String),
        expect.any(Array),
        expect.any(Array),
      );
    });
  });

  describe("Validation Warnings", () => {
    it("does not show warnings section when no warnings exist", () => {
      render(<EditorPanel {...defaultProps} />);

      expect(
        screen.queryByText(/compatibility warnings/i),
      ).not.toBeInTheDocument();
    });

    it("displays warnings when they exist", () => {
      const propsWithWarnings = {
        ...defaultProps,
        editorWarnings: [
          {
            code: "WARN_1",
            message: "Warning message 1",
            severity: "warning" as const,
          },
          {
            code: "WARN_2",
            message: "Warning message 2",
            severity: "warning" as const,
          },
        ],
      };
      render(<EditorPanel {...propsWithWarnings} />);

      expect(screen.getByText(/compatibility warnings/i)).toBeInTheDocument();
      expect(screen.getByText("Warning message 1")).toBeInTheDocument();
      expect(screen.getByText("Warning message 2")).toBeInTheDocument();
    });

    it("renders warning list items correctly", () => {
      const propsWithWarnings = {
        ...defaultProps,
        editorWarnings: [
          {
            code: "NORMALIZATION_1",
            message: "Unsupported tag removed",
            severity: "warning" as const,
          },
        ],
      };
      render(<EditorPanel {...propsWithWarnings} />);

      const warningList = screen.getByRole("list");
      expect(warningList).toBeInTheDocument();
      expect(screen.getByText("Unsupported tag removed")).toBeInTheDocument();
    });
  });

  describe("Detected Placeholders", () => {
    it("does not show placeholders section when none detected", () => {
      render(<EditorPanel {...defaultProps} />);

      expect(
        screen.queryByText(/detected placeholders/i),
      ).not.toBeInTheDocument();
    });

    it("displays detected placeholders as badges", () => {
      const propsWithPlaceholders = {
        ...defaultProps,
        editorContent: {
          ...defaultProps.editorContent,
          placeholders: ["FirstName", "LastName", "Email"],
        },
      };
      render(<EditorPanel {...propsWithPlaceholders} />);

      expect(screen.getByText(/detected placeholders/i)).toBeInTheDocument();
      expect(screen.getByText("{{FirstName}}")).toBeInTheDocument();
      expect(screen.getByText("{{LastName}}")).toBeInTheDocument();
      expect(screen.getByText("{{Email}}")).toBeInTheDocument();
    });

    it("renders placeholder badges with correct styling", () => {
      const propsWithPlaceholders = {
        ...defaultProps,
        editorContent: {
          ...defaultProps.editorContent,
          placeholders: ["FirstName"],
        },
      };
      const { container } = render(<EditorPanel {...propsWithPlaceholders} />);

      // Check for monospace font class on badge
      const badge = container.querySelector(".font-mono");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("Layout and Structure", () => {
    it("renders form fields in a grid layout on larger screens", () => {
      const { container } = render(<EditorPanel {...defaultProps} />);

      const grid = container.querySelector(".grid");
      expect(grid).toBeInTheDocument();
    });

    it("has proper spacing between sections", () => {
      const { container } = render(<EditorPanel {...defaultProps} />);

      const spaceY6 = container.querySelector(".space-y-6");
      expect(spaceY6).toBeInTheDocument();
    });
  });
});
