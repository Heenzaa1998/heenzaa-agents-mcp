import { describe, expect, it } from "vitest";
import { createSubscriberSchema } from "@/features/subscribers/contracts";

describe("createSubscriberSchema", () => {
  it("normalizes valid input", () => {
    const parsed = createSubscriberSchema.parse({
      name: "  Jane Example  ",
      email: "  JANE@EXAMPLE.COM  ",
    });

    expect(parsed).toEqual({
      name: "Jane Example",
      email: "jane@example.com",
    });
  });

  it("rejects invalid data", () => {
    const result = createSubscriberSchema.safeParse({
      name: "A",
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
  });
});
