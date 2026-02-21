import { describe, it, expect } from "vitest";
import {
  verifyWebhookSignature,
  generateWebhookSignature,
} from "@/lib/webhook";

describe("Webhook Signature", () => {
  it("should verify a valid signature", () => {
    const secret = "test-secret";
    const payload = '{"test": "data"}';
    const signature = generateWebhookSignature(payload, secret);

    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
  });

  it("should reject an invalid signature", () => {
    const secret = "test-secret";
    const payload = '{"test": "data"}';
    const wrongSignature = "invalid-signature";

    expect(verifyWebhookSignature(payload, wrongSignature, secret)).toBe(false);
  });

  it("should reject signature with wrong secret", () => {
    const payload = '{"test": "data"}';
    const signature = generateWebhookSignature(payload, "correct-secret");

    expect(verifyWebhookSignature(payload, signature, "wrong-secret")).toBe(
      false,
    );
  });

  it("should handle empty payload", () => {
    const secret = "test-secret";
    const payload = "";
    const signature = generateWebhookSignature(payload, secret);

    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
  });
});
