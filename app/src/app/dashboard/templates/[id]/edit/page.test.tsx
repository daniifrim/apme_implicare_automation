// ABOUTME: Integration tests for template editing flow
// ABOUTME: Tests loading, editing, preview, and publishing workflow
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import TemplateEditorPage from "@/app/dashboard/templates/[id]/edit/page";
import * as nextNavigation from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("Template Editing Flow - Integration", () => {
  const mockTemplate = {
    id: "tpl-123",
    slug: "welcome-email",
    name: "Welcome Email",
    description: "Welcome email template",
    status: "active",
    tags: ["welcome", "onboarding"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  };

  const mockVersions = [
    {
      id: "ver-1",
      versionNumber: 1,
      name: "Initial",
      subject: "Welcome!",
      preheader: "Thanks for joining",
      editorState: [{ type: "paragraph", content: "Hello {{FirstName}}!" }],
      htmlContent: "<p>Hello {{FirstName}}!</p>",
      textContent: "Hello {{FirstName}}!",
      placeholders: ["FirstName"],
      isPublished: true,
      publishedAt: "2024-01-01T00:00:00Z",
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "ver-2",
      versionNumber: 2,
      name: "Updated Draft",
      subject: "Welcome to APME!",
      preheader: "Get started today",
      editorState: [
        { type: "paragraph", content: "Welcome {{FirstName}} {{LastName}}!" },
      ],
      htmlContent: "<p>Welcome {{FirstName}} {{LastName}}!</p>",
      textContent: "Welcome {{FirstName}} {{LastName}}!",
      placeholders: ["FirstName", "LastName"],
      isPublished: false,
      publishedAt: null,
      createdAt: "2024-01-15T00:00:00Z",
    },
  ];

  const mockSubmissions = [
    {
      id: "sub-1",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
    },
    {
      id: "sub-2",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock useParams
    vi.mocked(nextNavigation.useParams).mockReturnValue({ id: "tpl-123" });
    const mockRouter = {
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    };
    vi.mocked(nextNavigation.useRouter).mockReturnValue(
      mockRouter as unknown as ReturnType<typeof nextNavigation.useRouter>,
    );

    // Setup fetch mock responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/templates/tpl-123/versions")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ versions: mockVersions }),
        });
      }
      if (url.includes("/api/templates/tpl-123") && !url.includes("versions")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ template: mockTemplate }),
        });
      }
      if (url.includes("/api/submissions")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ submissions: mockSubmissions }),
        });
      }
      if (url.includes("/preview")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              preview: {
                html: "<p>Welcome John Doe!</p>",
                text: "Welcome John Doe!",
                subject: "Welcome to APME!",
                warnings: [],
                submission: mockSubmissions[0],
              },
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Page Loading", () => {
    it("shows loading state initially", () => {
      render(<TemplateEditorPage />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("loads template data and renders header", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByText("Welcome Email")).toBeInTheDocument();
      });

      expect(screen.getByText("welcome-email")).toBeInTheDocument();
      expect(screen.getByText(/2 versions/i)).toBeInTheDocument();
    });

    it("loads draft version by default", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Updated Draft")).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue("Welcome to APME!")).toBeInTheDocument();
    });

    it("shows Draft badge for unpublished version", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByText("Draft")).toBeInTheDocument();
      });
    });
  });

  describe("Editing Workflow", () => {
    it("detects unsaved changes when form is modified", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Updated Draft")).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/version name/i);
      fireEvent.change(nameInput, { target: { value: "Modified Version" } });

      await waitFor(() => {
        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
      });
    });

    it("enables save button when changes are made", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Updated Draft")).toBeInTheDocument();
      });

      // Save button should be disabled initially
      const saveButton = screen.getByRole("button", { name: /save draft/i });
      expect(saveButton).toBeDisabled();

      // Make a change
      const nameInput = screen.getByLabelText(/version name/i);
      fireEvent.change(nameInput, { target: { value: "Modified" } });

      // Save button should be enabled
      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });
    });

    it("calls save API when save button is clicked", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Updated Draft")).toBeInTheDocument();
      });

      // Make a change
      const nameInput = screen.getByLabelText(/version name/i);
      fireEvent.change(nameInput, { target: { value: "Modified" } });

      // Click save
      const saveButton = screen.getByRole("button", { name: /save draft/i });
      await waitFor(() => expect(saveButton).not.toBeDisabled());
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/templates/tpl-123/versions/ver-2"),
          expect.objectContaining({
            method: "PATCH",
          }),
        );
      });
    });
  });

  describe("Preview Workflow", () => {
    it("loads submissions for preview", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/preview as/i)).toBeInTheDocument();
      });

      const select = screen.getByRole("combobox");
      fireEvent.click(select);

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      });
    });

    it("generates preview when submission is selected", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/preview as/i)).toBeInTheDocument();
      });

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "sub-1" } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/preview"),
          expect.any(Object),
        );
      });
    });

    it("switches between preview tabs", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /email/i })).toBeInTheDocument();
      });

      const htmlTab = screen.getByRole("tab", { name: /html/i });
      fireEvent.click(htmlTab);

      expect(htmlTab).toHaveAttribute("data-state", "active");
    });

    it("switches between device previews", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("radio", { name: /desktop/i }),
        ).toBeInTheDocument();
      });

      const mobileToggle = screen.getByRole("radio", { name: /mobile/i });
      fireEvent.click(mobileToggle);

      expect(mobileToggle).toHaveAttribute("data-state", "on");
    });
  });

  describe("Placeholder Insertion", () => {
    it("shows available placeholders in sidebar", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByText(/placeholders/i)).toBeInTheDocument();
      });

      expect(screen.getByText("{{FirstName}}")).toBeInTheDocument();
      expect(screen.getByText("{{LastName}}")).toBeInTheDocument();
    });

    it("shows detected placeholders count", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByText(/placeholders/i)).toBeInTheDocument();
      });

      expect(screen.getByText("2 used")).toBeInTheDocument();
    });

    it("allows searching placeholders", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: "first" } });

      expect(screen.getByText("{{FirstName}}")).toBeInTheDocument();
    });
  });

  describe("Version Management", () => {
    it("displays version history in sidebar", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByText(/versions/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/initial/i)).toBeInTheDocument();
      expect(screen.getByText(/updated draft/i)).toBeInTheDocument();
    });

    it("shows published version indicator", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByText("LIVE")).toBeInTheDocument();
      });
    });

    it("allows creating new version", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /new/i }),
        ).toBeInTheDocument();
      });

      const newButton = screen.getByRole("button", { name: /new/i });
      fireEvent.click(newButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/templates/tpl-123/versions"),
          expect.objectContaining({
            method: "POST",
          }),
        );
      });
    });

    it("allows switching between versions", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByText(/initial/i)).toBeInTheDocument();
      });

      const initialVersion = screen.getByText(/initial/i);
      fireEvent.click(initialVersion);

      // Should load initial version data
      await waitFor(() => {
        expect(screen.getByDisplayValue("Initial")).toBeInTheDocument();
      });
    });

    it("allows duplicating a version", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /copy/i }),
        ).toBeInTheDocument();
      });

      const copyButton = screen.getByRole("button", { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/duplicate"),
          expect.objectContaining({
            method: "POST",
          }),
        );
      });
    });
  });

  describe("Publishing Workflow", () => {
    it("shows publish button for unpublished versions", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /publish/i }),
        ).toBeInTheDocument();
      });
    });

    it("opens publish confirmation dialog", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /publish/i }),
        ).toBeInTheDocument();
      });

      const publishButton = screen.getByRole("button", { name: /publish/i });
      fireEvent.click(publishButton);

      await waitFor(() => {
        expect(screen.getByText(/publish version/i)).toBeInTheDocument();
      });
    });

    it("shows version details in publish dialog", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /publish/i }),
        ).toBeInTheDocument();
      });

      const publishButton = screen.getByRole("button", { name: /publish/i });
      fireEvent.click(publishButton);

      await waitFor(() => {
        expect(screen.getByText(/updated draft/i)).toBeInTheDocument();
        expect(screen.getByText(/welcome to apme!/i)).toBeInTheDocument();
      });
    });

    it("calls publish API when confirmed", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /publish/i }),
        ).toBeInTheDocument();
      });

      // Open dialog
      const publishButton = screen.getByRole("button", { name: /publish/i });
      fireEvent.click(publishButton);

      // Confirm publish
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /confirm publish/i }),
        ).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", {
        name: /confirm publish/i,
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/templates/tpl-123/publish"),
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("ver-2"),
          }),
        );
      });
    });

    it("shows warning when replacing published version", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /publish/i }),
        ).toBeInTheDocument();
      });

      const publishButton = screen.getByRole("button", { name: /publish/i });
      fireEvent.click(publishButton);

      await waitFor(() => {
        expect(
          screen.getByText(/replacing current published version/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Template Stats", () => {
    it("displays placeholder count in stats", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByText(/template stats/i)).toBeInTheDocument();
      });

      expect(screen.getByText("2")).toBeInTheDocument(); // 2 placeholders
      expect(screen.getByText("3")).toBeInTheDocument(); // 3 versions (including the one created by default)
    });

    it("displays published version info", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByText(/template stats/i)).toBeInTheDocument();
      });

      expect(screen.getByText("v1")).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("has back button to templates list", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByRole("link")).toBeInTheDocument();
      });

      const backLink = screen.getByRole("link");
      expect(backLink).toHaveAttribute("href", "/templates");
    });

    it("has close editor option in dropdown", async () => {
      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /more actions/i }),
        ).toBeInTheDocument();
      });

      const moreButton = screen.getByRole("button", { name: /more actions/i });
      fireEvent.click(moreButton);

      await waitFor(() => {
        expect(screen.getByText(/close editor/i)).toBeInTheDocument();
      });
    });
  });

  describe("Error States", () => {
    it("handles template not found", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (
          url.includes("/api/templates/tpl-123") &&
          !url.includes("versions")
        ) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ template: null }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<TemplateEditorPage />);

      await waitFor(() => {
        expect(screen.getByText(/template not found/i)).toBeInTheDocument();
      });
    });
  });
});
