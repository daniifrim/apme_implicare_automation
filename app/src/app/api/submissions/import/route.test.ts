import { describe, expect, it } from "vitest";

import { parseProcessingStatus } from "./route";

type RowInput = Parameters<typeof parseProcessingStatus>[0];

function createRow(overrides: Partial<RowInput> = {}): RowInput {
  return {
    "Submission ID": "sub-1",
    "Submission time": "5/28/2025 6:42:42",
    "Cum te numești?": "Test User",
    "Număr de telefon": "+40123456789",
    Email: "test@example.com",
    "Căți ani ai?": "30",
    "Unde locuiești?": "În România",
    "În ce oraș din România locuiești?": "Cluj-Napoca",
    "În ce oraș și țară locuiești?": "",
    "La ce biserică mergi?": "Test Church",
    ...overrides,
  };
}

describe("parseProcessingStatus", () => {
  it("returns processed status for PROCESSED values", () => {
    const result = parseProcessingStatus(
      createRow({ "Processing Status": "PROCESSED" }),
    );

    expect(result.status).toBe("processed");
    expect(result.processedAt).not.toBeNull();
  });

  it("returns pending status for empty status values", () => {
    const result = parseProcessingStatus(
      createRow({ "Processing Status": "" }),
    );

    expect(result.status).toBe("pending");
    expect(result.processedAt).toBeNull();
  });

  it("parses valid Processed At date when provided", () => {
    const result = parseProcessingStatus(
      createRow({
        "Processing Status": "PROCESSED",
        "Processed At": "2025-05-28T06:42:42.000Z",
      }),
    );

    expect(result.status).toBe("processed");
    expect(result.processedAt?.toISOString()).toBe("2025-05-28T06:42:42.000Z");
  });

  it("falls back to now when Processed At is invalid", () => {
    const before = Date.now();
    const result = parseProcessingStatus(
      createRow({
        "Processing Status": "PROCESSED",
        "Processed At": "invalid-date",
      }),
    );
    const after = Date.now();

    expect(result.status).toBe("processed");
    expect(result.processedAt).not.toBeNull();
    expect(result.processedAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.processedAt!.getTime()).toBeLessThanOrEqual(after);
  });
});
