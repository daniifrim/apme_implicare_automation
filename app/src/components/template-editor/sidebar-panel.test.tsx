// ABOUTME: Unit tests for SidebarPanel component
// ABOUTME: Tests placeholder search, version history, and template actions
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SidebarPanel } from "./sidebar-panel";
import type { TemplateVersion } from "./types";
import type { PartialBlock } from "@blocknote/core";

describe("SidebarPanel", () => {
  const mockVersions: TemplateVersion[] = [
    {
      id: "v1",
      versionNumber: 1,
      name: "Initial Version",
      subject: "Welcome!",
      preheader: "Thanks for joining",
      editorState: [] as PartialBlock[],
      htmlContent: "<p>Welcome</p>",
      textContent: "Welcome",
      placeholders: ["FirstName"],
      isPublished: true,
      publishedAt: "2024-01-01T00:00:00Z",
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "v2",
      versionNumber: 2,
      name: "Updated Version",
      subject: "Welcome to APME!",
      preheader: "Get started today",
      editorState: [] as PartialBlock[],
      htmlContent: "<p>Welcome to APME</p>",
      textContent: "Welcome to APME",
      placeholders: ["FirstName", "LastName"],
      isPublished: false,
      publishedAt: null,
      createdAt: "2024-01-15T00:00:00Z",
    },
    {
      id: "v3",
      versionNumber: 3,
      name: "Draft Version",
      subject: "Draft Subject",
      preheader: null,
      editorState: [] as PartialBlock[],
      htmlContent: "<p>Draft</p>",
      textContent: "Draft",
      placeholders: [],
      isPublished: false,
      publishedAt: null,
      createdAt: "2024-02-01T00:00:00Z",
    },
  ];

  const defaultProps = {
    placeholders: ["FirstName", "LastName"],
    versions: mockVersions,
    selectedVersionId: "v2",
    editorInstance: {}, // Mock editor instance
    templateName: "Test Template",
    templateSlug: "test-template",
    onInsertPlaceholder: vi.fn(),
    onSelectVersion: vi.fn(),
    onCreateVersion: vi.fn(),
    onDuplicateVersion: vi.fn(),
    onDeleteVersion: vi.fn(),
  };

  describe("Template Info Section", () => {
    it("renders template name and slug when provided", () => {
      render(<SidebarPanel {...defaultProps} />);

      expect(screen.getByText("Test Template")).toBeInTheDocument();
      expect(screen.getByText("test-template")).toBeInTheDocument();
    });

    it("does not render template info section when no name or slug", () => {
      const propsWithoutInfo = {
        ...defaultProps,
        templateName: undefined,
        templateSlug: undefined,
      };
      render(<SidebarPanel {...propsWithoutInfo} />);

      expect(screen.queryByText("Test Template")).not.toBeInTheDocument();
    });

    it("renders only name when slug is not provided", () => {
      const propsWithNameOnly = {
        ...defaultProps,
        templateSlug: undefined,
      };
      render(<SidebarPanel {...propsWithNameOnly} />);

      expect(screen.getByText("Test Template")).toBeInTheDocument();
      expect(screen.queryByText("test-template")).not.toBeInTheDocument();
    });
  });

  describe("Placeholders Section", () => {
    it("renders placeholders section with count badge", () => {
      render(<SidebarPanel {...defaultProps} />);

      expect(screen.getAllByText(/placeholders/i).length).toBeGreaterThan(0);
      expect(screen.getByText("2 used")).toBeInTheDocument();
    });

    it("renders search input for placeholders", () => {
      render(<SidebarPanel {...defaultProps} />);

      expect(
        screen.getByPlaceholderText(/filter placeholders/i),
      ).toBeInTheDocument();
    });

    it("filters placeholders based on search term", () => {
      render(<SidebarPanel {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/filter/i);
      fireEvent.change(searchInput, { target: { value: "first" } });

      // Should show FirstName but not other placeholders
      expect(screen.getByText("{{FirstName}}")).toBeInTheDocument();
    });

    it("shows no results message when search has no matches", () => {
      render(<SidebarPanel {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/filter/i);
      fireEvent.change(searchInput, { target: { value: "xyz123" } });

      expect(screen.getByText(/no placeholders found/i)).toBeInTheDocument();
    });

    it("calls onInsertPlaceholder when placeholder is clicked", () => {
      const onInsertPlaceholder = vi.fn();
      render(
        <SidebarPanel
          {...defaultProps}
          onInsertPlaceholder={onInsertPlaceholder}
        />,
      );

      const placeholderButton = screen.getByText("{{FirstName}}");
      fireEvent.click(placeholderButton);

      expect(onInsertPlaceholder).toHaveBeenCalledWith("FirstName");
    });

    it("disables placeholder buttons when no editor instance", () => {
      const propsWithoutEditor = {
        ...defaultProps,
        editorInstance: null,
      };
      render(<SidebarPanel {...propsWithoutEditor} />);

      const placeholderButton = screen.getByRole("button", {
        name: /\{\{FirstName\}\}/i,
      });
      expect(placeholderButton).toBeDisabled();
    });

    it("marks used placeholders with badge", () => {
      render(<SidebarPanel {...defaultProps} />);

      // FirstName and LastName are in the placeholders array, so should be marked as used
      const usedBadges = screen.getAllByText("used");
      expect(usedBadges.length).toBeGreaterThan(0);
    });

    it("renders placeholder categories", () => {
      render(<SidebarPanel {...defaultProps} />);

      expect(screen.getByText("Contact")).toBeInTheDocument();
      expect(screen.getByText("Mission")).toBeInTheDocument();
      // Use getAllByText for 'Submission' as it appears in multiple places
      expect(screen.getAllByText(/submission/i).length).toBeGreaterThan(0);
      expect(screen.getByText("Custom")).toBeInTheDocument();
    });

    it("collapses and expands placeholders section", () => {
      render(<SidebarPanel {...defaultProps} />);

      // Click to collapse
      const toggleButton = screen.getByRole("button", {
        name: /placeholders/i,
      });
      fireEvent.click(toggleButton);

      // Search input should be hidden when collapsed
      expect(screen.queryByPlaceholderText(/filter/i)).not.toBeInTheDocument();

      // Click to expand again
      fireEvent.click(toggleButton);
      expect(screen.getByPlaceholderText(/filter/i)).toBeInTheDocument();
    });
  });

  describe("Version History Section", () => {
    it("renders version history section", () => {
      render(<SidebarPanel {...defaultProps} />);

      // Use getAllByText since "Versions" appears in both the section header and stats
      expect(screen.getAllByText(/versions/i).length).toBeGreaterThan(0);
    });

    it("renders new version button", () => {
      render(<SidebarPanel {...defaultProps} />);

      expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument();
    });

    it("calls onCreateVersion when new version button clicked", () => {
      const onCreateVersion = vi.fn();
      render(
        <SidebarPanel {...defaultProps} onCreateVersion={onCreateVersion} />,
      );

      // Look for the "New" button specifically in the versions section header
      const newButton = screen.getByRole("button", { name: /new/i });
      fireEvent.click(newButton);

      expect(onCreateVersion).toHaveBeenCalled();
    });

    it("displays all versions with correct info", () => {
      render(<SidebarPanel {...defaultProps} />);

      expect(screen.getByText(/initial version/i)).toBeInTheDocument();
      expect(screen.getByText(/updated version/i)).toBeInTheDocument();
      expect(screen.getByText(/draft version/i)).toBeInTheDocument();
    });

    it("shows published indicator for published versions", () => {
      render(<SidebarPanel {...defaultProps} />);

      expect(screen.getByText("LIVE")).toBeInTheDocument();
    });

    it("shows editing indicator for selected version", () => {
      render(<SidebarPanel {...defaultProps} />);

      // v2 is selected and not published, should show EDITING badge
      expect(screen.getByText("EDITING")).toBeInTheDocument();
    });

    it("calls onSelectVersion when version is clicked", () => {
      const onSelectVersion = vi.fn();
      render(
        <SidebarPanel {...defaultProps} onSelectVersion={onSelectVersion} />,
      );

      const versionButton = screen.getByText(/initial version/i);
      fireEvent.click(versionButton);

      expect(onSelectVersion).toHaveBeenCalled();
    });

    it("highlights selected version", () => {
      const { container } = render(<SidebarPanel {...defaultProps} />);

      // Selected version should have border-primary class
      const selectedVersion = container.querySelector(".border-primary");
      expect(selectedVersion).toBeInTheDocument();
    });

    it("shows version actions for selected non-published version", () => {
      render(<SidebarPanel {...defaultProps} />);

      // v2 is selected and not published, should show Copy and Delete buttons
      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /delete/i }),
      ).toBeInTheDocument();
    });

    it("calls onDuplicateVersion when copy button clicked", () => {
      const onDuplicateVersion = vi.fn();
      render(
        <SidebarPanel
          {...defaultProps}
          onDuplicateVersion={onDuplicateVersion}
        />,
      );

      const copyButton = screen.getByRole("button", { name: /copy/i });
      fireEvent.click(copyButton);

      expect(onDuplicateVersion).toHaveBeenCalledWith("v2");
    });

    it("calls onDeleteVersion when delete button clicked", () => {
      const onDeleteVersion = vi.fn();
      render(
        <SidebarPanel {...defaultProps} onDeleteVersion={onDeleteVersion} />,
      );

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      fireEvent.click(deleteButton);

      expect(onDeleteVersion).toHaveBeenCalledWith("v2");
    });

    it("does not show delete button for published versions", () => {
      // Select the published version (v1)
      const propsWithPublishedSelected = {
        ...defaultProps,
        selectedVersionId: "v1",
      };
      render(<SidebarPanel {...propsWithPublishedSelected} />);

      // Should not show Copy/Delete for published versions
      expect(
        screen.queryByRole("button", { name: /copy/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /delete/i }),
      ).not.toBeInTheDocument();
    });

    it("shows formatted dates for versions", () => {
      render(<SidebarPanel {...defaultProps} />);

      // Should show formatted dates (month + day format) - use getAllByText since there are multiple dates
      // Jan 1, Jan 15, Feb 1 from mock versions
      const dates = screen.getAllByText(/Jan|Feb/i);
      expect(dates.length).toBeGreaterThan(0);
    });
  });

  describe("Quick Stats Section", () => {
    it("renders quick stats section", () => {
      render(<SidebarPanel {...defaultProps} />);

      expect(screen.getByText(/quick stats/i)).toBeInTheDocument();
    });

    it("displays placeholder count", () => {
      render(<SidebarPanel {...defaultProps} />);

      expect(screen.getByText("2")).toBeInTheDocument();
      // Check for "Placeholders" text in the stats section specifically
      const placeholdersTexts = screen.getAllByText(/placeholders/i);
      expect(placeholdersTexts.length).toBeGreaterThan(0);
    });

    it("displays version count", () => {
      render(<SidebarPanel {...defaultProps} />);

      // Check for the version count (appears in badge and stats)
      expect(screen.getAllByText("3").length).toBeGreaterThan(0);
      expect(screen.getAllByText(/versions/i).length).toBeGreaterThan(0);
    });

    it("displays published version number", () => {
      render(<SidebarPanel {...defaultProps} />);

      expect(screen.getByText("v1")).toBeInTheDocument();
      expect(screen.getAllByText(/published/i).length).toBeGreaterThan(0);
    });

    it("displays subject character count", () => {
      render(<SidebarPanel {...defaultProps} />);

      // v2 subject is "Welcome to APME!" which is 16 characters
      expect(screen.getByText("16")).toBeInTheDocument();
      expect(screen.getByText(/subject chars/i)).toBeInTheDocument();
    });

    it("shows dash when no published version", () => {
      const propsWithoutPublished = {
        ...defaultProps,
        versions: mockVersions.map((v) => ({
          ...v,
          isPublished: false,
          publishedAt: null,
        })),
      };
      render(<SidebarPanel {...propsWithoutPublished} />);

      const publishedStat = screen.getAllByText("-")[0];
      expect(publishedStat).toBeInTheDocument();
    });
  });

  describe("Empty States", () => {
    it("shows message when no versions exist", () => {
      const propsWithNoVersions = {
        ...defaultProps,
        versions: [],
      };
      render(<SidebarPanel {...propsWithNoVersions} />);

      expect(screen.getByText(/no versions yet/i)).toBeInTheDocument();
    });

    it("shows message when no placeholders are used", () => {
      const propsWithNoPlaceholders = {
        ...defaultProps,
        placeholders: [],
      };
      render(<SidebarPanel {...propsWithNoPlaceholders} />);

      expect(screen.getByText("0 used")).toBeInTheDocument();
    });
  });
});
