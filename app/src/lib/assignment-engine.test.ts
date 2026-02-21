import { describe, it, expect } from "vitest";
import { AssignmentEngine } from "@/lib/assignment-engine";
import type { NormalizedSubmission } from "@/lib/assignment-engine";

describe("AssignmentEngine", () => {
  const engine = new AssignmentEngine();

  function createSubmission(
    answers: Record<string, unknown> = {},
  ): NormalizedSubmission {
    return {
      id: "test-id",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      locationType: "romania",
      city: "Bucharest",
      country: "Romania",
      church: "Test Church",
      answers,
    };
  }

  it("should assign prayer for ethnic group template", () => {
    const submission = createSubmission({
      prayer_method: "I want to adopt an ethnic group for prayer",
      ethnic_group_choice: "Roma",
    });

    const results = engine.assignTemplates(submission);

    expect(results.some((r) => r.templateSlug === "rugaciune-grup-etnic")).toBe(
      true,
    );
  });

  it("should assign prayer for missionaries template", () => {
    const submission = createSubmission({
      prayer_method: "missionary",
    });

    const results = engine.assignTemplates(submission);

    expect(results.some((r) => r.templateSlug === "rugaciune-misionari")).toBe(
      true,
    );
  });

  it("should assign short-term missions template", () => {
    const submission = createSubmission({
      mission_interests: ["short_term", "volunteer"],
    });

    const results = engine.assignTemplates(submission);

    expect(
      results.some((r) => r.templateSlug === "info-misiune-termen-scurt"),
    ).toBe(true);
  });

  it("should assign volunteer template", () => {
    const submission = createSubmission({
      mission_interests: "volunteer",
    });

    const results = engine.assignTemplates(submission);

    expect(results.some((r) => r.templateSlug === "info-voluntariat")).toBe(
      true,
    );
  });

  it("should assign Kairos course template", () => {
    const submission = createSubmission({
      course_interests: ["kairos", "mobilizeaza"],
    });

    const results = engine.assignTemplates(submission);

    expect(results.some((r) => r.templateSlug === "info-curs-kairos")).toBe(
      true,
    );
  });

  it("should assign multiple templates based on multiple interests", () => {
    const submission = createSubmission({
      mission_interests: ["short_term", "volunteer", "camps"],
      course_interests: ["kairos"],
      support_interests: ["donate"],
    });

    const results = engine.assignTemplates(submission);

    expect(results.length).toBeGreaterThan(1);
    expect(
      results.some((r) => r.templateSlug === "info-misiune-termen-scurt"),
    ).toBe(true);
    expect(results.some((r) => r.templateSlug === "info-voluntariat")).toBe(
      true,
    );
    expect(results.some((r) => r.templateSlug === "info-tabere-misiune")).toBe(
      true,
    );
    expect(results.some((r) => r.templateSlug === "info-curs-kairos")).toBe(
      true,
    );
    expect(results.some((r) => r.templateSlug === "info-donatii")).toBe(true);
  });

  it("should return location-specific templates for diaspora", () => {
    const templates = engine.getLocationSpecificTemplates("diaspora");

    expect(templates).toContain("info-diaspora-connect");
    expect(templates).toContain("info-misiune-termen-scurt-diaspora");
  });

  it("should return location-specific templates for Romania", () => {
    const templates = engine.getLocationSpecificTemplates("romania");

    expect(templates).toContain("info-cursuri-locale");
    expect(templates).toContain("info-evenimente-apme");
  });

  it("should handle empty answers gracefully", () => {
    const submission = createSubmission({});

    const results = engine.assignTemplates(submission);

    expect(results).toEqual([]);
  });

  it("should include reason for each assignment", () => {
    const submission = createSubmission({
      mission_interests: "volunteer",
    });

    const results = engine.assignTemplates(submission);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].reason).toBeTruthy();
    expect(typeof results[0].reason).toBe("string");
  });
});
