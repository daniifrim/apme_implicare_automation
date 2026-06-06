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

    expect(
      results.some(
        (r) => r.templateSlug === "info-rugaciune-pentru-grup-etnic",
      ),
    ).toBe(true);
  });

  it("should assign prayer for missionaries template", () => {
    const submission = createSubmission({
      prayer_method: "missionary",
    });

    const results = engine.assignTemplates(submission);

    expect(
      results.some(
        (r) => r.templateSlug === "info-rugaciune-pentru-misionari",
      ),
    ).toBe(true);
  });

  it("should assign short-term missions template", () => {
    const submission = createSubmission({
      mission_interests: ["short_term", "volunteer"],
    });

    const results = engine.assignTemplates(submission);

    expect(
      results.some((r) => r.templateSlug === "info-misiune-pe-termen-scurt-apme"),
    ).toBe(true);
  });

  it("should assign volunteer template", () => {
    const submission = createSubmission({
      mission_interests: "volunteer",
    });

    const results = engine.assignTemplates(submission);

    expect(results.some((r) => r.templateSlug === "info-voluntariat-apme")).toBe(
      true,
    );
  });

  it("should assign Kairos course template", () => {
    const submission = createSubmission({
      course_interests: ["kairos", "mobilizeaza"],
    });

    const results = engine.assignTemplates(submission);

    expect(results.some((r) => r.templateSlug === "info-despre-cursul-kairos")).toBe(
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
      results.some((r) => r.templateSlug === "info-misiune-pe-termen-scurt-apme"),
    ).toBe(true);
    expect(results.some((r) => r.templateSlug === "info-voluntariat-apme")).toBe(
      true,
    );
    expect(results.some((r) => r.templateSlug === "info-tabere-misiune-apme")).toBe(
      true,
    );
    expect(results.some((r) => r.templateSlug === "info-despre-cursul-kairos")).toBe(
      true,
    );
    expect(results.some((r) => r.templateSlug === "info-donatii-apme")).toBe(true);
  });

  it("should not assign templates from location alone", () => {
    expect(engine.getLocationSpecificTemplates("diaspora")).toEqual([]);
    expect(engine.getLocationSpecificTemplates("romania")).toEqual([]);
    expect(engine.getLocationSpecificTemplates(null)).toEqual([]);
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

  it("should not assign camp template when camp_info indicates past participant or not interested", () => {
    const notInterested = createSubmission({
      camp_info: "Nu sunt interesat/ă",
      mission_interests: "camps",
    });

    let results = engine.assignTemplates(notInterested);
    expect(
      results.some((r) => r.templateSlug === "info-tabere-misiune-apme"),
    ).toBe(false);

    const pastParticipant = createSubmission({
      camp_info: "Am participat, doresc să mai fiu informat și pe viitor",
      mission_interests: "camps",
    });

    results = engine.assignTemplates(pastParticipant);
    expect(
      results.some((r) => r.templateSlug === "info-tabere-misiune-apme"),
    ).toBe(false);
  });

  it("should not assign prayer missionary when prayer_adoption is NU", () => {
    const submission = createSubmission({
      prayer_adoption: "NU",
      prayer_method: "missionary",
    });

    const results = engine.assignTemplates(submission);

    expect(
      results.some(
        (r) => r.templateSlug === "info-rugaciune-pentru-misionari",
      ),
    ).toBe(false);
  });

  it("should not assign prayer ethnic when prayer_adoption is NU", () => {
    const submission = createSubmission({
      prayer_adoption: "NU",
      prayer_method: "I want to adopt an ethnic group for prayer",
    });

    const results = engine.assignTemplates(submission);

    expect(
      results.some(
        (r) => r.templateSlug === "info-rugaciune-pentru-grup-etnic",
      ),
    ).toBe(false);
  });
});
