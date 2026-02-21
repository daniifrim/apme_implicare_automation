// ABOUTME: Tests submissions list behavior including row-click modal details
// ABOUTME: Verifies modal rendering and content from submission detail fetch
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import SubmissionsPage from "./page";

const submissionsListResponse = {
  submissions: [
    {
      id: "sub-1",
      submissionId: "S-001",
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      locationType: "romania",
      city: "Constanta",
      country: "Romania",
      phone: "0712345678",
      status: "processed",
      submissionTime: "2026-02-10T12:00:00.000Z",
      assignments: [
        {
          id: "assign-1",
          template: { name: "Info Misiune pe termen scurt APME" },
          status: "sent",
        },
      ],
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    pages: 1,
  },
};

const submissionDetailResponse = {
  id: "sub-1",
  submissionId: "S-001",
  email: "ada@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  phone: "0712345678",
  locationType: "romania",
  city: "Constanta",
  country: "Romania",
  church: "Biserica APME",
  status: "processed",
  submissionTime: "2026-02-10T12:00:00.000Z",
  assignments: [
    {
      id: "assign-1",
      template: { name: "Info Misiune pe termen scurt APME" },
      status: "sent",
    },
  ],
  answers: [
    {
      id: "answer-1",
      value: "Mentoring and prayer",
      rawValue: "Mentoring and prayer",
      question: { id: "q1", name: "Why are you interested?" },
    },
    {
      id: "answer-2",
      value: null,
      rawValue: ["Option A", "Option B"],
      question: { id: "q2", name: "Preferred topics" },
    },
  ],
};

const createFetchResponse = (data: unknown) => ({
  ok: true,
  json: async () => data,
});

const createFetchError = () => ({
  ok: false,
  json: async () => ({ error: "Not found" }),
});

describe("SubmissionsPage", () => {
  beforeEach(() => {
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (url.startsWith("/api/submissions?")) {
        return Promise.resolve(
          createFetchResponse(submissionsListResponse),
        ) as Promise<Response>;
      }
      if (url === "/api/submissions/sub-1") {
        return Promise.resolve(
          createFetchResponse(submissionDetailResponse),
        ) as Promise<Response>;
      }
      return Promise.resolve(createFetchError()) as Promise<Response>;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens the detail modal when a row is clicked and shows raw answers", async () => {
    render(<SubmissionsPage />);

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();

    const row = screen.getByText("Ada Lovelace").closest("tr");
    if (!row) {
      throw new Error("Expected row for submission not found");
    }

    fireEvent.click(row);

    expect(await screen.findByText("Submission Details")).toBeInTheDocument();
    expect(await screen.findByText("Answers (2)")).toBeInTheDocument();
    expect(screen.getByText("Why are you interested?")).toBeInTheDocument();
    expect(screen.getByText("Mentoring and prayer")).toBeInTheDocument();
    expect(screen.getByText("Preferred topics")).toBeInTheDocument();
    expect(screen.getByText('["Option A","Option B"]')).toBeInTheDocument();
  });
});
