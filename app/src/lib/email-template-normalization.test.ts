// ABOUTME: Verifies normalization of email HTML and placeholder extraction utilities
// ABOUTME: Ensures deterministic sanitization and plain-text generation for template fidelity

import { describe, expect, it } from "vitest";

import {
  collectTemplatePlaceholders,
  extractPlaceholders,
  htmlToEmailText,
  normalizeEmailHtml,
} from "@/lib/email-template-normalization";

describe("email template normalization", () => {
  it("should strip unsupported tags and attributes while preserving core content", () => {
    const input =
      '<div class="x"><p style="color:red">Hello <span>{{FirstName}}</span></p><script>alert(1)</script></div>';

    const result = normalizeEmailHtml(input);

    expect(result.html).toContain("<p>Hello {{FirstName}}</p>");
    expect(result.html).not.toContain("<script");
    expect(result.html).not.toContain("class=");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("should keep valid links and remove unsafe protocols", () => {
    const input =
      '<p><a href="https://apme.ro" style="font-weight:700">safe</a> <a href="javascript:alert(1)">bad</a></p>';

    const result = normalizeEmailHtml(input);

    expect(result.html).toContain('<a href="https://apme.ro">safe</a>');
    expect(result.html).toContain("<a>bad</a>");
    expect(
      result.warnings.some((warning) =>
        warning.includes("unsupported link URL"),
      ),
    ).toBe(true);
  });

  it("should generate stable text output from normalized HTML", () => {
    const text = htmlToEmailText(
      "<p>Buna {{FirstName}}</p><ul><li>Item 1</li><li>Item 2</li></ul>",
    );

    expect(text).toBe("Buna {{FirstName}}\n\n- Item 1\n- Item 2");
  });

  it("should detect placeholders from all template fields", () => {
    const placeholders = collectTemplatePlaceholders([
      "Salut {{FirstName}}",
      "<p>{{Missionary}}</p>",
      "text {{EthnicGroup}} {{FirstName}}",
    ]);

    expect(placeholders).toEqual(["FirstName", "Missionary", "EthnicGroup"]);
    expect(
      extractPlaceholders("{{FirstName}} {{LastName}} {{FirstName}}"),
    ).toEqual(["FirstName", "LastName"]);
  });
});
