import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/webhooks/fillout/route";
import { prisma } from "@/lib/prisma";
import { ingestFilloutSubmission } from "@/lib/fillout-ingestion";
import { verifyWebhookSignature } from "@/lib/webhook";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    webhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/fillout-ingestion", () => ({
  ingestFilloutSubmission: vi.fn(),
}));

vi.mock("@/lib/webhook", () => ({
  verifyWebhookSignature: vi.fn(),
}));

const mockEnv = (secret: string | undefined) => {
  process.env.FILLOUT_WEBHOOK_SECRET = secret;
  process.env.FILLOUT_FORM_ID = "pqwmkBmnpbus";
  process.env.FILLOUT_FORM_NAME = "Implicare 2.0";
};

const ingestionResult = {
  submissionId: "sub-123",
  databaseId: "submission-1",
  created: true,
  answersStored: 2,
  assignments: {
    created: 2,
    skipped: 0,
    errors: [],
  },
};

describe("POST /api/webhooks/fillout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv("test-secret");
    vi.mocked(ingestFilloutSubmission).mockResolvedValue(ingestionResult);
  });

  function createMockRequest(
    body: object | string,
    headers: Record<string, string> = {},
  ) {
    return {
      text: () =>
        Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
      headers: {
        get: (name: string) => headers[name] || null,
      },
    } as unknown as import("next/server").NextRequest;
  }

  const validHeaders = {
    "x-webhook-signature": "valid-signature",
    "x-webhook-id": "event-123",
    "x-webhook-event": "record.created",
  };

  const validPayload = {
    type: "record.created",
    data: {
      records: [
        {
          data: {
            submissionId: "sub-123",
            submissionTime: "2024-01-01T00:00:00Z",
            questions: [
              {
                id: "q1",
                name: "Email",
                value: "test@example.com",
                type: "EmailInput",
              },
              {
                id: "q2",
                name: "Cum te numești?",
                value: "Test User",
                type: "TextInput",
              },
            ],
          },
        },
      ],
    },
  };

  it("should return 400 if missing required headers", async () => {
    const request = createMockRequest(validPayload, {});

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Missing required headers");
  });

  it("should return 500 if webhook secret not configured", async () => {
    delete process.env.FILLOUT_WEBHOOK_SECRET;

    const request = createMockRequest(validPayload, validHeaders);

    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Webhook secret not configured");
  });

  it("should return 401 if signature is invalid", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(false);
    const request = createMockRequest(validPayload, validHeaders);

    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Invalid signature");
  });

  it("should skip already processed events", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue({
      id: "existing",
    } as never);

    const request = createMockRequest(validPayload, validHeaders);

    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("already_processed");
    expect(ingestFilloutSubmission).not.toHaveBeenCalled();
  });

  it("should process new submission through the shared Fillout ingestion path", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.webhookEvent.create).mockResolvedValue({
      id: "event-123",
    } as never);
    vi.mocked(prisma.webhookEvent.update).mockResolvedValue({
      id: "event-123",
    } as never);

    const request = createMockRequest(validPayload, validHeaders);

    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("success");

    expect(ingestFilloutSubmission).toHaveBeenCalledWith(
      validPayload.data.records[0].data,
      {
        formId: "pqwmkBmnpbus",
        formName: "Implicare 2.0",
        queueSendJobs: true,
      },
    );
  });

  it("should mark webhook event failed when ingestion throws", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.webhookEvent.create).mockResolvedValue({
      id: "event-123",
    } as never);
    vi.mocked(ingestFilloutSubmission).mockRejectedValue(
      new Error("Database error"),
    );
    vi.mocked(prisma.webhookEvent.update).mockResolvedValue({
      id: "event-123",
    } as never);

    const request = createMockRequest(validPayload, validHeaders);

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(prisma.webhookEvent.update).toHaveBeenCalledWith({
      where: { eventId: "event-123" },
      data: expect.objectContaining({
        status: "failed",
        errorMessage: "Database error",
        processedAt: expect.any(Date),
      }),
    });
  });

  it("should handle JSON parse errors", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.webhookEvent.create).mockResolvedValue({
      id: "event-123",
    } as never);
    vi.mocked(prisma.webhookEvent.update).mockResolvedValue({
      id: "event-123",
    } as never);

    const request = createMockRequest("invalid json", validHeaders);

    const response = await POST(request);

    expect(response.status).toBe(500);
  });

  it("should ignore non-created events after recording the webhook event", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.webhookEvent.create).mockResolvedValue({
      id: "event-123",
    } as never);
    vi.mocked(prisma.webhookEvent.update).mockResolvedValue({
      id: "event-123",
    } as never);

    const request = createMockRequest(
      { ...validPayload, type: "record.updated" },
      validHeaders,
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(ingestFilloutSubmission).not.toHaveBeenCalled();
  });

  it("should process multiple records", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
    vi.mocked(prisma.webhookEvent.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.webhookEvent.create).mockResolvedValue({
      id: "event-123",
    } as never);
    vi.mocked(prisma.webhookEvent.update).mockResolvedValue({
      id: "event-123",
    } as never);

    const payload = {
      ...validPayload,
      data: {
        records: [
          validPayload.data.records[0],
          {
            data: {
              ...validPayload.data.records[0].data,
              submissionId: "sub-456",
            },
          },
        ],
      },
    };

    const request = createMockRequest(payload, validHeaders);

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(ingestFilloutSubmission).toHaveBeenCalledTimes(2);
  });
});
