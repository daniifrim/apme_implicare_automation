import { describe, expect, it } from "vitest";
import { normalizeSubmission } from "@/lib/normalize";
import type { FilloutSubmission } from "@/types/fillout";

describe("normalizeSubmission", () => {
  it("adds canonical assignment answers for direct Fillout API submissions", () => {
    const submission: FilloutSubmission = {
      submissionId: "sub-1",
      submissionTime: "2026-05-21T10:29:08.801Z",
      questions: [
        {
          id: "p9mK",
          name: "Email",
          type: "EmailInput",
          value: "person@example.com",
        },
        {
          id: "pZ9d",
          name: "Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?",
          type: "MultipleChoice",
          value: "Da, pe termen scurt (2-4 săptămâni)",
        },
        {
          id: "nDj3",
          name: "Ești interesat(ă) să participi la anumite cursuri de pregătire când vor fi disponibile în zona ta?",
          type: "MultipleChoice",
          value: "Cursul Kairos",
        },
        {
          id: "6S5P",
          name: "Dorești să ajuți financiar lucrările și misionarii APME?",
          type: "MultipleChoice",
          value: "Da",
        },
      ],
    };

    const normalized = normalizeSubmission(submission);

    expect(normalized.answers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          questionId: "mission_interests",
          rawValue: ["short_term"],
        }),
        expect.objectContaining({
          questionId: "course_interests",
          rawValue: ["kairos"],
        }),
        expect.objectContaining({
          questionId: "support_interests",
          rawValue: ["donate"],
        }),
      ]),
    );
  });
});
